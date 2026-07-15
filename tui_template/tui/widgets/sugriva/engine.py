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

_last_audit_hash: str = "0" * 64


def _init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tx_ledger (
            timestamp TEXT,
            rail TEXT,
            network TEXT,
            amount REAL,
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


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _compute(amount: float, velocity: int, auth_failed: bool) -> tuple[float, dict[str, float]]:
    ip_w = round(0.15 + random.uniform(-0.02, 0.04), 4)
    auth_w = round(0.5 + random.uniform(0, 0.1), 4) if auth_failed else round(0.05 + random.uniform(0, 0.03), 4)
    amt_w = round(min(0.3, amount / 500_000.0), 4)
    vel_w = round(min(0.4, velocity / 10.0), 4)
    raw = 0.1 + ip_w + auth_w + amt_w + vel_w
    score = round(_sigmoid(raw), 6)
    return score, {
        "ip_anomaly": ip_w,
        "auth_discrepancy": auth_w,
        "velocity_impact": vel_w,
        "pq_agility": round(min(0.3, score * 0.35), 4),
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
    vpa = vpa or _make_vpa()
    rail = rail or random.choice(RAILS)
    amount = amount if amount is not None else random.uniform(100.0, 150_000.0)
    velocity = velocity if velocity is not None else random.randint(1, 4)
    ip = ip or f"192.168.{random.randint(0, 3)}.{random.randint(1, 254)}"

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
            shap={"ip_anomaly": 0.3, "auth_discrepancy": 0.5, "velocity_impact": 0.4, "pq_agility": 0.35},
        )
    else:
        cross = rail in ("Visa", "Mastercard", "PayPal") and random.random() > 0.6
        network = random.choice(CROSS_NETS) if cross else random.choice(DOMESTIC_NETS)
        score, shap = _compute(amount, velocity, auth_failed)
        
        if score >= RISK_CRITICAL:
            escrow = "ISOLATED"
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
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO tx_ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (rec.timestamp, rec.rail, rec.network, rec.amount, rec.risk, rec.escrow, rec.vpa, rec.ip, rec.velocity, json.dumps(rec.shap))
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return rec


def _sim_loop() -> None:
    global _running
    while _running:
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
        conn = sqlite3.connect(DB_PATH)
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
                amount=r[3],
                risk=r[4],
                escrow=r[5],
                vpa=r[6],
                ip=r[7],
                velocity=r[8],
                shap=json.loads(r[9])
            ))
        return records
    except Exception:
        return []


def get_risk_counts() -> dict[str, int]:
    try:
        conn = sqlite3.connect(DB_PATH)
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
