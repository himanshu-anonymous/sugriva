from __future__ import annotations
import math
import random
import threading
import time
from dataclasses import dataclass
from datetime import datetime

RAILS: list[str] = ["UPI", "NEFT", "RTGS", "Visa", "Mastercard", "PayPal"]
DOMESTIC_NETS: list[str] = ["NPCI", "RBI-RTGS"]
CROSS_NETS: list[str] = ["VISA-NET", "MCTR-NET", "SWIFT-CROSS"]

RISK_CRITICAL: float = 0.75
RISK_ELEVATED: float = 0.50


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


_store: list[TxRecord] = []
_lock: threading.Lock = threading.Lock()
_running: bool = False
_thread: threading.Thread | None = None
_active_rail_filter: str | None = None


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
    cross = rail in ("Visa", "Mastercard", "PayPal") and random.random() > 0.6
    network = random.choice(CROSS_NETS) if cross else random.choice(DOMESTIC_NETS)
    score, shap = _compute(amount, velocity, auth_failed)
    if score >= RISK_CRITICAL:
        escrow = "ISOLATED"
    elif score >= RISK_ELEVATED:
        escrow = "PENDING"
    else:
        escrow = "CLEAR"
    return TxRecord(
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


def _sim_loop() -> None:
    global _running
    while _running:
        rec = _make_record()
        with _lock:
            _store.append(rec)
            if len(_store) > 500:
                _store.pop(0)
        time.sleep(random.uniform(0.2, 0.6))


def start_simulator() -> None:
    global _running, _thread
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
    with _lock:
        records = list(_store)
    if rail_filter:
        records = [r for r in records if r.rail == rail_filter]
    return records


def get_risk_counts() -> dict[str, int]:
    with _lock:
        records = list(_store)
    counts: dict[str, int] = {"CRITICAL": 0, "ELEVATED": 0, "PASS": 0}
    for r in records:
        counts[r.risk_tier] += 1
    return counts


def inject_credential_stuffing() -> None:
    target = _make_vpa()
    ip = "198.51.100.42"
    for i in range(5):
        rec = _make_record(vpa=target, rail="UPI", amount=random.uniform(50, 200),
                           velocity=i + 1, auth_failed=True, ip=ip)
        with _lock:
            _store.append(rec)
    final = _make_record(vpa=target, rail="Visa", amount=950_000.0, velocity=6,
                         auth_failed=False, ip=ip)
    with _lock:
        _store.append(final)


def inject_asset_liquidation() -> None:
    rec = _make_record(vpa="gsec_vault@corp", rail="RTGS", amount=5_000_000.0,
                       velocity=1, auth_failed=False, ip="203.0.113.88")
    with _lock:
        _store.append(rec)


def inject_velocity_flood() -> None:
    target = _make_vpa()
    ip = "192.168.1.99"
    for i in range(12):
        rec = _make_record(vpa=target, rail="UPI", amount=100.0,
                           velocity=i + 1, auth_failed=False, ip=ip)
        with _lock:
            _store.append(rec)
        time.sleep(0.016)
