import curses
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import time
import json
import random
import uuid
import math
import threading
from datetime import datetime

import sqlite3
import redis
from elasticsearch import Elasticsearch
import urllib.request
import socket
import asyncio

from app.enterprise_rearchitecture import (
    InferenceWorkerPool,
    Neo4jGraphConnector,
    CircuitBreaker,
    CircuitBreakerOpenException,
    DynamicVaultTokenization,
    HAS_NEO4J,
    HAS_REDIS
)

telemetry_logs = []
anomaly_logs = []
velocity_cache = {}
inspected_account = None
inspected_data = None
cmd_buffer = ""
threshold = 0.75
diagnostics_results = None
vault_tok = DynamicVaultTokenization()
cb = CircuitBreaker("DigiLockerSandbox", failure_threshold=3, recovery_timeout=10.0)
worker_pool = InferenceWorkerPool(num_workers=4)
neo4j_connector = Neo4jGraphConnector()
worker_loop_ref = None
inspected_token_info = None
lock = threading.Lock()

def get_simulated_risk_and_shap(ip, auth_status, amount, velocity, waf_level, payment_rail):
    is_failed = 1.0 if auth_status == "FAILED" else 0.0
    is_waf_high = 1.0 if waf_level in ["MEDIUM", "HIGH"] else 0.0
    is_paypal_rtgs = 1.0 if payment_rail in ["PAYPAL", "RTGS"] else 0.0
    
    score_raw = -2.0 + (is_failed * 2.5) + (is_waf_high * 1.5) + (is_paypal_rtgs * 1.0) + ((amount / 100000) * 0.5) + (velocity * 0.3)
    risk_score = 1.0 / (1.0 + math.exp(-score_raw))
    
    ip_contrib = 0.1 if is_failed > 0 else 0.01
    auth_contrib = 0.45 * is_failed
    amt_contrib = 0.25 * (amount / 1000000)
    vel_contrib = 0.2 * (velocity / 10)
    
    total = ip_contrib + auth_contrib + amt_contrib + vel_contrib
    if total > 0:
        shap = {
            "source_ip_attribution": (ip_contrib / total) * risk_score,
            "auth_status_attribution": (auth_contrib / total) * risk_score,
            "amount_attribution": (amt_contrib / total) * risk_score,
            "velocity_attribution": (vel_contrib / total) * risk_score
        }
    else:
        shap = {
            "source_ip_attribution": 0.0,
            "auth_status_attribution": 0.0,
            "amount_attribution": 0.0,
            "velocity_attribution": 0.0
        }
    return round(risk_score, 4), shap

def update_velocity(vpa, ts):
    if vpa not in velocity_cache:
        velocity_cache[vpa] = []
    velocity_cache[vpa].append(ts)
    velocity_cache[vpa] = [t for t in velocity_cache[vpa] if ts - t <= 3.0]
    return len(velocity_cache[vpa])

def on_inference_complete(task):
    global threshold, worker_loop_ref, neo4j_connector
    with lock:
        telemetry_logs.append(task)
        if len(telemetry_logs) > 200:
            telemetry_logs.pop(0)
        if task["analytics_mesh"]["risk_score"] >= threshold:
            task["analytics_mesh"]["anomaly_isolated"] = True
            anomaly_logs.append(task)
            if len(anomaly_logs) > 100:
                anomaly_logs.pop(0)
                
    if HAS_NEO4J and worker_loop_ref:
        asyncio.run_coroutine_threadsafe(
            neo4j_connector.create_parent_bridge_node(
                task["telemetry_id"],
                task["cyber_telemetry"]["source_ip"],
                task["financial_ledger"]["sender_vpa"],
                task["financial_ledger"]["receiver_vpa"]
            ),
            worker_loop_ref
        )

def worker_pool_thread_func():
    global worker_loop_ref, worker_pool
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        worker_loop_ref = loop
        
        async def run_pool():
            await worker_pool.start(on_inference_complete)
            while True:
                await asyncio.sleep(1)
                
        loop.run_until_complete(run_pool())
    except Exception:
        pass

def generate_transaction(vpa=None, payment_rail=None, amount=None, ip=None, auth_status="SUCCESS", waf_level="NONE"):
    rails = ["NEFT", "RTGS", "UPI", "VISA", "MASTERCARD", "PAYPAL"]
    clearing = ["RBI", "NPCI", "VISA-NET", "MC-NET", "PAYPAL-NET"]
    agents = ["mac-safari", "win-chrome", "android-app", "ios-app"]
    
    t_id = f"SUGRIVA-{uuid.uuid4().hex[:12].upper()}"
    ts = time.time()
    
    if not vpa:
        vpa = f"user_{random.randint(1000, 9999)}@bank"
    if not payment_rail:
        payment_rail = random.choice(rails)
    if not amount:
        amount = round(random.uniform(10.0, 50000.0), 2)
    if not ip:
        ip = f"192.168.{random.randint(0,255)}.{random.randint(0,255)}"
        
    net = "INTERNATIONAL" if payment_rail in ["VISA", "PAYPAL"] else "DOMESTIC"
    fp = random.choice(agents)
    clearing_net = random.choice(clearing) if net == "DOMESTIC" else "CROSSBORDER"
    receiver_vpa = f"recipient_{random.randint(1000, 9999)}@bank"
    
    global threshold, worker_loop_ref, worker_pool, cb, vault_tok
    
    velocity = update_velocity(vpa, ts)
    
    # 1. Simulate Outbound KYC Protected by Circuit Breaker
    try:
        async def mock_kyc_lookup():
            if auth_status == "FAILED" and random.random() < 0.35:
                raise ConnectionError("DigiLocker Sandbox Timeout")
            return "KYC_OK"
        if worker_loop_ref and worker_loop_ref.is_running():
            asyncio.run_coroutine_threadsafe(cb.call(mock_kyc_lookup), worker_loop_ref)
    except Exception:
        pass

    # 2. Derive Vault-Based token for PII
    tokenized_sender = vault_tok.tokenize_vpa(vpa, clearing_net)

    # 3. If worker pool is running, dispatch tasks asynchronously
    if worker_loop_ref and worker_loop_ref.is_running():
        ip_val = sum(int(x) for x in ip.split('.') if x.isdigit()) % 255
        auth_val = 1.0 if auth_status == "SUCCESS" else 0.0
        amt_val = float(amount)
        features = [float(ip_val), auth_val, amt_val, float(velocity)]
        
        task_payload = {
            "telemetry_id": t_id,
            "timestamp": datetime.fromtimestamp(ts).isoformat() + "Z",
            "features": features,
            "cyber_telemetry": {
                "source_ip": ip,
                "auth_status": auth_status,
                "device_fingerprint": fp,
                "waf_alert_level": waf_level
            },
            "financial_ledger": {
                "payment_rail": payment_rail,
                "clearing_network": clearing_net,
                "transaction_type": "TRANSFER",
                "amount": amount,
                "sender_vpa": tokenized_sender,
                "receiver_vpa": receiver_vpa,
                "velocity_score": float(velocity)
            }
        }
        asyncio.run_coroutine_threadsafe(worker_pool.submit_task(task_payload), worker_loop_ref)
        return None

    # Fallback to inline processing
    risk, shap = get_simulated_risk_and_shap(ip, auth_status, amount, velocity, waf_level, payment_rail)
    
    payload = {
        "telemetry_id": t_id,
        "timestamp": datetime.fromtimestamp(ts).isoformat() + "Z",
        "cyber_telemetry": {
            "source_ip": ip,
            "auth_status": auth_status,
            "device_fingerprint": fp,
            "waf_alert_level": waf_level
        },
        "financial_ledger": {
            "payment_rail": payment_rail,
            "clearing_network": clearing_net,
            "transaction_type": "TRANSFER",
            "amount": amount,
            "sender_vpa": tokenized_sender,
            "receiver_vpa": receiver_vpa,
            "velocity_score": float(velocity)
        },
        "crypto_routing": {
            "kem_mode": "HYBRID_MLKEM_AES256",
            "integrity_hmac": uuid.uuid4().hex
        },
        "analytics_mesh": {
            "risk_score": risk,
            "anomaly_isolated": risk >= threshold,
            "xai_attributions": shap
        }
    }
    
    with lock:
        telemetry_logs.append(payload)
        if len(telemetry_logs) > 200:
            telemetry_logs.pop(0)
        if risk >= threshold:
            anomaly_logs.append(payload)
            if len(anomaly_logs) > 100:
                anomaly_logs.pop(0)
                
    return payload

def simulator_loop():
    while True:
        generate_transaction()
        time.sleep(random.uniform(0.1, 0.4))

def sse_listener_loop():
    import httpx
    while True:
        try:
            port = os.getenv("SYSTEM_PORT", "8000")
            url = f"http://localhost:{port}/api/v1/analytics/alerts"
            with httpx.stream("GET", url, timeout=None) as r:
                for line in r.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[len("data: "):]
                        alert = json.loads(data_str)
                        payload = alert.get("payload")
                        if payload:
                            with lock:
                                if not any(x["telemetry_id"] == payload["telemetry_id"] for x in anomaly_logs):
                                    anomaly_logs.append(payload)
                                    if len(anomaly_logs) > 100:
                                        anomaly_logs.pop(0)
                                if not any(x["telemetry_id"] == payload["telemetry_id"] for x in telemetry_logs):
                                    telemetry_logs.append(payload)
                                    if len(telemetry_logs) > 200:
                                        telemetry_logs.pop(0)
        except Exception:
            time.sleep(2.0)

def db_poller_loop():
    import httpx
    while True:
        try:
            port = os.getenv("SYSTEM_PORT", "8000")
            url = f"http://localhost:{port}/api/v1/analytics/dashboard"
            r = httpx.get(url, timeout=2.0)
            if r.status_code == 200:
                res_data = r.json()
                if res_data.get("status") == "SUCCESS":
                    txs = res_data.get("data", {}).get("transactions", [])
                    with lock:
                        for tx in reversed(txs):
                            t_id = tx["telemetry_id"]
                            if any(x["telemetry_id"] == t_id for x in telemetry_logs):
                                continue
                            
                            payload = {
                                "telemetry_id": t_id,
                                "timestamp": tx["timestamp"],
                                "cyber_telemetry": {
                                    "source_ip": tx["source_ip"],
                                    "auth_status": tx["auth_status"],
                                    "device_fingerprint": tx["device_fingerprint"],
                                    "waf_alert_level": tx["waf_alert_level"]
                                },
                                "financial_ledger": {
                                    "payment_rail": tx.get("payment_rail", "NEFT"),
                                    "clearing_network": tx.get("clearing_network", "RBI"),
                                    "transaction_type": tx["transaction_type"],
                                    "amount": tx["amount"],
                                    "sender_vpa": tx["sender_token"],
                                    "receiver_vpa": tx["receiver_token"],
                                    "velocity_score": float(tx.get("velocity_score", 1.0))
                                },
                                "analytics_mesh": {
                                    "risk_score": tx["risk_score"],
                                    "anomaly_isolated": bool(tx["anomaly_isolated"]),
                                    "xai_attributions": tx.get("xai_attributions", {})
                                }
                            }
                            
                            telemetry_logs.append(payload)
                            if len(telemetry_logs) > 200:
                                telemetry_logs.pop(0)
                                
                            if payload["analytics_mesh"]["anomaly_isolated"]:
                                if not any(x["telemetry_id"] == t_id for x in anomaly_logs):
                                    anomaly_logs.append(payload)
                                    if len(anomaly_logs) > 100:
                                        anomaly_logs.pop(0)
        except Exception:
            pass
        time.sleep(2.0)

def trigger_credential_stuffing():
    attacker_ip = f"{random.randint(20,200)}.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,254)}"
    target_vpa = f"target_{random.randint(100, 999)}@bank"
    for _ in range(5):
        generate_transaction(vpa=target_vpa, ip=attacker_ip, auth_status="FAILED", waf_level="NONE", amount=5.0)
        time.sleep(0.05)
    generate_transaction(vpa=target_vpa, ip=attacker_ip, auth_status="SUCCESS", waf_level="HIGH", amount=450000.0, payment_rail="VISA")

def trigger_asset_liquidation():
    admin_ip = "192.168.1.100"
    generate_transaction(vpa="treasury_pool@bank", payment_rail="RTGS", amount=999000.0, ip=admin_ip, auth_status="SUCCESS", waf_level="HIGH")

def trigger_velocity_flood():
    target_vpa = f"flood_user_{random.randint(100, 999)}@bank"
    for _ in range(15):
        generate_transaction(vpa=target_vpa, amount=100.0)
        time.sleep(0.02)

def fetch_account_profile(vpa):
    global inspected_account, inspected_data
    with lock:
        matches = [tx for tx in telemetry_logs if tx["financial_ledger"]["sender_vpa"] == vpa]
        if not matches:
            matches = [tx for tx in anomaly_logs if tx["financial_ledger"]["sender_vpa"] == vpa]
            
        if matches:
            latest = matches[-1]
            inspected_account = vpa
            inspected_data = {
                "vpa": vpa,
                "risk_score": latest["analytics_mesh"]["risk_score"],
                "isolated": latest["analytics_mesh"]["anomaly_isolated"],
                "velocity": latest["financial_ledger"]["velocity_score"],
                "ip": latest["cyber_telemetry"]["source_ip"],
                "shap": latest["analytics_mesh"]["xai_attributions"],
                "rail": latest["financial_ledger"]["payment_rail"]
            }
        else:
            inspected_account = vpa
            inspected_data = None

def run_diagnostics():
    global diagnostics_results
    status = {}
    
    # SQLite
    db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
    try:
        if os.path.exists(db_path):
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM ledger")
                count = cursor.fetchone()[0]
                status["sqlite"] = f"ONLINE ({count} records)"
        else:
            status["sqlite"] = "OFFLINE (DB file missing)"
    except Exception as e:
        status["sqlite"] = f"ERROR ({str(e)[:20]})"
        
    # Redis
    try:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        r = redis.Redis.from_url(redis_url, socket_timeout=1)
        r.ping()
        status["redis"] = "ONLINE"
    except Exception as e:
        status["redis"] = "OFFLINE"
        
    # Elasticsearch
    try:
        es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        es = Elasticsearch(es_url, request_timeout=1)
        if es.ping():
            status["elasticsearch"] = "ONLINE"
        else:
            status["elasticsearch"] = "OFFLINE"
    except Exception as e:
        status["elasticsearch"] = "OFFLINE"
        
    # FastAPI Server
    try:
        port = os.getenv("SYSTEM_PORT", "8000")
        req = urllib.request.Request(f"http://localhost:{port}/", method="GET")
        with urllib.request.urlopen(req, timeout=1) as response:
            status["api_server"] = f"ONLINE (HTTP {response.status})"
    except Exception as e:
        try:
            s = socket.create_connection(("localhost", int(os.getenv("SYSTEM_PORT", 8000))), timeout=1)
            s.close()
            status["api_server"] = "ONLINE (TCP)"
        except Exception:
            status["api_server"] = "OFFLINE"
            
    diagnostics_results = status

def draw_dashboard(stdscr):
    global cmd_buffer, inspected_account, inspected_data, threshold, diagnostics_results, inspected_token_info
    curses.curs_set(0)
    stdscr.nodelay(True)
    
    curses.start_color()
    curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_CYAN, curses.COLOR_BLACK)
    curses.init_pair(4, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    
    threading.Thread(target=simulator_loop, daemon=True).start()
    threading.Thread(target=sse_listener_loop, daemon=True).start()
    threading.Thread(target=db_poller_loop, daemon=True).start()
    threading.Thread(target=worker_pool_thread_func, daemon=True).start()
    
    win_header = None
    win_telemetry = None
    win_ledger = None
    win_sandbox = None
    win_diagnostic = None
    win_cmd = None
    
    telemetry_h = ledger_h = sandbox_h = diagnostic_h = left_w = right_w = 0
    last_h, last_w = -1, -1
    
    while True:
        height, width = stdscr.getmaxyx()
        
        if height < 20 or width < 90:
            if (height, width) != (last_h, last_w):
                last_h, last_w = height, width
                stdscr.clear()
                try:
                    stdscr.addstr(0, 0, "Terminal window too small.", curses.color_pair(2) | curses.A_BOLD)
                    stdscr.addstr(1, 0, f"Current: {width}x{height}. Required: >= 90x20.")
                    stdscr.addstr(3, 0, "Please maximize or expand your terminal window.")
                except curses.error:
                    pass
                stdscr.refresh()
            time.sleep(0.2)
            continue
            
        if (height, width) != (last_h, last_w) or win_header is None:
            last_h, last_w = height, width
            stdscr.clear()
            stdscr.refresh()
            
            header_h = 3
            cmd_h = 3
            middle_h = height - header_h - cmd_h
            left_w = width // 2
            right_w = width - left_w
            
            telemetry_h = max(2, (middle_h * 2) // 3)
            ledger_h = max(2, middle_h - telemetry_h)
            
            sandbox_h = max(2, middle_h // 3)
            diagnostic_h = max(2, middle_h - sandbox_h)
            
            try:
                win_header = curses.newwin(header_h, width, 0, 0)
                win_telemetry = curses.newwin(telemetry_h, left_w, header_h, 0)
                win_ledger = curses.newwin(ledger_h, left_w, header_h + telemetry_h, 0)
                win_sandbox = curses.newwin(sandbox_h, right_w, header_h, left_w)
                win_diagnostic = curses.newwin(diagnostic_h, right_w, header_h + sandbox_h, left_w)
                win_cmd = curses.newwin(cmd_h, width, height - cmd_h, 0)
            except curses.error:
                pass
        
        try:
            if win_header: win_header.erase()
            if win_telemetry: win_telemetry.erase()
            if win_ledger: win_ledger.erase()
            if win_sandbox: win_sandbox.erase()
            if win_diagnostic: win_diagnostic.erase()
            if win_cmd: win_cmd.erase()
            
            # 1. Header Banner
            if win_header:
                win_header.box()
                win_header.addstr(1, 2, "SUGRIVA // REAL-TIME CYBER-FINANCIAL CORRELATION MESH", curses.color_pair(3) | curses.A_BOLD)
                env_str = "DEPLOYMENT: SIMULATION_PROD"
                time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                start_x = width - len(env_str) - len(time_str) - 6
                if start_x > 60:
                    win_header.addstr(1, start_x, f"{env_str} | {time_str}")
                win_header.noutrefresh()
            
            # 2. Telemetry Pane (Top-Left)
            if win_telemetry:
                win_telemetry.box()
                win_telemetry.addstr(0, 2, " LIVE MULTI-RAIL TELEMETRY STREAM ", curses.color_pair(3))
                with lock:
                    visible_txs = telemetry_logs[-(telemetry_h - 2):]
                    for idx, tx in enumerate(visible_txs):
                        info = f"{tx['timestamp'][11:19]} | {tx['financial_ledger']['payment_rail']} | {tx['financial_ledger']['sender_vpa']} -> {tx['financial_ledger']['receiver_vpa']} | {tx['financial_ledger']['amount']:.2f} INR"
                        color = curses.color_pair(2) if tx["analytics_mesh"]["risk_score"] >= threshold else curses.color_pair(1)
                        if left_w > 4:
                            win_telemetry.addstr(idx + 1, 2, info[:left_w - 4], color)
                win_telemetry.noutrefresh()
            
            # 3. Account Ledger Surface (Bottom-Left)
            if win_ledger:
                win_ledger.box()
                win_ledger.addstr(0, 2, " ANALYST LEDGER DETAILS ", curses.color_pair(3))
                if inspected_account:
                    if inspected_data:
                        win_ledger.addstr(1, 2, f"Account VPA: {inspected_data['vpa']}", curses.color_pair(4))
                        win_ledger.addstr(2, 2, f"Active 3s Velocity: {inspected_data['velocity']}", curses.color_pair(1 if inspected_data['velocity'] < 5 else 2))
                        win_ledger.addstr(3, 2, f"Payment Rail: {inspected_data['rail']}")
                        win_ledger.addstr(4, 2, f"Source IP   : {inspected_data['ip']}")
                    else:
                        win_ledger.addstr(2, 2, f"VPA '{inspected_account}' not resolved in telemetry buffers.", curses.color_pair(2))
                else:
                    win_ledger.addstr(2, 2, "Use 'fetch <vpa>' to inspect telemetry attributes.")
                win_ledger.noutrefresh()
            
            # 4. Security Isolation Sandbox (Top-Right)
            if win_sandbox:
                win_sandbox.box()
                win_sandbox.addstr(0, 2, " THREAT & ANOMALY ISOLATION SANDBOX ", curses.color_pair(2))
                with lock:
                    visible_anomalies = anomaly_logs[-(sandbox_h - 2):]
                    for idx, tx in enumerate(visible_anomalies):
                        info = f"ALERT: [{tx['telemetry_id'][:12]}] Risk: {tx['analytics_mesh']['risk_score']:.2f} | IP: {tx['cyber_telemetry']['source_ip']}"
                        if right_w > 4:
                            win_sandbox.addstr(idx + 1, 2, info[:right_w - 4], curses.color_pair(2))
                win_sandbox.noutrefresh()
            
            # 5. Diagnostic Inspector & XAI Panel (Middle-Right)
            if win_diagnostic:
                win_diagnostic.box()
                win_diagnostic.addstr(0, 2, " DIAGNOSTIC CORRELATION INDEX & SHAP ", curses.color_pair(3))
                if inspected_account and inspected_data:
                    win_diagnostic.addstr(1, 2, f"Risk Score: {inspected_data['risk_score']:.4f}", curses.color_pair(2 if inspected_data['risk_score'] >= threshold else 1))
                    win_diagnostic.addstr(2, 2, f"Isolated: {'YES (SECURITY FREEZE ACTIVE)' if inspected_data['isolated'] else 'NO (BASELINE)'}", curses.color_pair(2 if inspected_data['isolated'] else 1))
                    win_diagnostic.addstr(3, 2, f"Topological Node: BRIDGE-{inspected_account}")
                    win_diagnostic.addstr(5, 2, "SHAP Attribution Metrics:")
                    idx = 6
                    for k, v in inspected_data["shap"].items():
                        win_diagnostic.addstr(idx, 4, f"{k}: {v:.4f}")
                        idx += 1
                elif inspected_token_info:
                    win_diagnostic.addstr(1, 2, "Dynamic Vault Tokenization Output:", curses.color_pair(4) | curses.A_BOLD)
                    win_diagnostic.addstr(3, 2, f"Source VPA  : {inspected_token_info['vpa']}")
                    win_diagnostic.addstr(4, 2, f"Network     : {inspected_token_info['net']}")
                    win_diagnostic.addstr(6, 2, f"Derived Token: {inspected_token_info['token']}", curses.color_pair(1) | curses.A_BOLD)
                    win_diagnostic.addstr(8, 2, "Press any key to dismiss token details.")
                else:
                    if diagnostics_results:
                        win_diagnostic.addstr(1, 2, "Live System Health Diagnostics:", curses.color_pair(4) | curses.A_BOLD)
                        win_diagnostic.addstr(3, 2, f"SQLite DB    : {diagnostics_results.get('sqlite', 'N/A')}")
                        win_diagnostic.addstr(4, 2, f"Redis Cache  : {diagnostics_results.get('redis', 'N/A')}")
                        win_diagnostic.addstr(5, 2, f"Elasticsearch: {diagnostics_results.get('elasticsearch', 'N/A')}")
                        win_diagnostic.addstr(6, 2, f"API Server   : {diagnostics_results.get('api_server', 'N/A')}")
                        win_diagnostic.addstr(7, 2, f"Neo4j Graph  : {'ONLINE' if HAS_NEO4J else 'DISABLED (ImportError)'}")
                        win_diagnostic.addstr(8, 2, f"InferencePool: ACTIVE ({worker_pool.num_workers} workers)")
                        win_diagnostic.addstr(9, 2, f"DigiLocker CB: {cb.state}", curses.color_pair(2 if cb.state == 'OPEN' else 1))
                        win_diagnostic.addstr(10, 2, f"Cur Threshold: {threshold:.2f}")
                        win_diagnostic.addstr(12, 2, "Press any key to dismiss diagnostics.")
                    else:
                        win_diagnostic.addstr(1, 2, f"System Active (Risk Threshold: {threshold:.2f})")
                        win_diagnostic.addstr(3, 2, "Interactive Command Console Menu:")
                        win_diagnostic.addstr(4, 2, "  fetch <vpa>              Inspect account telemetry")
                        win_diagnostic.addstr(5, 2, "  inject <vpa> <amt> <ip>  Manually spoof transaction")
                        win_diagnostic.addstr(6, 2, "  tokenise <vpa> <net>     Test dynamic vault tokenization")
                        win_diagnostic.addstr(7, 2, "  set threshold <val>      Change threshold (e.g. 0.65)")
                        win_diagnostic.addstr(8, 2, "  breaker [trip/reset]     Force circuit breaker states")
                        win_diagnostic.addstr(9, 2, "  diagnose                 Run live network diagnostics")
                        win_diagnostic.addstr(10, 2, "  clear                    Reset telemetry logs buffer")
                        win_diagnostic.addstr(11, 2, "  exit                     Quit Sugriva terminal dashboard")
                win_diagnostic.noutrefresh()
            
            # 6. Command Shell (Bottom-Row)
            if win_cmd:
                win_cmd.box()
                win_cmd.addstr(0, 2, " COMMAND SURFACE (Press 1-3 to spoof attacks, type 'exit' to quit) ", curses.color_pair(4))
                win_cmd.addstr(1, 2, f"> {cmd_buffer}")
                win_cmd.noutrefresh()
            
            curses.doupdate()
        except curses.error:
            pass
        
        try:
            ch = stdscr.getch()
            if ch != -1:
                if diagnostics_results is not None:
                    diagnostics_results = None
                elif inspected_token_info is not None:
                    inspected_token_info = None
                elif ch == ord('1'):
                    threading.Thread(target=trigger_credential_stuffing, daemon=True).start()
                elif ch == ord('2'):
                    threading.Thread(target=trigger_asset_liquidation, daemon=True).start()
                elif ch == ord('3'):
                    threading.Thread(target=trigger_velocity_flood, daemon=True).start()
                elif ch == 10:  # Enter
                    cmd = cmd_buffer.strip()
                    cmd_buffer = ""
                    if cmd == "exit":
                        break
                    elif cmd.startswith("fetch "):
                        target_vpa = cmd.split(" ", 1)[1]
                        fetch_account_profile(target_vpa)
                    elif cmd in ["diagnose", "status"]:
                        inspected_account = None
                        inspected_data = None
                        inspected_token_info = None
                        threading.Thread(target=run_diagnostics, daemon=True).start()
                    elif cmd == "clear":
                        with lock:
                            telemetry_logs.clear()
                            anomaly_logs.clear()
                        inspected_account = None
                        inspected_data = None
                        inspected_token_info = None
                    elif cmd.startswith("set threshold "):
                        try:
                            threshold = float(cmd.split(" ")[2])
                        except Exception:
                            pass
                    elif cmd == "breaker trip":
                        cb.state = 'OPEN'
                        cb.last_state_change = time.time()
                    elif cmd == "breaker reset":
                        cb.state = 'CLOSED'
                        cb.failure_count = 0
                    elif cmd.startswith("tokenise "):
                        parts = cmd.split(" ")
                        if len(parts) >= 3:
                            vpa_arg = parts[1]
                            net_arg = parts[2]
                            derived_token = vault_tok.tokenize_vpa(vpa_arg, net_arg)
                            inspected_token_info = {
                                "vpa": vpa_arg,
                                "net": net_arg,
                                "token": derived_token
                            }
                            inspected_account = None
                            inspected_data = None
                    elif cmd.startswith("inject "):
                        parts = cmd.split(" ")
                        if len(parts) >= 4:
                            vpa_arg = parts[1]
                            try:
                                amt_arg = float(parts[2])
                            except ValueError:
                                amt_arg = 5000.0
                            ip_arg = parts[3]
                            auth_arg = parts[4].upper() if len(parts) > 4 else "SUCCESS"
                            threading.Thread(target=generate_transaction, kwargs={
                                "vpa": vpa_arg,
                                "amount": amt_arg,
                                "ip": ip_arg,
                                "auth_status": auth_arg
                            }, daemon=True).start()
                    elif cmd == "attack --type credential_stuffing":
                        threading.Thread(target=trigger_credential_stuffing, daemon=True).start()
                    elif cmd == "attack --type asset_liquidation":
                        threading.Thread(target=trigger_asset_liquidation, daemon=True).start()
                    elif cmd == "attack --type velocity_flood":
                        threading.Thread(target=trigger_velocity_flood, daemon=True).start()
                elif ch in [8, 127, 263]:
                    cmd_buffer = cmd_buffer[:-1]
                else:
                    if 32 <= ch <= 126:
                        cmd_buffer += chr(ch)
        except Exception:
            pass
            
        time.sleep(0.05)

    if worker_loop_ref and worker_loop_ref.is_running():
        asyncio.run_coroutine_threadsafe(worker_pool.stop(), worker_loop_ref)

if __name__ == "__main__":
    try:
        curses.wrapper(draw_dashboard)
    except KeyboardInterrupt:
        print("\n--- Sugriva Dashboard Terminated Gracefully ---")
