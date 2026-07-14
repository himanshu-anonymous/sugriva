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
    global active_attacks_counter
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
        
        score, attributions = calculate_shap(amount, vel, auth)
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
    global active_attacks_counter
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
    
    score, attr = calculate_shap(950000, 6, "SUCCESS")
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
    global active_attacks_counter
    active_attacks_counter += 1
    target_vpa = "admin_sec_vault@corp"
    target_ip = "203.0.113.88"
    score, attr = calculate_shap(5000000, 1, "SUCCESS")
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
    global active_attacks_counter
    active_attacks_counter += 1
    target_vpa = generate_vpa()
    target_ip = "192.168.1.99"
    for i in range(12):
        score, attr = calculate_shap(100, i + 1, "SUCCESS")
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
    global cmd_buffer, inspected_account, inspected_data, is_running
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

    while is_running:
        sh, sw = stdscr.getmaxyx()
        stdscr.erase()

        if sh < 24 or sw < 80:
            stdscr.addstr(0, 0, f"Screen size too small: {sw}x{sh}. Expand to 80x24.", curses.color_pair(2))
            stdscr.refresh()
            time.sleep(0.2)
            continue

        # Coordinate allocations
        header_h = 3
        shell_h = 3
        col_w = sw // 2
        top_pane_h = (sh - header_h - shell_h) // 2
        bottom_pane_h = sh - header_h - shell_h - top_pane_h

        # Setup windows
        win_header = curses.newwin(header_h, sw, 0, 0)
        win_telemetry = curses.newwin(top_pane_h, col_w, header_h, 0)
        win_ledger = curses.newwin(bottom_pane_h, col_w, header_h + top_pane_h, 0)
        win_sandbox = curses.newwin(top_pane_h, sw - col_w, header_h, col_w)
        win_inspector = curses.newwin(bottom_pane_h, sw - col_w, header_h + top_pane_h, col_w)
        win_shell = curses.newwin(shell_h, sw, sh - shell_h, 0)

        # Header Box
        win_header.box()
        win_header.addstr(1, 2, "SUGRIVA // REAL-TIME CYBER-FINANCIAL CORRELATION MESH", curses.color_pair(3) | curses.A_BOLD)
        status_text = "ENV: SECURE_DEMO"
        time_text = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        win_header.addstr(1, sw - len(status_text) - len(time_text) - 5, f"{status_text} | {time_text}", curses.color_pair(1))
        win_header.noutrefresh()

        # Telemetry Box
        win_telemetry.box()
        win_telemetry.addstr(0, 2, " CORE TELEMETRY STREAM ", curses.color_pair(3) | curses.A_BOLD)
        with lock:
            visible_logs = telemetry_logs[-(top_pane_h - 2):]
        for idx, log in enumerate(visible_logs):
            score_color = curses.color_pair(2) if log["score"] >= 0.75 else curses.color_pair(5)
            log_str = f"[{log['timestamp']}] {log['rail']} {log['vpa'][:16]} - {log['amount']:.0f} INR"
            win_telemetry.addstr(idx + 1, 2, log_str[:col_w - 12], curses.color_pair(1))
            win_telemetry.addstr(idx + 1, col_w - 9, f"{log['score']:.2f}", score_color | curses.A_BOLD)
        win_telemetry.noutrefresh()

        # Sandbox Threat Box
        win_sandbox.box()
        win_sandbox.addstr(0, 2, " SECURITY ISOLATION SANDBOX ", curses.color_pair(2) | curses.A_BOLD)
        with lock:
            visible_threats = anomaly_logs[-(top_pane_h - 2):]
        for idx, threat in enumerate(visible_threats):
            threat_str = f"[{threat['timestamp']}] THREAT: {threat['vpa'][:14]} - Amount: {threat['amount']:.0f} INR (IP: {threat['ip']})"
            win_sandbox.addstr(idx + 1, 2, threat_str[:sw - col_w - 3], curses.color_pair(2) | curses.A_BOLD)
        win_sandbox.noutrefresh()

        # Inspector / XAI Box
        win_inspector.box()
        win_inspector.addstr(0, 2, " DIAGNOSTIC INSPECTOR & XAI ", curses.color_pair(4) | curses.A_BOLD)
        if inspected_data:
            win_inspector.addstr(1, 2, f"VPA: {inspected_data['vpa']}", curses.color_pair(1) | curses.A_BOLD)
            win_inspector.addstr(2, 2, f"Bridge: BRIDGE-{inspected_data['vpa'].split('@')[0]}", curses.color_pair(3))
            win_inspector.addstr(3, 2, "Attributions (SHAP):", curses.color_pair(4))
            line_idx = 4
            for feat, val in inspected_data["attributions"].items():
                if line_idx >= bottom_pane_h - 1:
                    break
                bar_len = int(val * 15)
                bar = "#" * bar_len + "-" * (15 - bar_len)
                win_inspector.addstr(line_idx, 2, f" {feat[:12].ljust(12)}: [{bar}] {val:.2f}", curses.color_pair(1))
                line_idx += 1
        else:
            win_inspector.addstr(2, 2, "No inspector lookup target selected.", curses.color_pair(1))
            win_inspector.addstr(3, 2, "Run 'fetch <vpa>' in the console below", curses.color_pair(1))
            win_inspector.addstr(4, 2, "to profile dynamic risk metrics.", curses.color_pair(1))
        win_inspector.noutrefresh()

        # Account Ledger Surface Box
        win_ledger.box()
        win_ledger.addstr(0, 2, " ACCOUNT LEDGER SURFACE ", curses.color_pair(5) | curses.A_BOLD)
        if inspected_account:
            win_ledger.addstr(1, 2, f"Target: {inspected_account}", curses.color_pair(5) | curses.A_BOLD)
            # Find last transaction details
            user_txs = [t for t in telemetry_logs if t["vpa"] == inspected_account]
            if user_txs:
                last_tx = user_txs[-1]
                win_ledger.addstr(2, 2, f"Last Tx Rail  : {last_tx['rail']}", curses.color_pair(1))
                win_ledger.addstr(3, 2, f"Last Tx Amount: {last_tx['amount']:.2f} INR", curses.color_pair(1))
                win_ledger.addstr(4, 2, f"Rolling 3s Vel: {last_tx['velocity']}", curses.color_pair(1))
                win_ledger.addstr(5, 2, f"Evaluated Risk: {last_tx['score']:.4f}", curses.color_pair(2) if last_tx['score'] >= 0.75 else curses.color_pair(5))
            else:
                win_ledger.addstr(3, 2, "No transactions cached for VPA.", curses.color_pair(4))
        else:
            win_ledger.addstr(2, 2, "Run command or select node to inspect.", curses.color_pair(1))
        win_ledger.noutrefresh()

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
    try:
        curses.wrapper(run_tui)
    except KeyboardInterrupt:
        pass
