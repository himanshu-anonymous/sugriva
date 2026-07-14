import curses
import time
import random
import threading
import math
from datetime import datetime

telemetry_logs = []
anomaly_logs = []
inspected_account = None
inspected_data = None
lock = threading.Lock()
is_running = True
cmd_buffer = ""
active_attacks_counter = 0
circuit_breaker_state = "CLOSED"

# Mock/Real resources profiler stats
mem_peak = 2.45
mem_delta = 0.0
cpu_latency = 1.15
port_health = "ONLINE"

rails = ["UPI", "NEFT", "RTGS", "VISA", "MASTERCARD", "PAYPAL"]
clearing_nets = ["NPCI", "VISA-NET", "MCTR-NET", "CROSSBORDER"]
status_types = ["SUCCESS", "FAILED"]

def generate_vpa():
    return f"user_{random.randint(1000, 9999)}@bank"

def calculate_shap(amount, velocity, auth_status):
    base = 0.1
    ip_attr = 0.15
    auth_attr = 0.5 if auth_status == "FAILED" else 0.05
    amt_attr = min(0.3, amount / 500000.0)
    vel_attr = min(0.4, velocity / 10.0)
    total = base + ip_attr + auth_attr + amt_attr + vel_attr
    score = 1.0 / (1.0 + math.exp(-total))
    return score, {
        "ip_anomaly": ip_attr,
        "auth_status": auth_attr,
        "amount_factor": amt_attr,
        "velocity_factor": vel_attr
    }

def simulator_loop():
    global active_attacks_counter, mem_delta, cpu_latency
    while is_running:
        time.sleep(random.uniform(0.3, 0.8))
        if active_attacks_counter > 0:
            continue
        vpa = generate_vpa()
        amount = random.uniform(100, 150000)
        rail = random.choice(rails)
        net = "CROSSBORDER" if rail in ["VISA", "MASTERCARD", "PAYPAL"] and random.random() > 0.7 else "DOMESTIC"
        auth = "SUCCESS" if random.random() > 0.05 else "FAILED"
        ip = f"192.168.1.{random.randint(1, 254)}"
        vel = random.randint(1, 4)
        
        start_time = time.perf_counter()
        score, attributions = calculate_shap(amount, vel, auth)
        cpu_latency = (time.perf_counter() - start_time) * 1000.0
        mem_delta = random.uniform(-1024, 2048)

        payload = {
            "vpa": vpa,
            "amount": amount,
            "rail": rail,
            "net": net,
            "auth": auth,
            "ip": ip,
            "velocity": vel,
            "score": score,
            "attributions": attributions,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        
        with lock:
            telemetry_logs.append(payload)
            if len(telemetry_logs) > 50:
                telemetry_logs.pop(0)
            if score >= 0.75:
                anomaly_logs.append(payload)
                if len(anomaly_logs) > 50:
                    anomaly_logs.pop(0)

def trigger_stuffing():
    global active_attacks_counter, mem_delta, cpu_latency
    active_attacks_counter += 1
    target_vpa = generate_vpa()
    target_ip = "198.51.100.42"
    for i in range(5):
        payload = {
            "vpa": target_vpa,
            "amount": random.uniform(50, 200),
            "rail": "UPI",
            "net": "DOMESTIC",
            "auth": "FAILED",
            "ip": target_ip,
            "velocity": i + 1,
            "score": 0.5,
            "attributions": {"ip_anomaly": 0.2, "auth_status": 0.5, "amount_factor": 0.05, "velocity_factor": 0.1},
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        with lock:
            telemetry_logs.append(payload)
        time.sleep(0.2)
    
    start_time = time.perf_counter()
    score, attr = calculate_shap(950000, 6, "SUCCESS")
    cpu_latency = (time.perf_counter() - start_time) * 1000.0
    mem_delta = random.uniform(2048, 4096)

    payload = {
        "vpa": target_vpa,
        "amount": 950000,
        "rail": "VISA",
        "net": "DOMESTIC",
        "auth": "SUCCESS",
        "ip": target_ip,
        "velocity": 6,
        "score": score,
        "attributions": attr,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }
    with lock:
        telemetry_logs.append(payload)
        anomaly_logs.append(payload)
    active_attacks_counter -= 1

def trigger_liquidation():
    global active_attacks_counter, mem_delta, cpu_latency
    active_attacks_counter += 1
    target_vpa = "admin_sec_vault@corp"
    target_ip = "203.0.113.88"
    start_time = time.perf_counter()
    score, attr = calculate_shap(5000000, 1, "SUCCESS")
    cpu_latency = (time.perf_counter() - start_time) * 1000.0
    mem_delta = random.uniform(4096, 8192)

    payload = {
        "vpa": target_vpa,
        "amount": 5000000,
        "rail": "RTGS",
        "net": "CROSSBORDER",
        "auth": "SUCCESS",
        "ip": target_ip,
        "velocity": 1,
        "score": score,
        "attributions": attr,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }
    with lock:
        telemetry_logs.append(payload)
        anomaly_logs.append(payload)
    active_attacks_counter -= 1

def trigger_flood():
    global active_attacks_counter, mem_delta, cpu_latency
    active_attacks_counter += 1
    target_vpa = generate_vpa()
    target_ip = "192.168.1.99"
    for i in range(12):
        start_time = time.perf_counter()
        score, attr = calculate_shap(100, i + 1, "SUCCESS")
        cpu_latency = (time.perf_counter() - start_time) * 1000.0
        mem_delta = random.uniform(-512, 1024)

        payload = {
            "vpa": target_vpa,
            "amount": 100,
            "rail": "UPI",
            "net": "DOMESTIC",
            "auth": "SUCCESS",
            "ip": target_ip,
            "velocity": i + 1,
            "score": score,
            "attributions": attr,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        with lock:
            telemetry_logs.append(payload)
            if score >= 0.75:
                anomaly_logs.append(payload)
        time.sleep(0.08)
    active_attacks_counter -= 1

def run_tui(stdscr):
    global cmd_buffer, inspected_account, inspected_data, is_running, circuit_breaker_state
    curses.curs_set(0)
    stdscr.nodelay(True)
    
    curses.start_color()
    curses.init_pair(1, curses.COLOR_WHITE, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_CYAN, curses.COLOR_BLACK)
    curses.init_pair(4, curses.COLOR_YELLOW, curses.COLOR_BLACK)
    curses.init_pair(5, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(6, curses.COLOR_BLACK, curses.COLOR_WHITE)

    threading.Thread(target=simulator_loop, daemon=True).start()

    last_sh, last_sw = 0, 0
    win_header = None
    win_telemetry = None
    win_escrow = None
    win_topo = None
    win_xai = None
    win_profiler = None
    win_shell = None

    while is_running:
        sh, sw = stdscr.getmaxyx()

        if sh < 24 or sw < 80:
            stdscr.erase()
            stdscr.addstr(0, 0, f"Screen size too small: {sw}x{sh}. Expand to 80x24.", curses.color_pair(2))
            stdscr.refresh()
            time.sleep(0.2)
            continue

        if sh != last_sh or sw != last_sw:
            stdscr.clear()
            last_sh, last_sw = sh, sw
            
            header_h = 3
            shell_h = 3
            col_w = sw // 2
            
            # Left pane heights
            left_top_h = (sh - header_h - shell_h) // 2
            left_bot_h = sh - header_h - shell_h - left_top_h
            
            # Right pane heights (divided into 3 panels)
            right_sub_h = (sh - header_h - shell_h) // 3
            right_profiler_h = sh - header_h - shell_h - (2 * right_sub_h)

            win_header = curses.newwin(header_h, sw, 0, 0)
            win_telemetry = curses.newwin(left_top_h, col_w, header_h, 0)
            win_escrow = curses.newwin(left_bot_h, col_w, header_h + left_top_h, 0)
            
            win_topo = curses.newwin(right_sub_h, sw - col_w, header_h, col_w)
            win_xai = curses.newwin(right_sub_h, sw - col_w, header_h + right_sub_h, col_w)
            win_profiler = curses.newwin(right_profiler_h, sw - col_w, header_h + (2 * right_sub_h), col_w)
            
            win_shell = curses.newwin(shell_h, sw, sh - shell_h, 0)

        # Clear sub-windows
        win_header.erase()
        win_telemetry.erase()
        win_escrow.erase()
        win_topo.erase()
        win_xai.erase()
        win_profiler.erase()
        win_shell.erase()

        # Recalculate dimensions for loops
        col_w = sw // 2
        left_top_h = (sh - header_h - shell_h) // 2
        left_bot_h = sh - header_h - shell_h - left_top_h
        right_sub_h = (sh - header_h - shell_h) // 3
        right_profiler_h = sh - header_h - shell_h - (2 * right_sub_h)

        # Header Box
        win_header.box()
        win_header.addstr(1, 2, "SUGRIVA // REAL-TIME RISK CORRELATION CORE", curses.color_pair(3) | curses.A_BOLD)
        compliance_text = "[RBI 2026 | DPDP 2023]"
        status_text = "ENV: SECURE_DEMO"
        time_text = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        win_header.addstr(1, sw - len(compliance_text) - len(status_text) - len(time_text) - 8, f"{compliance_text} | {status_text} | {time_text}", curses.color_pair(1))
        win_header.noutrefresh()

        # Telemetry Box (Left Column - Top)
        win_telemetry.box()
        win_telemetry.addstr(0, 2, " LIVE INGESTION TICKER ", curses.color_pair(3) | curses.A_BOLD)
        with lock:
            visible_logs = telemetry_logs[-(left_top_h - 2):]
        for idx, log in enumerate(visible_logs):
            score_color = curses.color_pair(2) if log["score"] >= 0.75 else curses.color_pair(5)
            log_str = f"[{log['timestamp']}] {log['rail']} {log['net'][:11]}: {log['amount']:.0f} INR"
            win_telemetry.addstr(idx + 1, 2, log_str[:col_w - 12], curses.color_pair(1))
            win_telemetry.addstr(idx + 1, col_w - 9, f"{log['score']:.2f}", score_color | curses.A_BOLD)
        win_telemetry.noutrefresh()

        # Escrow Panel (Left Column - Bottom)
        win_escrow.box()
        win_escrow.addstr(0, 2, " SECURITY ISOLATION ESCROW ", curses.color_pair(2) | curses.A_BOLD)
        with lock:
            visible_escrow = anomaly_logs[-(left_bot_h - 2):]
        for idx, escrow in enumerate(visible_escrow):
            # Select step up authentication routing based on threat level
            if escrow["score"] >= 0.85:
                auth_step = "DIGILOCKER"
            elif escrow["score"] >= 0.78:
                auth_step = "SMS-OTP"
            else:
                auth_step = "INLINE"
            escrow_str = f"[{escrow['timestamp']}] {escrow['vpa'][:16]} - {escrow['amount']:.0f} INR [{auth_step}]"
            win_escrow.addstr(idx + 1, 2, escrow_str[:col_w - 3], curses.color_pair(2) | curses.A_BOLD)
        win_escrow.noutrefresh()

        # Topological Node Inspector (Right Column - Top)
        win_topo.box()
        win_topo.addstr(0, 2, " TOPOLOGICAL NODE INSPECTOR ", curses.color_pair(4) | curses.A_BOLD)
        if inspected_account:
            win_topo.addstr(1, 2, f"Target: {inspected_account}", curses.color_pair(1) | curses.A_BOLD)
            # Generate a SHA-256 PII shielded representation of the VPA
            hashed_vpa = hashlib.sha256(inspected_account.encode("utf-8")).hexdigest()[:24]
            win_topo.addstr(2, 2, f"PII Token: {hashed_vpa}", curses.color_pair(4))
            win_topo.addstr(3, 2, f"Bridge: BRIDGE-{inspected_account.split('@')[0]}", curses.color_pair(3))
        else:
            win_topo.addstr(1, 2, "No target node inspected.", curses.color_pair(1))
            win_topo.addstr(2, 2, "Run 'fetch <vpa>' to inspect.", curses.color_pair(1))
        win_topo.noutrefresh()

        # XAI Panel (Right Column - Middle)
        win_xai.box()
        win_xai.addstr(0, 2, " EXPLAINABLE AI (XAI) METRICS ", curses.color_pair(4) | curses.A_BOLD)
        if inspected_data:
            line_idx = 1
            for feat, val in inspected_data["attributions"].items():
                if line_idx >= right_sub_h - 1:
                    break
                bar_len = int(val * 15)
                bar = "#" * bar_len + "-" * (15 - bar_len)
                win_xai.addstr(line_idx, 2, f"{feat[:12].ljust(12)}: [{bar}] {val:.2f}", curses.color_pair(1))
                line_idx += 1
        else:
            win_xai.addstr(1, 2, "SHAP feature weights require inspected targets.", curses.color_pair(1))
        win_xai.noutrefresh()

        # Sandbox Profiler Deck (Right Column - Bottom)
        win_profiler.box()
        win_profiler.addstr(0, 2, " SANDBOX PROFILER DECK ", curses.color_pair(5) | curses.A_BOLD)
        win_profiler.addstr(1, 2, f"Peak Memory Cap: {mem_cap:.2f} MB" if 'mem_cap' in globals() else f"Peak Memory Cap: {mem_peak:.2f} MB", curses.color_pair(1))
        win_profiler.addstr(2, 2, f"Memory Delta   : {mem_delta:+.0f} Bytes", curses.color_pair(1))
        win_profiler.addstr(3, 2, f"CPU Latency    : {cpu_latency:.2f} ms", curses.color_pair(1))
        win_profiler.addstr(4, 2, f"Storage Health : {port_health} | Breaker: {circuit_breaker_state}", curses.color_pair(5) if circuit_breaker_state == "CLOSED" else curses.color_pair(2) | curses.A_BOLD)
        win_profiler.noutrefresh()

        # Command Shell Box
        win_shell.box()
        win_shell.addstr(1, 2, "CONSOLE> ", curses.color_pair(5) | curses.A_BOLD)
        win_shell.addstr(1, 11, cmd_buffer + "_", curses.color_pair(1))
        win_shell.noutrefresh()

        curses.doupdate()

        # Parse keyboard input
        try:
            ch = stdscr.getch()
        except Exception:
            ch = -1

        if ch != -1:
            if ch == ord('1'):
                threading.Thread(target=trigger_stuffing, daemon=True).start()
            elif ch == ord('2'):
                threading.Thread(target=trigger_liquidation, daemon=True).start()
            elif ch == ord('3'):
                threading.Thread(target=trigger_flood, daemon=True).start()
            elif ch in [10, 13]:  # ENTER key
                cmd = cmd_buffer.strip()
                cmd_buffer = ""
                if cmd == "exit":
                    is_running = False
                elif cmd == "breaker trip":
                    circuit_breaker_state = "OPEN"
                elif cmd == "breaker reset":
                    circuit_breaker_state = "CLOSED"
                elif cmd.startswith("fetch "):
                    target_vpa = cmd.split(" ")[1]
                    inspected_account = target_vpa
                    # Search local history for XAI metrics
                    target_tx = next((t for t in reversed(telemetry_logs) if t["vpa"] == target_vpa), None)
                    if target_tx:
                        inspected_data = {
                            "vpa": target_vpa,
                            "attributions": target_tx["attributions"]
                        }
                    else:
                        inspected_data = {
                            "vpa": target_vpa,
                            "attributions": {
                                "ip_anomaly": 0.1,
                                "auth_status": 0.05,
                                "amount_factor": 0.1,
                                "velocity_factor": 0.05
                            }
                        }
                elif cmd == "attack --type credential_stuffing":
                    threading.Thread(target=trigger_stuffing, daemon=True).start()
                elif cmd == "attack --type asset_liquidation":
                    threading.Thread(target=trigger_liquidation, daemon=True).start()
                elif cmd == "attack --type velocity_flood":
                    threading.Thread(target=trigger_flood, daemon=True).start()
            elif ch in [curses.KEY_BACKSPACE, 8, 127]:  # BACKSPACE keys
                cmd_buffer = cmd_buffer[:-1]
            elif 32 <= ch <= 126:
                cmd_buffer += chr(ch)

        time.sleep(0.05)

if __name__ == "__main__":
    import hashlib
    try:
        curses.wrapper(run_tui)
    except KeyboardInterrupt:
        pass
