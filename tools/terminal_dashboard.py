import curses
import os
import sys
import time
import json
import asyncio
import threading
import subprocess
import socket
import httpx
import sqlite3
import redis
from elasticsearch import Elasticsearch

api_status = "UNKNOWN"
db_rows = 0
cache_keys = 0
logs_buffer = []
alerts_buffer = []
cmd_buffer = ""
diagnostic_result = None
diagnostic_active = False

infra_process = None
seeder_process = None
api_process = None

data_lock = threading.Lock()

def check_port(host, port):
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except Exception:
        return False

def get_db_row_count():
    db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
    if not os.path.exists(db_path):
        return 0
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM ledger")
        count = cur.fetchone()[0]
        conn.close()
        return count
    except Exception:
        return 0

def get_redis_info():
    try:
        r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        return r.dbsize()
    except Exception:
        return 0

def update_status_metrics():
    global api_status, db_rows, cache_keys
    is_online = check_port("localhost", int(os.getenv("SYSTEM_PORT", 8000)))
    with data_lock:
        api_status = "ONLINE" if is_online else "OFFLINE"
        db_rows = get_db_row_count()
        cache_keys = get_redis_info()

def run_bootstrapper():
    global infra_process, seeder_process, api_process
    try:
        infra_process = subprocess.Popen(
            ["docker-compose", "up", "-d"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        def read_pipe(pipe, label):
            for line in pipe:
                with data_lock:
                    logs_buffer.append(f"[{label}] {line.strip()}")
        threading.Thread(target=read_pipe, args=(infra_process.stdout, "INFRA"), daemon=True).start()
        threading.Thread(target=read_pipe, args=(infra_process.stderr, "INFRA-ERR"), daemon=True).start()
    except Exception as e:
        logs_buffer.append(f"[ERR] Failed to start docker-compose: {e}")

    time.sleep(5)
    
    try:
        seeder_process = subprocess.Popen(
            [sys.executable, "tools/seed_database.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        def read_seeder(pipe, label):
            for line in pipe:
                with data_lock:
                    logs_buffer.append(f"[{label}] {line.strip()}")
        threading.Thread(target=read_seeder, args=(seeder_process.stdout, "SEEDER"), daemon=True).start()
        threading.Thread(target=read_seeder, args=(seeder_process.stderr, "SEEDER-ERR"), daemon=True).start()
    except Exception as e:
        logs_buffer.append(f"[ERR] Failed to start seeder: {e}")
        
    try:
        port = os.getenv("SYSTEM_PORT", "8000")
        api_process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", port],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        def read_api(pipe, label):
            for line in pipe:
                with data_lock:
                    logs_buffer.append(f"[{label}] {line.strip()}")
        threading.Thread(target=read_api, args=(api_process.stdout, "API"), daemon=True).start()
        threading.Thread(target=read_api, args=(api_process.stderr, "API-ERR"), daemon=True).start()
    except Exception as e:
        logs_buffer.append(f"[ERR] Failed to start API: {e}")

async def read_sse_alerts():
    client = httpx.AsyncClient(timeout=None)
    url = f"http://localhost:{os.getenv('SYSTEM_PORT', '8000')}/api/v1/analytics/alerts"
    while True:
        try:
            async with client.stream("GET", url) as response:
                if response.status_code == 200:
                    async for line in response.aiter_lines():
                        if line.startswith("data:"):
                            alert_json = json.loads(line[5:].strip())
                            with data_lock:
                                alerts_buffer.append(alert_json)
                else:
                    await asyncio.sleep(2)
        except Exception:
            await asyncio.sleep(2)

async def trigger_attack_1():
    client = httpx.AsyncClient()
    url = f"http://localhost:{os.getenv('SYSTEM_PORT', '8000')}/api/v1/telemetry/process-raw"
    attacker_ip = f"198.51.100.{random.randint(1,254)}"
    fp = f"stuffing-bot-{random.randint(10,99)}"
    
    with data_lock:
        logs_buffer.append("[ATTACK-1] Dispatched credential stuffing payload burst...")
        
    for _ in range(5):
        try:
            await client.post(url, json={
                "syslog": f"src={attacker_ip} status=FAILED fp={fp} waf=NONE",
                "telemetry_id": f"STUFF-{uuid.uuid4().hex[:8]}"
            })
        except Exception:
            pass
            
    try:
        await client.post(url, json={
            "telemetry_id": f"STUFF-UPI-{uuid.uuid4().hex[:8]}",
            "cyber_telemetry": {
                "source_ip": attacker_ip,
                "auth_status": "SUCCESS",
                "device_fingerprint": fp,
                "waf_alert_level": "HIGH"
            },
            "financial_ledger": {
                "payment_rail": "UPI",
                "clearing_network": "NPCI",
                "transaction_type": "TRANSFER",
                "amount": 490000.0,
                "sender_vpa": "victim@bank",
                "receiver_vpa": "mule@attacker"
            }
        })
    except Exception:
        pass
    await client.aclose()

async def trigger_attack_2():
    client = httpx.AsyncClient()
    url = f"http://localhost:{os.getenv('SYSTEM_PORT', '8000')}/api/v1/telemetry/process-raw"
    with data_lock:
        logs_buffer.append("[ATTACK-2] Dispatched trade finance instrument liquidation...")
    try:
        xml_payload = """<Document>
  <TxTp>TREASURY-BILL-LIQUIDATION</TxTp>
  <Amt>980000.00</Amt>
  <Dbtr>treasury-reserve@bank</Dbtr>
  <Cdtr>offshore-shell@paypal</Cdtr>
  <Rail>PAYPAL</Rail>
  <Netw>PAYPAL-NET</Netw>
</Document>"""
        await client.post(url, json={
            "xml": xml_payload,
            "telemetry_id": f"INSIDER-{uuid.uuid4().hex[:8]}"
        })
    except Exception:
        pass
    await client.aclose()

async def trigger_attack_3():
    client = httpx.AsyncClient()
    url = f"http://localhost:{os.getenv('SYSTEM_PORT', '8000')}/api/v1/telemetry/process-raw"
    with data_lock:
        logs_buffer.append("[ATTACK-3] Starting multi-rail traffic flood stress test...")
    ips = [f"192.168.1.{i}" for i in range(10, 200)]
    rails = ["NEFT", "RTGS", "UPI", "VISA", "MASTERCARD", "PAYPAL"]
    clearing = ["RBI", "NPCI", "VISA-NET", "MC-NET", "PAYPAL-NET"]
    
    async def post_one():
        try:
            await client.post(url, json={
                "telemetry_id": f"FLOOD-{uuid.uuid4().hex[:8]}",
                "cyber_telemetry": {
                    "source_ip": random.choice(ips),
                    "auth_status": "SUCCESS",
                    "device_fingerprint": "legit-flood-client",
                    "waf_alert_level": "NONE"
                },
                "financial_ledger": {
                    "payment_rail": random.choice(rails),
                    "clearing_network": random.choice(clearing),
                    "transaction_type": "RETAIL",
                    "amount": round(random.uniform(5.0, 1000.0), 2),
                    "sender_vpa": f"flooder{random.randint(1,100)}@bank",
                    "receiver_vpa": f"merchant{random.randint(1,100)}@bank"
                }
            })
        except Exception:
            pass
            
    tasks = [post_one() for _ in range(100)]
    await asyncio.gather(*tasks)
    await client.aclose()

def perform_diagnostic_fetch(sender_token):
    global diagnostic_result, diagnostic_active
    db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT payment_rail, COUNT(*), SUM(amount) 
            FROM ledger 
            WHERE sender_token = ? 
            GROUP BY payment_rail
        """, (sender_token,))
        sqlite_records = cur.fetchall()
        
        cur.execute("""
            SELECT risk_score, anomaly_isolated, source_ip 
            FROM ledger 
            WHERE sender_token = ? 
            ORDER BY timestamp DESC LIMIT 1
        """, (sender_token,))
        latest_record = cur.fetchone()
        conn.close()
        
        r = redis.Redis.from_url(redis_url)
        current_time = time.time()
        redis_count = r.zcount(sender_token, current_time - 3.0, current_time)
        
        es = Elasticsearch(es_url)
        es_query = {
            "query": {
                "term": {
                    "financial_ledger.sender_vpa.keyword": sender_token
                }
            },
            "size": 1
        }
        res = es.search(index="sugriva-security-index", body=es_query)
        hits = res.get("hits", {}).get("hits", [])
        
        shap_metrics = {}
        if hits:
            shap_metrics = hits[0]["_source"].get("analytics_mesh", {}).get("xai_attributions", {})
            
        diagnostic_result = {
            "token": sender_token,
            "redis_velocity": redis_count,
            "historical_trends": sqlite_records,
            "latest": latest_record,
            "xai": shap_metrics
        }
    except Exception as e:
        diagnostic_result = {"error": str(e)}

def draw_dashboard(stdscr):
    global cmd_buffer, diagnostic_active, diagnostic_result
    curses.curs_set(0)
    stdscr.nodelay(True)
    
    curses.start_color()
    curses.init_pair(1, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_CYAN, curses.COLOR_BLACK)
    curses.init_pair(4, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    
    loop = asyncio.new_event_loop()
    def start_async_loop():
        asyncio.set_event_loop(loop)
        loop.create_task(read_sse_alerts())
        loop.run_forever()
        
    threading.Thread(target=start_async_loop, daemon=True).start()
    threading.Thread(target=run_bootstrapper, daemon=True).start()
    
    last_update = 0
    
    while True:
        height, width = stdscr.getmaxyx()
        
        status_h = 6
        cmd_h = 3
        middle_h = height - status_h - cmd_h
        ticker_w = width // 2
        alert_w = width - ticker_w
        
        current_time = time.time()
        if current_time - last_update > 2.0:
            last_update = current_time
            threading.Thread(target=update_status_metrics, daemon=True).start()
            
        stdscr.erase()
        
        win_status = curses.newwin(status_h, width, 0, 0)
        win_status.box()
        win_status.addstr(0, 2, " SYSTEM MONITOR & INFRASTRUCTURE STATUS ", curses.color_pair(3))
        
        with data_lock:
            win_status.addstr(1, 2, f"API Surface status: {api_status}", curses.color_pair(1 if api_status=="ONLINE" else 2))
            win_status.addstr(2, 2, f"SQLite Row Count  : {db_rows}")
            win_status.addstr(3, 2, f"Active Cache Keys : {cache_keys}")
            es_st = "UP" if check_port("localhost", 9200) else "DOWN"
            win_status.addstr(4, 2, f"Elasticsearch     : {es_st}", curses.color_pair(1 if es_st=="UP" else 2))
            
        win_status.noutrefresh()
        
        win_ticker = curses.newwin(middle_h, ticker_w, status_h, 0)
        win_ticker.box()
        win_ticker.addstr(0, 2, " INBOUND LIVE LOGS / STANDARD PIPES ", curses.color_pair(3))
        
        with data_lock:
            visible_logs = logs_buffer[-(middle_h - 2):]
            for idx, log in enumerate(visible_logs):
                win_ticker.addstr(idx + 1, 2, log[:ticker_w - 4])
                
        win_ticker.noutrefresh()
        
        win_alerts = curses.newwin(middle_h, alert_w, status_h, ticker_w)
        win_alerts.box()
        
        if diagnostic_active:
            win_alerts.addstr(0, 2, " ACCOUNT DIAGNOSTIC OVERVIEW (Press 'c' to close) ", curses.color_pair(4))
            if diagnostic_result:
                if "error" in diagnostic_result:
                    win_alerts.addstr(2, 2, f"Error: {diagnostic_result['error']}", curses.color_pair(2))
                else:
                    win_alerts.addstr(2, 2, f"Token: {diagnostic_result['token'][:24]}", curses.color_pair(1))
                    win_alerts.addstr(3, 2, f"3s Redis Velocity: {diagnostic_result['redis_velocity']}")
                    if diagnostic_result['latest']:
                        win_alerts.addstr(4, 2, f"Latest IP: {diagnostic_result['latest'][2]}")
                        win_alerts.addstr(5, 2, f"Risk Score: {diagnostic_result['latest'][0]:.4f}", curses.color_pair(2 if diagnostic_result['latest'][0] >= 0.75 else 1))
                        win_alerts.addstr(6, 2, f"Isolated: {'YES' if diagnostic_result['latest'][1] == 1 else 'NO'}")
                    else:
                        win_alerts.addstr(4, 2, "No recent database events.")
                    win_alerts.addstr(8, 2, "Historical Trends:")
                    for offset, trend in enumerate(diagnostic_result['historical_trends'][:3]):
                        win_alerts.addstr(9 + offset, 4, f"{trend[0]}: {trend[1]} txs, Total Volume: {trend[2]:.2f} INR")
                    if diagnostic_result['xai']:
                        win_alerts.addstr(13, 2, "SHAP Explainability:")
                        offset = 14
                        for k, v in diagnostic_result['xai'].items():
                            win_alerts.addstr(offset, 4, f"{k}: {v:.4f}")
                            offset += 1
            else:
                win_alerts.addstr(2, 2, "Fetching account details from SQLite and Elasticsearch...")
        else:
            win_alerts.addstr(0, 2, " REAL-TIME THREAT ALERTS ", curses.color_pair(2))
            with data_lock:
                visible_alerts = alerts_buffer[-(middle_h - 2):]
                for idx, alert in enumerate(visible_alerts):
                    telemetry_id = alert.get("telemetry_id", "GENERIC")
                    payload = alert.get("payload", {})
                    risk = payload.get("analytics_mesh", {}).get("risk_score", 0.0)
                    rail = payload.get("financial_ledger", {}).get("payment_rail", "RTGS")
                    alert_line = f"ALERT: [{telemetry_id}] Risk: {risk:.2f} Rail: {rail}"
                    win_alerts.addstr(idx + 1, 2, alert_line[:alert_w - 4], curses.color_pair(2))
                    
        win_alerts.noutrefresh()
        
        win_cmd = curses.newwin(cmd_h, width, height - cmd_h, 0)
        win_cmd.box()
        win_cmd.addstr(0, 2, " SIMULATION CONTROL & PROMPT CONSOLE (1: CredStuff, 2: TradeFin, 3: Flood) ", curses.color_pair(3))
        win_cmd.addstr(1, 2, f"> {cmd_buffer}")
        win_cmd.noutrefresh()
        
        curses.doupdate()
        
        try:
            ch = stdscr.getch()
            if ch != -1:
                if ch == ord('1'):
                    loop.call_soon_threadsafe(asyncio.create_task, trigger_attack_1())
                elif ch == ord('2'):
                    loop.call_soon_threadsafe(asyncio.create_task, trigger_attack_2())
                elif ch == ord('3'):
                    loop.call_soon_threadsafe(asyncio.create_task, trigger_attack_3())
                elif ch == ord('c') or ch == ord('C'):
                    diagnostic_active = False
                    diagnostic_result = None
                elif ch == 10:
                    if cmd_buffer.strip().startswith("fetch "):
                        sender_token = cmd_buffer.strip().split(" ", 1)[1]
                        diagnostic_active = True
                        diagnostic_result = None
                        threading.Thread(target=perform_diagnostic_fetch, args=(sender_token,), daemon=True).start()
                    elif cmd_buffer.strip() == "exit":
                        break
                    cmd_buffer = ""
                elif ch == 8 or ch == 127 or ch == 263:
                    cmd_buffer = cmd_buffer[:-1]
                else:
                    if 32 <= ch <= 126:
                        cmd_buffer += chr(ch)
        except Exception:
            pass
            
        time.sleep(0.05)

    loop.stop()
    if infra_process:
        infra_process.kill()
    if seeder_process:
        seeder_process.kill()
    if api_process:
        api_process.kill()
    subprocess.run(["docker-compose", "down"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == "__main__":
    curses.wrapper(draw_dashboard)
