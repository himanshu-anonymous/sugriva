# Copyright (c) 2026 Himanshu Patil. All rights reserved.
# Author / Developer: Himanshu Patil

import sqlite3
import redis
from elasticsearch import Elasticsearch
import os
import json
import threading

class SugrivaStorageMesh:
    def __init__(self):
        self.db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.lock = threading.Lock()
        self.init_sqlite()
        self.redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
        self.es_client = Elasticsearch(os.getenv("ELASTICSEARCH_URL", "http://localhost:9200"))

    def init_sqlite(self):
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA journal_mode=WAL;")
                conn.execute("PRAGMA synchronous=OFF;")
                conn.execute("PRAGMA cache_size = -64000;")
                conn.execute("""
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
                conn.execute("CREATE INDEX IF NOT EXISTS idx_ledger_time_sender ON ledger (timestamp, sender_token);")

    def write_to_ledger(self, data: dict):
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA journal_mode=WAL;")
                conn.execute("PRAGMA synchronous=OFF;")
                conn.execute("PRAGMA cache_size = -64000;")
                conn.execute("""
                    INSERT OR REPLACE INTO ledger VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    data["telemetry_id"], data["timestamp"], data["cyber_telemetry"]["source_ip"],
                    data["cyber_telemetry"]["auth_status"], data["cyber_telemetry"]["device_fingerprint"],
                    data["cyber_telemetry"]["waf_alert_level"], data["financial_ledger"]["payment_rail"],
                    data["financial_ledger"]["clearing_network"], data["financial_ledger"]["transaction_type"],
                    data["financial_ledger"]["amount"], data["financial_ledger"]["sender_vpa"],
                    data["financial_ledger"]["receiver_vpa"], data["analytics_mesh"]["risk_score"],
                    1 if data["analytics_mesh"]["anomaly_isolated"] else 0
                ))

    def update_velocity(self, sender_token: str, current_timestamp: float) -> int:
        pipeline = self.redis_client.pipeline()
        pipeline.zadd(sender_token, {str(current_timestamp): current_timestamp})
        pipeline.zremrangebyscore(sender_token, 0, current_timestamp - 3.0)
        pipeline.zcard(sender_token)
        results = pipeline.execute()
        return results[2]

    def index_to_elasticsearch(self, data: dict):
        try:
            self.es_client.index(index="sugriva-security-index", id=data["telemetry_id"], document=data)
        except Exception:
            pass
