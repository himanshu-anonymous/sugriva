import asyncio
import time
import random
import uuid
import sys
import signal
import httpx

dispatched = 0
successes = 0
failures = 0
latencies = []

INGESTION_URL = "http://localhost:8000/api/v1/telemetry/process-raw"

async def send_payload(client, payload):
    global dispatched, successes, failures, latencies
    start_time = time.time()
    dispatched += 1
    try:
        resp = await client.post(INGESTION_URL, json=payload, timeout=2.0)
        latency = (time.time() - start_time) * 1000
        latencies.append(latency)
        if resp.status_code == 200:
            res_json = resp.json()
            if res_json.get("status") == "SUCCESS":
                successes += 1
            else:
                failures += 1
        else:
            failures += 1
    except Exception:
        failures += 1

async def generate_batch(client):
    standard_ips = [f"192.168.1.{i}" for i in range(10, 200)]
    standard_agents = ["mac-safari", "win-chrome", "android-app"]
    rails = ["NEFT", "RTGS", "UPI", "VISA", "MASTERCARD", "PAYPAL"]
    clearing = ["RBI", "NPCI", "VISA-NET", "MC-NET", "PAYPAL-NET"]
    
    tasks = []
    for _ in range(25):
        trigger = random.random()
        if trigger < 0.05:
            target_account = f"victim_{random.randint(1,100)}@bank"
            attacker_ip = f"{random.randint(20,200)}.{random.randint(10,250)}.{random.randint(1,250)}.{random.randint(1,254)}"
            fp = f"attacker-agent-{random.randint(1,10)}"
            for _ in range(5):
                tasks.append(send_payload(client, {
                    "syslog": f"src={attacker_ip} status=FAILED fp={fp} waf=NONE",
                    "telemetry_id": f"SCEN-A-{uuid.uuid4().hex[:8]}"
                }))
            tasks.append(send_payload(client, {
                "syslog": f"src={attacker_ip} status=SUCCESS fp={fp} waf=NONE",
                "telemetry_id": f"SCEN-A-{uuid.uuid4().hex[:8]}"
            }))
            tasks.append(send_payload(client, {
                "telemetry_id": f"SCEN-A-TX-{uuid.uuid4().hex[:8]}",
                "cyber_telemetry": {
                    "source_ip": attacker_ip,
                    "auth_status": "SUCCESS",
                    "device_fingerprint": fp,
                    "waf_alert_level": "NONE"
                },
                "financial_ledger": {
                    "payment_rail": "RTGS",
                    "clearing_network": "RBI-SFMS",
                    "transaction_type": "GSEC-LIQUIDATION",
                    "amount": 990000.00,
                    "sender_vpa": target_account,
                    "receiver_vpa": f"mule_{random.randint(1,10)}@attacker"
                }
            }))
        elif trigger < 0.10:
            admin_ip = "192.168.1.100"
            admin_fp = "authorized-admin-terminal"
            tasks.append(send_payload(client, {
                "syslog": f"src={admin_ip} status=SUCCESS fp={admin_fp} waf=HIGH",
                "telemetry_id": f"SCEN-B-{uuid.uuid4().hex[:8]}"
            }))
            xml_payload = f"""<Document>
  <TxTp>TRADE-FINANCE-LOC</TxTp>
  <Amt>850000.00</Amt>
  <Dbtr>importer-corp@bank</Dbtr>
  <Cdtr>shell-exporter@unverified</Cdtr>
  <Rail>NEFT</Rail>
  <Netw>RBI-SFMS</Netw>
</Document>"""
            tasks.append(send_payload(client, {
                "xml": xml_payload,
                "telemetry_id": f"SCEN-B-XML-{uuid.uuid4().hex[:8]}"
            }))
        else:
            payload = {
                "telemetry_id": f"BASE-{uuid.uuid4().hex[:8]}",
                "cyber_telemetry": {
                    "source_ip": random.choice(standard_ips),
                    "auth_status": "SUCCESS",
                    "device_fingerprint": random.choice(standard_agents),
                    "waf_alert_level": "NONE"
                },
                "financial_ledger": {
                    "payment_rail": random.choice(rails),
                    "clearing_network": random.choice(clearing),
                    "transaction_type": "RETAIL",
                    "amount": round(random.uniform(10.0, 5000.0), 2),
                    "sender_vpa": f"user{random.randint(1,1000)}@bank",
                    "receiver_vpa": f"merchant{random.randint(1,500)}@bank"
                }
            }
            tasks.append(send_payload(client, payload))
            
    await asyncio.gather(*tasks)

async def worker():
    limits = httpx.Limits(max_keepalive_connections=100, max_connections=500)
    async with httpx.AsyncClient(limits=limits) as client:
        while True:
            await generate_batch(client)
            await asyncio.sleep(0.01)

def signal_handler(sig, frame):
    print("\n--- Shutting Down Stream Simulation ---")
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    print(f"Total Payloads Dispatched: {dispatched}")
    print(f"Successful Ingestions:     {successes}")
    print(f"Failed Ingestions:         {failures}")
    print(f"Average Latency:           {avg_latency:.2f} ms")
    sys.exit(0)

async def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("Starting Sugriva Scaled Stress-Testing Simulator...")
    print("Press Ctrl+C to stop and dump performance metrics.")
    await worker()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
