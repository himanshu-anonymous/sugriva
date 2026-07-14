import sqlite3
import os
import random
import uuid
from datetime import datetime, timedelta, timezone

def generate_bulk_data(batch_size=10000, total_records=50000):
    db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=OFF;")
    cursor.execute("PRAGMA cache_size=-512000;")
    cursor.execute("PRAGMA temp_store=MEMORY;")
    cursor.execute("PRAGMA locking_mode=EXCLUSIVE;")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ledger (
            telemetry_id TEXT PRIMARY KEY,
            timestamp TEXT,
            source_ip TEXT,
            auth_status TEXT,
            device_fingerprint TEXT,
            waf_alert_level TEXT,
            payment_rail TEXT,
            clearing_network TEXT,
            transaction_type TEXT,
            amount REAL,
            sender_token TEXT,
            receiver_token TEXT,
            risk_score REAL,
            anomaly_isolated INTEGER
        );
    """)
    
    rails = ["NEFT", "RTGS", "UPI", "VISA", "MASTERCARD", "PAYPAL"]
    auth_statuses = ["SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "FAILED"]
    waf_levels = ["NONE", "NONE", "NONE", "NONE", "LOW", "MEDIUM", "HIGH"]
    
    base_time = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    records_inserted = 0
    
    while records_inserted < total_records:
        batch = []
        for _ in range(min(batch_size, total_records - records_inserted)):
            t_id = f"SUGRIVA-{uuid.uuid4().hex[:12].upper()}"
            ts = (base_time + timedelta(seconds=random.randint(0, 2592000))).isoformat() + "Z"
            is_anomaly = random.random() < 0.03
            
            if is_anomaly:
                source_ip = f"{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
                auth_status = "FAILED" if random.random() < 0.7 else "SUCCESS"
                device_fingerprint = f"malicious-agent-{random.randint(100,999)}"
                waf_alert_level = random.choice(["MEDIUM", "HIGH"])
                rail = random.choice(["RTGS", "VISA", "PAYPAL"])
                net = "INTERNATIONAL" if rail in ["VISA", "PAYPAL"] else "DOMESTIC"
                amount = round(random.uniform(100000.0, 1000000.0), 2)
                risk_score = round(random.uniform(0.75, 0.99), 4)
                isolated = 1
            else:
                source_ip = f"192.168.{random.randint(1,100)}.{random.randint(1,254)}"
                auth_status = "SUCCESS"
                device_fingerprint = "legit-client-v1"
                waf_alert_level = "NONE"
                rail = random.choice(rails)
                net = "INTERNATIONAL" if rail == "PAYPAL" else "DOMESTIC"
                amount = round(random.uniform(10.0, 50000.0), 2)
                risk_score = round(random.uniform(0.01, 0.25), 4)
                isolated = 0
                
            sender_token = uuid.uuid4().hex[:24]
            receiver_token = uuid.uuid4().hex[:24]
            
            batch.append((
                t_id, ts, source_ip, auth_status, device_fingerprint, 
                waf_alert_level, rail, net, "TRANSFER", amount, 
                sender_token, receiver_token, risk_score, isolated
            ))
            
        cursor.executemany("INSERT OR REPLACE INTO ledger VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?);", batch)
        conn.commit()
        records_inserted += len(batch)
        
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_sender ON ledger(sender_token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_rail_net ON ledger(payment_rail, clearing_network);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_risk_isolated ON ledger(risk_score, anomaly_isolated);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_composite_lookup ON ledger(timestamp, payment_rail, risk_score);")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    generate_bulk_data()
