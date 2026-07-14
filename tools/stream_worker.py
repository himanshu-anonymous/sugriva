import asyncio
import os
import json
import time
import hashlib
import hmac
import sqlite3
import redis.asyncio as redis
from aiokafka import AIOKafkaConsumer
from elasticsearch import AsyncElasticsearch

def tokenize_vpa(vpa_str: str) -> str:
    salt = os.getenv("TOKEN_SALT", "SUGRIVA_SALT_2026")
    salted = (str(vpa_str) + salt).encode('utf-8')
    return hashlib.sha256(salted).hexdigest()[:24]

def generate_hmac(payload_dict: dict) -> str:
    secret = os.getenv("CRYPTO_HMAC_SECRET", "default_secret").encode('utf-8')
    payload_bytes = json.dumps(payload_dict, sort_keys=True).encode('utf-8')
    return hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()

def persist_to_sqlite_sync(db_path: str, record: dict):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=OFF;")
    
    cursor.execute("""
        INSERT OR REPLACE INTO ledger (
            telemetry_id, timestamp, source_ip, auth_status, device_fingerprint,
            waf_alert_level, transaction_type, amount, sender_token, receiver_token,
            risk_score, anomaly_isolated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record.get("telemetry_id"),
        record.get("timestamp"),
        record.get("source_ip"),
        record.get("auth_status"),
        record.get("device_fingerprint"),
        record.get("waf_alert_level"),
        record.get("transaction_type"),
        record.get("amount"),
        record.get("sender_token"),
        record.get("receiver_token"),
        record.get("risk_score", 0.0),
        record.get("anomaly_isolated", 0)
    ))
    conn.commit()
    conn.close()

async def main():
    bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    topic = os.getenv("KAFKA_TOPIC", "sugriva-raw-telemetry")
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    sqlite_db_path = os.getenv("SQLITE_DB_PATH", "./data/sugriva_vault.db")
    es_host = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers=bootstrap_servers,
        group_id="sugriva-worker-group"
    )
    
    redis_client = redis.from_url(redis_url)
    es_client = AsyncElasticsearch([es_host])
    
    await consumer.start()
    
    try:
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode('utf-8'))
                
                sender_vpa = payload.get("sender_vpa", "")
                receiver_vpa = payload.get("receiver_vpa", "")
                
                sender_token = tokenize_vpa(sender_vpa)
                receiver_token = tokenize_vpa(receiver_vpa)
                
                current_time_ms = int(time.time() * 1000)
                window_start_ms = current_time_ms - 3000
                
                pipeline = redis_client.pipeline()
                pipeline.zadd(f"velocity:{sender_token}", {str(current_time_ms): current_time_ms})
                pipeline.zremrangebyscore(f"velocity:{sender_token}", 0, window_start_ms)
                pipeline.zcard(f"velocity:{sender_token}")
                results = await pipeline.execute()
                
                velocity = results[2]
                
                payload["sender_token"] = sender_token
                payload["receiver_token"] = receiver_token
                payload["velocity"] = velocity
                
                financial_dict = payload.get("financial_ledger", payload)
                payload["crypto_hmac"] = generate_hmac(financial_dict)
                
                await asyncio.to_thread(persist_to_sqlite_sync, sqlite_db_path, payload)
                
                await es_client.index(
                    index="sugriva-security-index",
                    document=payload
                )
            except Exception as e:
                print(f"Worker exception processing message: {e}")
    finally:
        await consumer.stop()
        await redis_client.close()
        await es_client.close()

if __name__ == "__main__":
    asyncio.run(main())
