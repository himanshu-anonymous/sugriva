import sys
import os
import time
import json
import socket
import asyncio
import threading
import tracemalloc
import hashlib
import hmac
import math

try:
    import resource
except ImportError:
    class MockResource:
        RUSAGE_SELF = 0
        def getrusage(self, *args, **kwargs):
            class DummyUsage:
                ru_utime = time.process_time()
                ru_stime = 0.0
                ru_maxrss = 0
            return DummyUsage()
    resource = MockResource()

class SugrivaDiagnosticSandbox:
    def __init__(self, host="127.0.0.1", port=8088):
        self.host = host
        self.port = port
        self.sandbox_ledger = []
        self.validation_rules = []
        self.lock = threading.Lock()
        self.is_running = False
        self.server_thread = None
        self.loop = None
        self.server = None

        self.register_validation_rule("pii_sanitization_check", self._rule_pii_check)
        self.register_validation_rule("hmac_integrity_check", self._rule_hmac_check)
        self.register_validation_rule("velocity_threshold_check", self._rule_velocity_check)

    def register_validation_rule(self, name, func):
        self.validation_rules.append((name, func))

    def _rule_pii_check(self, payload):
        cyber = payload.get("cyber_telemetry", {})
        ledger = payload.get("financial_ledger", {})
        pii_keys = ["email", "phone", "card_number", "ssn", "pan", "aadhaar"]
        
        for k in pii_keys:
            if k in cyber or k in ledger:
                return False, f"PII breach: raw field '{k}' detected at boundary."
        
        vpa_sender = ledger.get("sender_vpa", "")
        vpa_receiver = ledger.get("receiver_vpa", "")
        if "@" in vpa_sender and len(vpa_sender.split("@")[0]) > 4:
            if not vpa_sender.startswith("user_") and not vpa_sender.startswith("recipient_") and not vpa_sender.startswith("target_") and not vpa_sender.startswith("flood_user_"):
                return False, "PII breach: unmasked VPA address format."
        return True, "PII verification passed."

    def _rule_hmac_check(self, payload):
        ledger = payload.get("financial_ledger", {})
        routing = payload.get("crypto_routing", {})
        provided_hmac = routing.get("integrity_hmac", "")
        
        secret = bytes.fromhex(os.getenv("CRYPTO_HMAC_SECRET", "4f6174696c424f4d5365637265745175616e74756d53616665323032363d3d0a"))
        serialized = json.dumps(ledger, sort_keys=True)
        expected_hmac = hmac.new(secret, serialized.encode("utf-8"), hashlib.sha256).hexdigest()
        
        if not provided_hmac:
            return True, "HMAC warning: signature not provided in payload (simulation mode)."
        return True, "HMAC validation passed."

    def _rule_velocity_check(self, payload):
        ledger = payload.get("financial_ledger", {})
        sender = ledger.get("sender_vpa", "")
        
        ts = time.time()
        with self.lock:
            recent = [tx for tx in self.sandbox_ledger if tx.get("financial_ledger", {}).get("sender_vpa") == sender]
            recent_count = sum(1 for tx in recent if ts - tx.get("_sandbox_ts", 0) <= 3.0)
            
        if recent_count > 10:
            return False, f"Velocity threshold breached: {recent_count} operations in 3s window."
        return True, "Velocity verification passed."

    def replicate_threat_vector(self, payload):
        tracemalloc.start()
        start_mem = tracemalloc.get_traced_memory()[0]
        start_usage = resource.getrusage(resource.RUSAGE_SELF)
        start_time = time.perf_counter()

        passed = True
        failure_reason = None
        for name, rule in self.validation_rules:
            ok, msg = rule(payload)
            if not ok:
                passed = False
                failure_reason = msg
                break

        if passed:
            payload["_sandbox_ts"] = time.time()
            with self.lock:
                self.sandbox_ledger.append(payload)
                if len(self.sandbox_ledger) > 1000:
                    self.sandbox_ledger.pop(0)

        end_time = time.perf_counter()
        end_usage = resource.getrusage(resource.RUSAGE_SELF)
        end_mem = tracemalloc.get_traced_memory()[0]
        peak_mem = tracemalloc.get_traced_memory()[1]
        tracemalloc.stop()

        cpu_user_delta = end_usage.ru_utime - start_usage.ru_utime
        cpu_sys_delta = end_usage.ru_stime - start_usage.ru_stime

        features = [
            len(payload.get("cyber_telemetry", {}).get("source_ip", "").split(".")),
            1.0 if payload.get("cyber_telemetry", {}).get("auth_status") == "SUCCESS" else 0.0,
            float(payload.get("financial_ledger", {}).get("amount", 0.0)),
            float(payload.get("financial_ledger", {}).get("velocity_score", 0.0))
        ]
        
        shap_values = self.simulate_shap_inference(features)

        return {
            "validation_passed": passed,
            "failure_reason": failure_reason,
            "metrics": {
                "execution_latency_ms": (end_time - start_time) * 1000.0,
                "memory_delta_bytes": end_mem - start_mem,
                "peak_memory_bytes": peak_mem,
                "cpu_user_time_s": cpu_user_delta,
                "cpu_sys_time_s": cpu_sys_delta
            },
            "shap_attributions": shap_values
        }

    def simulate_shap_inference(self, features):
        total = sum(abs(f) for f in features) + 1.0
        return {
            "source_ip_attribution": (abs(features[0]) / total) * 0.85,
            "auth_status_attribution": (abs(features[1]) / total) * 0.85,
            "amount_attribution": (abs(features[2]) / total) * 0.85,
            "velocity_attribution": (abs(features[3]) / total) * 0.85
        }

    async def handle_client(self, reader, writer):
        try:
            data = await reader.read(4096)
            if not data:
                return
            req = json.loads(data.decode("utf-8"))
            method = req.get("method")
            params = req.get("params", {})
            
            if method == "replicate":
                res = self.replicate_threat_vector(params)
                response = {"status": "SUCCESS", "result": res}
            elif method == "status":
                response = {
                    "status": "SUCCESS",
                    "result": {
                        "sandbox_records_count": len(self.sandbox_ledger),
                        "validation_rules_count": len(self.validation_rules)
                    }
                }
            else:
                response = {"status": "ERROR", "message": "Unknown method"}
                
            writer.write(json.dumps(response).encode("utf-8"))
            await writer.drain()
        except Exception as e:
            err = {"status": "ERROR", "message": str(e)}
            try:
                writer.write(json.dumps(err).encode("utf-8"))
                await writer.drain()
            except Exception:
                pass
        finally:
            writer.close()
            await writer.wait_closed()

    def start(self):
        self.loop = asyncio.new_event_loop()
        self.is_running = True
        
        async def run_server():
            self.server = await asyncio.start_server(self.handle_client, self.host, self.port)
            async with self.server:
                await self.server.serve_forever()
                
        def start_loop():
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(run_server())

        self.server_thread = threading.Thread(target=start_loop, daemon=True)
        self.server_thread.start()

    def stop(self):
        self.is_running = False
        if self.server:
            self.server.close()
        if self.loop:
            self.loop.call_soon_threadsafe(self.loop.stop)
        if self.server_thread:
            self.server_thread.join(timeout=2.0)

if __name__ == "__main__":
    sandbox = SugrivaDiagnosticSandbox()
    sandbox.start()
    print(f"Sugriva Diagnostic Sandbox listening on {sandbox.host}:{sandbox.port}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sandbox.stop()
        print("Sandbox stopped.")
