import datetime
from pydantic import BaseModel

class CyberTelemetry(BaseModel):
    source_ip: str
    auth_status: str
    device_fingerprint: str
    waf_alert_level: str

class FinancialLedger(BaseModel):
    payment_rail: str
    clearing_network: str
    transaction_type: str
    amount: float
    sender_vpa: str
    receiver_vpa: str
    velocity_score: float = 0.0

class CryptoRouting(BaseModel):
    kem_mode: str = "HYBRID_MLKEM_AES256"
    integrity_hmac: str

class AnalyticsMesh(BaseModel):
    risk_score: float = 0.0
    anomaly_isolated: bool = False
    xai_attributions: dict = {}

class SugrivaPayload(BaseModel):
    telemetry_id: str
    timestamp: datetime.datetime
    cyber_telemetry: CyberTelemetry
    financial_ledger: FinancialLedger
    crypto_routing: CryptoRouting
    analytics_mesh: AnalyticsMesh
