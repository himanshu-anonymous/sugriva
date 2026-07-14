import os
import sys
import socket
import subprocess
import signal
import time
from urllib.parse import urlparse

processes = []

def load_env():
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key, value = parts[0].strip(), parts[1].strip()
                        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
                            value = value[1:-1]
                        if key not in os.environ:
                            os.environ[key] = value

def check_connection(url_or_addr, default_port, name):
    target = url_or_addr
    if "://" not in target:
        target = "tcp://" + target
    try:
        parsed = urlparse(target)
        host = parsed.hostname or "localhost"
        port = parsed.port or default_port
        with socket.create_connection((host, port), timeout=5.0):
            return True
    except Exception as e:
        print(f"Health check failed for {name} ({url_or_addr}): {e}")
        return False

def terminate_processes():
    for p in processes:
        if p.poll() is None:
            p.terminate()
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()

def signal_handler(sig, frame):
    print("\n--- Shutting Down Sugriva Services ---")
    terminate_processes()
    sys.exit(0)

def main():
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    load_env()
    
    required_vars = [
        "KAFKA_BOOTSTRAP_SERVERS",
        "REDIS_URL",
        "SQLITE_DB_PATH",
        "ELASTICSEARCH_URL",
        "KAFKA_TOPIC",
        "SYSTEM_PORT"
    ]
    
    missing_vars = [var for var in required_vars if var not in os.environ]
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        sys.exit(1)
        
    db_path = os.environ["SQLITE_DB_PATH"]
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    print("Auditing dependency infrastructure connection interfaces...")
    
    infrastructure = [
        (os.environ["KAFKA_BOOTSTRAP_SERVERS"], 9092, "Apache Kafka"),
        (os.environ["REDIS_URL"], 6379, "Redis Cache"),
        (os.environ["ELASTICSEARCH_URL"], 9200, "Elasticsearch")
    ]
    
    for url, port, name in infrastructure:
        if not check_connection(url, port, name):
            print(f"Critical error: {name} is unreachable. Terminating launch.")
            sys.exit(1)
            
    print("Infrastructure verified. Invoking database seeder for 600K records...")
    
    try:
        subprocess.run([sys.executable, "tools/seed_database.py"], check=True)
        print("Database seeded successfully.")
    except Exception as e:
        print(f"Seeder failed: {e}. Attempting to boot services anyway.")
        
    print("Launching Sugriva FastAPI application core...")
    
    system_port = os.environ["SYSTEM_PORT"]
    
    try:
        fastapi_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", system_port],
            stdout=sys.stdout,
            stderr=sys.stderr
        )
        processes.append(fastapi_proc)
        
        print("FastAPI Service booted. Press Ctrl+C to shutdown.")
        
        while True:
            time.sleep(1)
            
    except Exception as e:
        print(f"Error occurred during service runtime: {e}")
        terminate_processes()
        sys.exit(1)

if __name__ == "__main__":
    main()
