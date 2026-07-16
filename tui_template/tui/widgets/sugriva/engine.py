from __future__ import annotations
import os
import math
import random
import threading
import time
import sqlite3
import json
import hashlib
import re
import base64
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from dataclasses import dataclass
from datetime import datetime, timedelta

RAILS: list[str] = ["UPI", "NEFT", "RTGS", "Visa", "Mastercard", "PayPal"]
DOMESTIC_NETS: list[str] = ["NPCI", "RBI-RTGS"]
CROSS_NETS: list[str] = ["VISA-NET", "MCTR-NET", "SWIFT-CROSS"]

RISK_CRITICAL: float = 0.75
RISK_ELEVATED: float = 0.50

AUDIT_LOG_PATH = "data/sugriva_audit.log"
DB_PATH = "data/sugriva_ledger.db"

SALT = b"sugriva_master_salt"
MASTER_HASH = hashlib.pbkdf2_hmac("sha256", b"adminpassword", SALT, 100000).hex()


@dataclass
class TxRecord:
    timestamp: str
    rail: str
    network: str
    amount: float
    risk: float
    escrow: str
    vpa: str
    ip: str
    velocity: int
    shap: dict[str, float]

    @property
    def risk_tier(self) -> str:
        if self.risk >= RISK_CRITICAL:
            return "CRITICAL"
        if self.risk >= RISK_ELEVATED:
            return "ELEVATED"
        return "PASS"


@dataclass
class CertInIncident:
    id: str
    vpa: str
    rail: str
    amount: float
    detection_time: datetime
    sla_deadline: datetime
    severity: str
    source: str
    status: str = "PENDING_REPORT"

    @property
    def time_remaining_str(self) -> str:
        delta = self.sla_deadline - datetime.now()
        if delta.total_seconds() <= 0:
            return "EXPIRED (SLA BREACH)"
        hours, remainder = divmod(int(delta.total_seconds()), 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{hours}h {minutes}m {seconds}s"


_lock: threading.Lock = threading.Lock()
_running: bool = False
_thread: threading.Thread | None = None
_active_rail_filter: str | None = None

# Security, Audit, and CERT-In data
_current_role: str = "ANALYST"
_threshold: float = 0.75
_audit_log: list[str] = []
_cert_in_incidents: list[CertInIncident] = []

# Rate Limiting: VPA -> list of timestamps
_rate_limits: dict[str, list[float]] = {}
_blocked_until: dict[str, float] = {}

# Dynamic Quarantine Registry (VPA -> quarantine expiry epoch)
_quarantined_until: dict[str, float] = {}

# Active Quantum-Defense state parameters
_qkd_coherence: float = 99.4
_trng_entropy: float = 100.0
_pqc_failures: int = 0

_last_audit_hash: str = "0" * 64


DB_ENC_KEY: bytes = hashlib.pbkdf2_hmac("sha256", b"adminpassword", SALT, 100000)

def encrypt_field(plaintext: str) -> str:
    try:
        cipher = AES.new(DB_ENC_KEY, AES.MODE_CBC)
        ct_bytes = cipher.encrypt(pad(plaintext.encode('utf-8'), AES.block_size))
        iv = base64.b64encode(cipher.iv).decode('utf-8')
        ct = base64.b64encode(ct_bytes).decode('utf-8')
        return f"{iv}:{ct}"
    except Exception:
        return plaintext

def decrypt_field(ciphertext: str) -> str:
    try:
        if not ciphertext or ":" not in ciphertext:
            return ciphertext
        iv_b64, ct_b64 = ciphertext.split(":", 1)
        iv = base64.b64decode(iv_b64)
        ct = base64.b64decode(ct_b64)
        cipher = AES.new(DB_ENC_KEY, AES.MODE_CBC, iv)
        pt_bytes = unpad(cipher.decrypt(ct), AES.block_size)
        return pt_bytes.decode('utf-8')
    except Exception:
        return ciphertext

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.create_function("decrypt", 1, decrypt_field)
    return conn


def _init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tx_ledger (
            timestamp TEXT,
            rail TEXT,
            network TEXT,
            amount TEXT,
            risk REAL,
            escrow TEXT,
            vpa TEXT,
            ip TEXT,
            velocity INTEGER,
            shap TEXT
        )
    """)
    conn.commit()
    conn.close()


def _init_audit_chain() -> None:
    global _last_audit_hash
    if os.path.exists(AUDIT_LOG_PATH):
        try:
            with open(AUDIT_LOG_PATH, "r") as f:
                lines = f.readlines()
                if lines:
                    last_line = lines[-1].strip()
                    match = re.search(r"curr_hash: ([a-f0-9]{64})", last_line)
                    if match:
                        _last_audit_hash = match.group(1)
        except Exception:
            pass


def verify_admin_password(password: str) -> bool:
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), SALT, 100000).hex()
    return h == MASTER_HASH


def write_audit(action: str, status: str = "SUCCESS") -> None:
    global _last_audit_hash
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    raw_payload = f"{ts} | ROLE:{_current_role} | ACTION: {action} | STATUS: {status} | prev_hash: {_last_audit_hash}"
    curr_hash = hashlib.sha256(raw_payload.encode()).hexdigest()
    entry = f"[{ts}] [ROLE:{_current_role}] ACTION: {action} | STATUS: {status} | prev_hash: {_last_audit_hash} | curr_hash: {curr_hash}"
    
    with _lock:
        _audit_log.append(entry)
        if len(_audit_log) > 500:
            _audit_log.pop(0)
        _last_audit_hash = curr_hash

    try:
        os.makedirs(os.path.dirname(AUDIT_LOG_PATH), exist_ok=True)
        with open(AUDIT_LOG_PATH, "a") as f:
            f.write(entry + "\n")
    except Exception:
        pass


def get_audit_logs() -> list[str]:
    with _lock:
        return list(_audit_log)


def get_role() -> str:
    global _current_role
    return _current_role


def set_role(role: str) -> None:
    global _current_role
    _current_role = role
    write_audit(f"Authentication role switched to {role}")


def get_threshold() -> float:
    global _threshold
    return _threshold


def set_threshold(val: float) -> None:
    global _threshold
    _threshold = val
    write_audit(f"Risk threshold changed to {val}")


def get_cert_incidents() -> list[CertInIncident]:
    with _lock:
        return list(_cert_in_incidents)


def create_cert_incident(vpa: str, rail: str, amount: float, severity: str, source: str) -> None:
    now = datetime.now()
    inc_id = f"CERT-2026-{random.randint(1000, 9999)}"
    inc = CertInIncident(
        id=inc_id,
        vpa=vpa,
        rail=rail,
        amount=amount,
        detection_time=now,
        sla_deadline=now + timedelta(hours=6),
        severity=severity,
        source=source,
    )
    with _lock:
        _cert_in_incidents.append(inc)
    write_audit(f"CERT-In incident logged: {inc_id} (VPA={vpa}, severity={severity})")


def check_rate_limit(vpa: str) -> bool:
    now = time.time()
    if vpa in _blocked_until:
        if now < _blocked_until[vpa]:
            return False
        else:
            del _blocked_until[vpa]

    if vpa not in _rate_limits:
        _rate_limits[vpa] = []
    _rate_limits[vpa] = [t for t in _rate_limits[vpa] if now - t < 5.0]

    if len(_rate_limits[vpa]) >= 3:
        _blocked_until[vpa] = now + 10.0
        write_audit(f"Rate limit exceeded for VPA: {vpa}. Blocking user for 10s.", status="BLOCKED")
        create_cert_incident(vpa, "DDoS/Flood", 0, "CRITICAL", "Rate Limiter Gate")
        return False

    _rate_limits[vpa].append(now)
    return True


def unfreeze_vpa(vpa: str) -> bool:
    unfrozen = False
    with _lock:
        if vpa in _quarantined_until:
            del _quarantined_until[vpa]
            unfrozen = True
        if vpa in _blocked_until:
            del _blocked_until[vpa]
            unfrozen = True
    if unfrozen:
        write_audit(f"VPA {vpa} manually unfrozen and security locks released")
    return unfrozen


def get_quantum_metrics() -> tuple[float, float, int]:
    global _qkd_coherence, _trng_entropy, _pqc_failures
    return _qkd_coherence, _trng_entropy, _pqc_failures


def set_quantum_anomalies(coherence: float, entropy: float, failures: int) -> None:
    global _qkd_coherence, _trng_entropy, _pqc_failures
    _qkd_coherence = coherence
    _trng_entropy = entropy
    _pqc_failures = failures


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _compute(
    amount: float, 
    velocity: int, 
    auth_failed: bool,
    qkd_coherence: float,
    trng_entropy: float,
    pqc_failures: int
) -> tuple[float, dict[str, float]]:
    ip_w = round(0.15 + random.uniform(-0.02, 0.04), 4)
    auth_w = round(0.5 + random.uniform(0, 0.1), 4) if auth_failed else round(0.05 + random.uniform(0, 0.03), 4)
    amt_w = round(min(0.3, amount / 500_000.0), 4)
    vel_w = round(min(0.4, velocity / 10.0), 4)
    
    qkd_w = round(max(0.0, (99.0 - qkd_coherence) * 0.1), 4)
    entropy_w = round(max(0.0, (100.0 - trng_entropy) * 0.005), 4)
    pqc_w = round(min(0.4, pqc_failures * 0.15), 4)
    
    raw = 0.1 + ip_w + auth_w + amt_w + vel_w + qkd_w + entropy_w + pqc_w
    score = round(_sigmoid(raw - 1.2), 6)
    
    return score, {
        "ip_anomaly": ip_w,
        "auth_discrepancy": auth_w,
        "velocity_impact": vel_w,
        "quantum_channel_instability": qkd_w,
        "entropy_drain": entropy_w,
        "pqc_decryption_anomalies": pqc_w,
    }


def _make_vpa() -> str:
    return f"user_{random.randint(1000, 9999)}@bank"


def _make_record(
    vpa: str | None = None,
    rail: str | None = None,
    amount: float | None = None,
    velocity: int | None = None,
    auth_failed: bool = False,
    ip: str | None = None,
) -> TxRecord:
    global _qkd_coherence, _trng_entropy, _pqc_failures
    vpa = vpa or _make_vpa()
    rail = rail or random.choice(RAILS)
    amount = amount if amount is not None else random.uniform(100.0, 150_000.0)
    velocity = velocity if velocity is not None else random.randint(1, 4)
    ip = ip or f"192.168.{random.randint(0, 3)}.{random.randint(1, 254)}"

    # Check active quarantine registry freeze
    now_time = time.time()
    if vpa in _quarantined_until:
        if now_time < _quarantined_until[vpa]:
            rec = TxRecord(
                timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3],
                rail=rail,
                network="BLOCKED",
                amount=amount,
                risk=1.0000,
                escrow="AUTO_FROZEN",
                vpa=vpa,
                ip=ip,
                velocity=velocity,
                shap={"ip_anomaly": 0.0, "auth_discrepancy": 0.0, "velocity_impact": 0.0, "quantum_channel_instability": 0.0, "entropy_drain": 0.0, "pqc_decryption_anomalies": 0.0},
            )
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO tx_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (rec.timestamp, rec.rail, rec.network, encrypt_field(str(rec.amount)), rec.risk, rec.escrow, encrypt_field(rec.vpa), encrypt_field(rec.ip), rec.velocity, json.dumps(rec.shap))
                )
                conn.commit()
                conn.close()
            except Exception:
                pass
            return rec
        else:
            del _quarantined_until[vpa]

    allowed = check_rate_limit(vpa)
    
    if not allowed:
        rec = TxRecord(
            timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3],
            rail=rail,
            network="BLOCKED",
            amount=amount,
            risk=0.9999,
            escrow="RATE_LIMITED",
            vpa=vpa,
            ip=ip,
            velocity=velocity,
            shap={"ip_anomaly": 0.3, "auth_discrepancy": 0.5, "velocity_impact": 0.4, "quantum_channel_instability": 0.2, "entropy_drain": 0.1, "pqc_decryption_anomalies": 0.2},
        )
    else:
        cross = rail in ("Visa", "Mastercard", "PayPal") and random.random() > 0.6
        network = random.choice(CROSS_NETS) if cross else random.choice(DOMESTIC_NETS)
        score, shap = _compute(amount, velocity, auth_failed, _qkd_coherence, _trng_entropy, _pqc_failures)
        
        if score >= RISK_CRITICAL:
            escrow = "ISOLATED"
            # Auto-freeze: Lock the VPA in quarantine for 300 seconds
            _quarantined_until[vpa] = now_time + 300.0
            write_audit(f"Critical Risk score ({score:.4f}) detected. VPA {vpa} automatically FROZEN and quarantined for 300s", status="AUTO_FREEZE")
        elif score >= RISK_ELEVATED:
            escrow = "PENDING"
        else:
            escrow = "CLEAR"
            
        rec = TxRecord(
            timestamp=datetime.now().strftime("%H:%M:%S.%f")[:-3],
            rail=rail,
            network=network,
            amount=amount,
            risk=score,
            escrow=escrow,
            vpa=vpa,
            ip=ip,
            velocity=velocity,
            shap=shap,
        )

    # Insert into persistent SQLite
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO tx_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rec.timestamp, rec.rail, rec.network, encrypt_field(str(rec.amount)), rec.risk, rec.escrow, encrypt_field(rec.vpa), encrypt_field(rec.ip), rec.velocity, json.dumps(rec.shap))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return rec


def _sim_loop() -> None:
    global _running, _qkd_coherence, _trng_entropy, _pqc_failures
    while _running:
        if random.random() > 0.8:
            _qkd_coherence = max(95.0, min(99.9, _qkd_coherence + random.uniform(-0.15, 0.15)))
            _trng_entropy = max(40.0, min(100.0, _trng_entropy + random.uniform(-2.0, 2.0)))
            if _pqc_failures > 0 and random.random() > 0.6:
                _pqc_failures -= 1
        _make_record()
        time.sleep(random.uniform(0.3, 0.7))


def start_simulator() -> None:
    global _running, _thread
    _init_db()
    _init_audit_chain()
    if _running:
        return
    _running = True
    _thread = threading.Thread(target=_sim_loop, daemon=True)
    _thread.start()


def stop_simulator() -> None:
    global _running
    _running = False


def set_rail_filter(rail: str | None) -> None:
    global _active_rail_filter
    _active_rail_filter = rail


def get_rail_filter() -> str | None:
    return _active_rail_filter


def get_records(rail_filter: str | None = None) -> list[TxRecord]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if rail_filter:
            cursor.execute("SELECT timestamp, rail, network, amount, risk, escrow, vpa, ip, velocity, shap FROM tx_ledger WHERE rail = ? ORDER BY rowid DESC LIMIT 500", (rail_filter,))
        else:
            cursor.execute("SELECT timestamp, rail, network, amount, risk, escrow, vpa, ip, velocity, shap FROM tx_ledger ORDER BY rowid DESC LIMIT 500")
        rows = cursor.fetchall()
        conn.close()
        
        records = []
        for r in reversed(rows):
            records.append(TxRecord(
                timestamp=r[0],
                rail=r[1],
                network=r[2],
                amount=float(decrypt_field(r[3])),
                risk=r[4],
                escrow=r[5],
                vpa=decrypt_field(r[6]),
                ip=decrypt_field(r[7]),
                velocity=r[8],
                shap=json.loads(r[9])
            ))
        return records
    except Exception:
        return []


def get_risk_counts() -> dict[str, int]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT risk FROM tx_ledger ORDER BY rowid DESC LIMIT 500")
        rows = cursor.fetchall()
        conn.close()
        
        counts = {"CRITICAL": 0, "ELEVATED": 0, "PASS": 0}
        for r in rows:
            risk = r[0]
            if risk >= RISK_CRITICAL:
                counts["CRITICAL"] += 1
            elif risk >= RISK_ELEVATED:
                counts["ELEVATED"] += 1
            else:
                counts["PASS"] += 1
        return counts
    except Exception:
        return {"CRITICAL": 0, "ELEVATED": 0, "PASS": 0}


def inject_credential_stuffing() -> None:
    target = _make_vpa()
    ip = "198.51.100.42"
    for i in range(5):
        _make_record(vpa=target, rail="UPI", amount=random.uniform(50, 200),
                     velocity=i + 1, auth_failed=True, ip=ip)
    _make_record(vpa=target, rail="Visa", amount=950_000.0, velocity=6,
                 auth_failed=False, ip=ip)
    create_cert_incident(target, "Visa", 950_000.0, "HIGH", "Credential Stuffing Pattern")


def inject_asset_liquidation() -> None:
    target = "gsec_vault@corp"
    _make_record(vpa=target, rail="RTGS", amount=5_000_000.0,
                 velocity=1, auth_failed=False, ip="203.0.113.88")
    create_cert_incident(target, "RTGS", 5_000_000.0, "CRITICAL", "Unauthorized Corporate Liquidation")


def inject_velocity_flood() -> None:
    target = _make_vpa()
    ip = "192.168.1.99"
    for i in range(12):
        _make_record(vpa=target, rail="UPI", amount=100.0,
                     velocity=i + 1, auth_failed=False, ip=ip)
        time.sleep(0.01)


def inject_quantum_exploit() -> None:
    # Simulates active quantum attack indicators: drop coherence, drain entropy, raise pqc errors
    global _qkd_coherence, _trng_entropy, _pqc_failures
    write_audit("Quantum attack vectors detected (photon coherence breach & entropy exhaustion)", status="CRITICAL")
    set_quantum_anomalies(91.2, 14.5, 4)
    target = "demat_vault@treasury"
    _make_record(vpa=target, rail="RTGS", amount=12_000_000.0, velocity=1, auth_failed=False, ip="198.51.100.99")
    create_cert_incident(target, "RTGS", 12_000_000.0, "CRITICAL", "Post-Quantum Signature Spoofing Attempt")


def get_telemetry_stats() -> dict[str, int]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT count(*) FROM tx_ledger WHERE escrow = 'CLEAR'")
        clear_cnt = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT count(*) FROM tx_ledger WHERE escrow = 'PENDING'")
        pending_cnt = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT count(*) FROM tx_ledger WHERE escrow = 'ISOLATED' OR escrow = 'RATE_LIMITED' OR escrow = 'AUTO_FROZEN'")
        threat_cnt = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT count(*) FROM tx_ledger WHERE risk >= 0.75 AND (network = 'BLOCKED' OR decrypt(vpa) LIKE '%vault%')")
        quantum_threats = cursor.fetchone()[0] or 0
        
        conn.close()
        return {
            "clear": clear_cnt,
            "pending": pending_cnt,
            "threats": threat_cnt,
            "quantum": quantum_threats
        }
    except Exception:
        return {"clear": 0, "pending": 0, "threats": 0, "quantum": 0}
