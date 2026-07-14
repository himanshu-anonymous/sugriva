import os
import time
import json
import hmac
import hashlib
import uuid
import httpx
from typing import Dict, Any, Optional
from datetime import datetime

class SugrivaAuthOrchestrator:
    def __init__(self, storage_mesh=None):
        self.storage_mesh = storage_mesh
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.digilocker_sandbox_url = os.getenv("DIGILOCKER_SANDBOX_URL", "https://sandbox.co.in/kyc/digilocker")
        self.api_setu_client_id = os.getenv("API_SETU_CLIENT_ID", "sugriva_client_id_2026")
        self.api_setu_secret = os.getenv("API_SETU_CLIENT_SECRET", "sugriva_secret_key_2026")
        self.otp_secret_seed = os.getenv("OTP_SECRET_SEED", "4f6174696c424f4d5365637265745175616e74756d53616665323032363d3d0a")

    def generate_transaction_totp(self, sender_token: str, amount: float, receiver_token: str, epoch_time: int) -> str:
        tx_context = f"{sender_token}:{amount:.2f}:{receiver_token}:{epoch_time}"
        secret_bytes = bytes.fromhex(self.otp_secret_seed)
        totp_hash = hmac.new(secret_bytes, tx_context.encode("utf-8"), hashlib.sha256).hexdigest()
        return str(int(totp_hash, 16) % 1000000).zfill(6)

    def verify_transaction_totp(self, token: str, sender_token: str, amount: float, receiver_token: str, epoch_time: int) -> bool:
        expected_token = self.generate_transaction_totp(sender_token, amount, receiver_token, epoch_time)
        return hmac.compare_digest(token, expected_token)

    async def evaluate_step_up_policy(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        risk_score = float(transaction.get("analytics_mesh", {}).get("risk_score", 0.0))
        amount = float(transaction.get("financial_ledger", {}).get("amount", 0.0))
        sender = transaction.get("financial_ledger", {}).get("sender_vpa", "")
        receiver = transaction.get("financial_ledger", {}).get("receiver_vpa", "")
        
        if risk_score >= 0.75 or amount >= 900000.0:
            session_id = str(uuid.uuid4())
            consent_url = f"{self.digilocker_sandbox_url}/authorize?client_id={self.api_setu_client_id}&state={session_id}&redirect_uri=https://localhost/api/v1/auth/callback"
            self.active_sessions[session_id] = {
                "transaction_id": transaction.get("telemetry_id"),
                "status": "PENDING_DIGILOCKER",
                "risk_score": risk_score,
                "amount": amount,
                "sender": sender,
                "receiver": receiver,
                "created_at": time.time()
            }
            return {
                "action": "STEP_UP_DIGILOCKER",
                "session_id": session_id,
                "consent_url": consent_url,
                "requires_mfa": True
            }
        elif risk_score >= 0.50:
            session_id = str(uuid.uuid4())
            expected_otp = self.generate_transaction_totp(sender, amount, receiver, int(time.time()))
            self.active_sessions[session_id] = {
                "transaction_id": transaction.get("telemetry_id"),
                "status": "PENDING_SMS_OTP",
                "expected_otp": expected_otp,
                "risk_score": risk_score,
                "amount": amount,
                "sender": sender,
                "receiver": receiver,
                "created_at": time.time()
            }
            return {
                "action": "STEP_UP_SMS_OTP",
                "session_id": session_id,
                "requires_mfa": True
            }
        else:
            return {
                "action": "APPROVE_INLINE",
                "requires_mfa": False
            }

    async def generate_consent_session(self, transaction_id: str) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        consent_url = f"{self.digilocker_sandbox_url}/authorize?client_id={self.api_setu_client_id}&state={session_id}"
        self.active_sessions[session_id] = {
            "transaction_id": transaction_id,
            "status": "PENDING_DIGILOCKER",
            "created_at": time.time()
        }
        return {
            "session_id": session_id,
            "consent_url": consent_url
        }

    async def fetch_verified_identity(self, session_id: str, auth_code: str) -> Dict[str, Any]:
        if session_id not in self.active_sessions:
            return {"status": "FAILED", "error": "Invalid auth session ID."}
            
        session_info = self.active_sessions[session_id]
        
        async with httpx.AsyncClient() as client:
            token_payload = {
                "grant_type": "authorization_code",
                "code": auth_code,
                "client_id": self.api_setu_client_id,
                "client_secret": self.api_setu_secret
            }
            try:
                token_res = await client.post(f"{self.digilocker_sandbox_url}/token", json=token_payload)
                if token_res.status_code != 200:
                    return {"status": "FAILED", "error": "Identity authentication failed (token access error)."}
                access_token = token_res.json().get("access_token")
                
                headers = {"Authorization": f"Bearer {access_token}"}
                identity_res = await client.get(f"{self.digilocker_sandbox_url}/user/identity", headers=headers)
                if identity_res.status_code != 200:
                    return {"status": "FAILED", "error": "Failed to pull identity details."}
                
                raw_identity = identity_res.json()
                aadhaar_hash = hashlib.sha256(raw_identity.get("aadhaar_number", "").encode("utf-8")).hexdigest()
                pan_hash = hashlib.sha256(raw_identity.get("pan_number", "").encode("utf-8")).hexdigest()
                
                validation_token = self.generate_validation_signature(
                    session_info["transaction_id"],
                    session_info["sender"],
                    aadhaar_hash
                )
                
                session_info["status"] = "VERIFIED"
                session_info["validation_token"] = validation_token
                
                if self.storage_mesh:
                    await self.commit_verified_transaction(session_info["transaction_id"], validation_token)
                
                return {
                    "status": "SUCCESS",
                    "validation_token": validation_token,
                    "identity_reference": {
                        "aadhaar_sha256": aadhaar_hash,
                        "pan_sha256": pan_hash,
                        "consent_verified": True
                    }
                }
            except Exception as e:
                return {"status": "FAILED", "error": str(e)}

    def generate_validation_signature(self, transaction_id: str, sender: str, verification_hash: str) -> str:
        secret_bytes = bytes.fromhex(self.otp_secret_seed)
        data = f"{transaction_id}:{sender}:{verification_hash}"
        return hmac.new(secret_bytes, data.encode("utf-8"), hashlib.sha256).hexdigest()

    async def commit_verified_transaction(self, transaction_id: str, validation_token: str):
        if not self.storage_mesh:
            return
        try:
            db_path = self.storage_mesh.db_path
            import sqlite3
            with sqlite3.connect(db_path) as conn:
                conn.execute("""
                    UPDATE ledger 
                    SET anomaly_isolated = 0, risk_score = 0.1 
                    WHERE telemetry_id = ?
                """, (transaction_id,))
                
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS security_validation_logs (
                        telemetry_id TEXT PRIMARY KEY,
                        validation_token TEXT,
                        timestamp TEXT
                    );
                """)
                conn.execute("""
                    INSERT OR REPLACE INTO security_validation_logs VALUES (?, ?, ?)
                """, (transaction_id, validation_token, datetime.now().isoformat() + "Z"))
        except Exception:
            pass

    async def verify_sms_otp(self, session_id: str, user_otp: str) -> bool:
        if session_id not in self.active_sessions:
            return False
        session_info = self.active_sessions[session_id]
        if session_info["status"] != "PENDING_SMS_OTP":
            return False
            
        if hmac.compare_digest(user_otp, session_info["expected_otp"]):
            session_info["status"] = "VERIFIED"
            return True
        return False
