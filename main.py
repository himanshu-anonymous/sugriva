# Copyright (c) 2026 Himanshu Patil. All rights reserved.
# Author / Developer: Himanshu Patil

import asyncio
import os
import json
import time
import sqlite3
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

from app.crypto import SugrivaSecurityGateway
from app.storage import SugrivaStorageMesh
from app.analytics import SugrivaAnalyticsMesh
from app.ingestion import router as ingestion_router

import dotenv
dotenv.load_dotenv()

crypto_gateway = SugrivaSecurityGateway()
storage_mesh = SugrivaStorageMesh()
analytics_mesh = SugrivaAnalyticsMesh()
pipeline_task = None
ALERT_QUEUE = asyncio.Queue(maxsize=5000)

async def pipeline_worker_loop():
    from aiokafka import AIOKafkaConsumer
    
    consumer = AIOKafkaConsumer(
        os.getenv("KAFKA_TOPIC", "sugriva-raw-telemetry"),
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        group_id="sugriva-processor-group",
        max_poll_records=1000
    )
    
    await consumer.start()
    try:
        async for msg in consumer:
            try:
                if msg.value is None:
                    continue
                payload = json.loads(msg.value.decode("utf-8"))
                
                sender_raw = payload["financial_ledger"]["sender_vpa"]
                receiver_raw = payload["financial_ledger"]["receiver_vpa"]
                
                tokenized_sender = crypto_gateway.tokenize_vpa(sender_raw)
                tokenized_receiver = crypto_gateway.tokenize_vpa(receiver_raw)
                
                payload["financial_ledger"]["sender_vpa"] = tokenized_sender
                payload["financial_ledger"]["receiver_vpa"] = tokenized_receiver
                
                current_time = time.time()
                velocity_count = await asyncio.to_thread(storage_mesh.update_velocity, tokenized_sender, current_time)
                payload["financial_ledger"]["velocity_score"] = float(velocity_count)
                
                serialized_ledger = json.dumps(payload["financial_ledger"])
                payload["crypto_routing"]["integrity_hmac"] = crypto_gateway.generate_hmac(serialized_ledger)
                
                ip_val = sum(int(x) for x in payload["cyber_telemetry"]["source_ip"].split('.') if x.isdigit()) % 255
                auth_val = 1.0 if payload["cyber_telemetry"]["auth_status"] == "SUCCESS" else 0.0
                amt_val = float(payload["financial_ledger"]["amount"])
                v_score = float(velocity_count)
                
                features = [float(ip_val), auth_val, amt_val, v_score]
                
                is_isolated = analytics_mesh.run_anomaly_isolation(features)
                payload["analytics_mesh"]["anomaly_isolated"] = is_isolated
                
                dummy_edges = [[0, 0], [0, 0]]
                calculated_risk = analytics_mesh.calculate_risk_score(features, dummy_edges)
                payload["analytics_mesh"]["risk_score"] = calculated_risk
                
                shap_metrics = analytics_mesh.compute_shap_values(features)
                payload["analytics_mesh"]["xai_attributions"] = shap_metrics
                
                await asyncio.to_thread(storage_mesh.write_to_ledger, payload)
                await asyncio.to_thread(storage_mesh.index_to_elasticsearch, payload)
                
                if calculated_risk >= 0.75:
                    topo_graph = analytics_mesh.generate_topology(
                        payload["telemetry_id"],
                        payload["cyber_telemetry"]["source_ip"],
                        tokenized_sender
                    )
                    nodes = list(topo_graph.nodes)
                    edges = list(topo_graph.edges)
                    
                    alert_data = {
                        "telemetry_id": payload["telemetry_id"],
                        "payload": payload,
                        "topology": {
                            "nodes": nodes,
                            "edges": [[u, v] for u, v in edges]
                        },
                        "attributions": shap_metrics
                    }
                    
                    try:
                        ALERT_QUEUE.put_nowait(alert_data)
                    except asyncio.QueueFull:
                        try:
                            ALERT_QUEUE.get_nowait()
                            ALERT_QUEUE.put_nowait(alert_data)
                        except Exception:
                            pass
            except Exception as inner_e:
                pass
    except asyncio.CancelledError:
        pass
    finally:
        await consumer.stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline_task
    pipeline_task = asyncio.create_task(pipeline_worker_loop())
    yield
    if pipeline_task:
        pipeline_task.cancel()
        try:
            await pipeline_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Project Sugriva Scaled MVP Architecture Core", lifespan=lifespan)
app.include_router(ingestion_router)

def get_dashboard_metrics(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM ledger")
    total_tx = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(amount) FROM ledger")
    row = cursor.fetchone()
    total_volume = row[0] if row[0] is not None else 0.0
    
    cursor.execute("SELECT COUNT(*) FROM ledger WHERE anomaly_isolated = 1")
    threat_count = cursor.fetchone()[0]
    
    cursor.execute("""
        SELECT telemetry_id, timestamp, source_ip, auth_status, device_fingerprint, 
               waf_alert_level, payment_rail, clearing_network, transaction_type, amount, 
               sender_token, receiver_token, risk_score, anomaly_isolated 
        FROM ledger 
        ORDER BY timestamp DESC 
        LIMIT 50
    """)
    rows = cursor.fetchall()
    transactions = [dict(r) for r in rows]
    conn.close()
    
    return {
        "total_transactions": total_tx,
        "cumulative_volume": total_volume,
        "threat_isolation_count": threat_count,
        "transactions": transactions
    }

async def fetch_shap_metrics(transactions):
    ids = [tx["telemetry_id"] for tx in transactions]
    if not ids:
        return transactions
        
    try:
        res = await asyncio.to_thread(
            storage_mesh.es_client.mget,
            index="sugriva-security-index",
            ids=ids
        )
        docs = res.get("docs", [])
        shap_map = {}
        for doc in docs:
            if doc.get("found"):
                source = doc["_source"]
                attributions = source.get("analytics_mesh", {}).get("xai_attributions", {})
                shap_map[doc["_id"]] = attributions
                
        for tx in transactions:
            tx["xai_attributions"] = shap_map.get(tx["telemetry_id"], {})
    except Exception:
        for tx in transactions:
            if "xai_attributions" not in tx:
                try:
                    ip_val = sum(int(x) for x in tx["source_ip"].split('.') if x.isdigit()) % 255
                    auth_val = 1.0 if tx["auth_status"] == "SUCCESS" else 0.0
                    amount = float(tx["amount"])
                    features = [float(ip_val), auth_val, amount, 0.0]
                    tx["xai_attributions"] = analytics_mesh.compute_shap_values(features)
                except Exception:
                    tx["xai_attributions"] = {}
    return transactions

@app.get("/api/v1/analytics/dashboard")
async def get_dashboard():
    try:
        metrics = await asyncio.to_thread(get_dashboard_metrics, storage_mesh.db_path)
        metrics["transactions"] = await fetch_shap_metrics(metrics["transactions"])
        return {"status": "SUCCESS", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/analytics/alerts")
async def get_alerts():
    async def event_generator():
        try:
            while True:
                alert = await ALERT_QUEUE.get()
                yield f"data: {json.dumps(alert)}\n\n"
                ALERT_QUEUE.task_done()
        except asyncio.CancelledError:
            pass
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/v1/analytics/query")
async def query_analytics(query_data: dict):
    must_clauses = []
    
    if "ip_range" in query_data:
        must_clauses.append({"term": {"cyber_telemetry.source_ip": query_data["ip_range"]}})
        
    if "min_amount" in query_data or "max_amount" in query_data:
        amount_range = {}
        if "min_amount" in query_data:
            amount_range["gte"] = query_data["min_amount"]
        if "max_amount" in query_data:
            amount_range["lte"] = query_data["max_amount"]
        must_clauses.append({"range": {"financial_ledger.amount": amount_range}})
        
    if "start_time" in query_data or "end_time" in query_data:
        time_range = {}
        if "start_time" in query_data:
            time_range["gte"] = query_data["start_time"]
        if "end_time" in query_data:
            time_range["lte"] = query_data["end_time"]
        must_clauses.append({"range": {"timestamp": time_range}})
        
    if "device_fingerprint" in query_data:
        must_clauses.append({"term": {"cyber_telemetry.device_fingerprint": query_data["device_fingerprint"]}})
        
    if "filters" in query_data and isinstance(query_data["filters"], dict):
        for k, v in query_data["filters"].items():
            must_clauses.append({"match": {k: v}})
            
    query = {"query": {"bool": {"must": must_clauses}}} if must_clauses else {"query": {"match_all": {}}}
    
    try:
        res = await asyncio.to_thread(
            storage_mesh.es_client.search,
            index="sugriva-security-index",
            body=query
        )
        hits = res.get("hits", {}).get("hits", [])
        results = []
        for hit in hits:
            doc = hit["_source"]
            if "financial_ledger" in doc:
                doc["financial_ledger"].pop("sender_vpa_raw", None)
                doc["financial_ledger"].pop("receiver_vpa_raw", None)
            results.append(doc)
        return {"status": "SUCCESS", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("SYSTEM_PORT", 8000)), reload=False)
