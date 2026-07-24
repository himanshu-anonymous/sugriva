# Copyright (c) 2026 Himanshu Patil. All rights reserved.
# Author / Developer: Himanshu Patil

import json
import re
import xml.etree.ElementTree as ET
import os
import datetime
from fastapi import APIRouter, HTTPException, Depends
from aiokafka import AIOKafkaProducer
from app.models import CyberTelemetry, FinancialLedger, CryptoRouting, AnalyticsMesh, SugrivaPayload

router = APIRouter(prefix="/api/v1/telemetry")

async def get_kafka_producer():
    producer = AIOKafkaProducer(
        bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
        compression_type="gzip",
        linger_ms=10,
        max_request_size=5242880
    )
    await producer.start()
    try:
        yield producer
    finally:
        await producer.stop()

def parse_syslog(raw_syslog: str) -> dict:
    match = re.search(r"src=(?P<ip>\S+)\s+status=(?P<status>\S+)\s+fp=(?P<fp>\S+)\s+waf=(?P<waf>\S+)", raw_syslog)
    if not match:
        raise ValueError("Invalid Syslog structure")
    return {
        "source_ip": match.group("ip"),
        "auth_status": match.group("status"),
        "device_fingerprint": match.group("fp"),
        "waf_alert_level": match.group("waf")
    }

def parse_iso20022(raw_xml: str) -> dict:
    try:
        root = ET.fromstring(raw_xml)
        tx_type = root.find(".//TxTp").text if root.find(".//TxTp") is not None else "UNKNOWN"
        amount = float(root.find(".//Amt").text) if root.find(".//Amt") is not None else 0.0
        dbtr = root.find(".//Dbtr").text if root.find(".//Dbtr") is not None else "UNKNOWN"
        cdtr = root.find(".//Cdtr").text if root.find(".//Cdtr") is not None else "UNKNOWN"
        rail = root.find(".//Rail").text if root.find(".//Rail") is not None else "RTGS"
        network = root.find(".//Netw").text if root.find(".//Netw") is not None else "SFMS"
        return {
            "payment_rail": rail,
            "clearing_network": network,
            "transaction_type": tx_type,
            "amount": amount,
            "sender_vpa": dbtr,
            "receiver_vpa": cdtr
        }
    except Exception:
        raise ValueError("Invalid ISO 20022 XML layer")

@router.post("/process-raw")
async def process_raw_ingestion(payload: dict, producer: AIOKafkaProducer = Depends(get_kafka_producer)):
    try:
        if "syslog" in payload:
            cyber_data = parse_syslog(payload["syslog"])
            financial_data = {
                "payment_rail": "NONE",
                "clearing_network": "NONE",
                "transaction_type": "NONE",
                "amount": 0.0,
                "sender_vpa": "SYSTEM",
                "receiver_vpa": "SYSTEM"
            }
        elif "xml" in payload:
            cyber_data = {"source_ip": "0.0.0.0", "auth_status": "UNKNOWN", "device_fingerprint": "UNKNOWN", "waf_alert_level": "NONE"}
            financial_data = parse_iso20022(payload["xml"])
        else:
            cyber_data = payload["cyber_telemetry"]
            financial_data = payload["financial_ledger"]

        structured_object = SugrivaPayload(
            telemetry_id=payload.get("telemetry_id", "SUGRIVA-GENERIC"),
            timestamp=datetime.datetime.utcnow(),
            cyber_telemetry=CyberTelemetry(**cyber_data),
            financial_ledger=FinancialLedger(**financial_data),
            crypto_routing=CryptoRouting(integrity_hmac=""),
            analytics_mesh=AnalyticsMesh()
        )
        
        await producer.send_and_wait(
            os.getenv("KAFKA_TOPIC", "sugriva-raw-telemetry"),
            json.dumps(structured_object.dict(), default=str).encode("utf-8")
        )
        return {"status": "SUCCESS", "telemetry_id": structured_object.telemetry_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
