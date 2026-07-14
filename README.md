# Project Sugriva: Enterprise MVP Architecture

Project Sugriva is a high-throughput cyber-financial threat detection and telemetry ingestion platform. It combines asynchronous streaming ingestion, advanced cryptographic filtering, graph-based topological correlation, and machine learning classifiers to isolate risk in real time.

## System Architecture Overview

```
                        [ Ingestion Surface ]
                (FastAPI: Syslog / ISO 20022 XML / JSON)
                                  |
                                  v
                           [ Apache Kafka ]
                      (sugriva-raw-telemetry)
                                  |
                                  v
                         [ Pipeline Worker ]
                  - Tokenization & Cryptography (AES/HMAC)
                  - Velocity Tracking (Redis ZADD/ZCOUNT)
                  - GNN Risk Scoring & SHAP Explainer
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
    [ SQLite Database ]                       [ Elasticsearch ]
 (WAL Mode Persistence)                  (Security Event Index)
            |                                           |
            +---------------------+---------------------+
                                  |
                                  v
                    [ Sugriva Diagnostic Sandbox ]
                       [ Authentication Core ]
                                  |
                                  v
                   [ Enterprise Rearchitecture Grid ]
```

## Core Modules & Functionalities

### 1. Ingestion Layer (`app/ingestion.py`)
*   **FastAPI Router:** Exposes `/api/v1/telemetry/process-raw` to receive telemetry payloads.
*   **Regex Normalizer:** Extracts core network and metadata fields from raw Syslog formatting.
*   **ISO 20022 XML Parser:** Parses structured financial transaction messages (NEFT/RTGS SFMS architectures).
*   **Buffer Ingestion:** Asynchronously writes normalized events to Apache Kafka using `aiokafka` with Gzip compression and a 10ms linger interval.

### 2. Cryptographic Security Gateway (`app/crypto.py`)
*   **PII Tokenization:** Stateless, deterministic SHA-256 tokenization using system salts to sanitize card PANs, virtual payment addresses (VPAs), and account numbers before persistence.
*   **Encryption at Rest:** AES-256-GCM authenticated encryption/decryption routines for sensitive payload fields.
*   **Message Integrity:** SHA-256 HMAC verification pipeline ensuring zero-tampering during message transmission.
*   **Post-Quantum Agility:** Agility wrappers simulating NIST ML-KEM-768 key encapsulation and ML-DSA signature routines. Resolves to dynamic `getattr` fallback block when local cryptography bindings do not natively support finalized NIST algorithms.

### 3. Persistent Storage Layer (`app/storage.py`)
*   **SQLite Ledger:** Highly tuned SQLite layout configured with Write-Ahead Logging (WAL), synchronous mode turned off, and a 64MB cache pool. Built-in composite indexing on `timestamp` and `sender_token`.
*   **Redis Velocity Engine:** Utilizes Redis sorted sets (`ZADD` / `ZCOUNT`) to compute rolling 3-second transactional frequencies per user.
*   **Elasticsearch Security Index:** Indexes all parsed fields into `sugriva-security-index` for high-velocity query and analytic search capabilities.

### 4. Neural Analytics Mesh (`app/analytics.py`)
*   **In-Memory Graph Topology:** Maps network IP addresses, session tokens, and financial endpoints into `networkx` graphs linked via a central `BRIDGE-telemetry_id` node.
*   **Unsupervised Anomaly Isolation:** Employs a scikit-learn `IsolationForest` (100 estimators, all CPUs) to act as a sandbox filter.
*   **Spatial-Temporal Graph Neural Network (STGNN):** PyTorch and PyTorch Geometric implementation using GCN layers to output risk scores clamped between `0.00` and `1.00`.
*   **Explainable AI (XAI):** Linear SHAP kernel explainer resolving exact feature attribution weights for administrative dashboard logging.

### 5. Orchestrator and Worker Loop (`main.py` & `app/api_surface.py`)
*   **Asynchronous Background Worker:** Spawns a non-blocking `aiokafka` consumer parsing batches of up to 1000 records.
*   **Telemetry Processing:** Coordinates tokenization, Redis updates, HMAC signing, GNN/Forest inference, and storage pipeline execution.
*   **Real-time Alerts SSE:** Exposes `/api/v1/analytics/alerts` using Server-Sent Events (SSE) to stream alerts exceeding a `0.75` risk threshold from an internal 5,000 capacity queue.
*   **Dashboard Surface:** API endpoints `/api/v1/analytics/dashboard` and `/api/v1/analytics/query` querying SQLite metrics and Elasticsearch data.

### 6. Dynamic Authentication & Identity Orchestrator (`app/auth_orchestrator.py`)
*   **Transaction-Linked 2FA/TOTP:** Generates dynamic, non-reusable time-based codes cryptographically hashed with specific transaction parameters (amount, receiver, time) complying with RBI mandates.
*   **Risk-Based Adaptive Step-Up:** Dynamically routes verification levels:
    - *Low-to-Medium Risk (<0.50):* Approves inline.
    - *Elevated Risk (0.50 - 0.75):* Enforces a transaction-bound SMS OTP check.
    - *High Risk (>=0.75):* Forces biometric/cryptographic verification via DigiLocker.
*   **Sandboxed DigiLocker Pass-Through:** Integrates asynchronously with the DigiLocker Setu Sandbox APIs (`/kyc/digilocker`), maintaining volatile, memory-only identity document streaming in compliance with the DPDP Act 2023.

### 7. Diagnostic Threat Replication Sandbox (`tools/sugriva_diagnostic_sandbox.py`)
*   **Sandboxed Threat Replication Harness:** Replicates credential stuffing, insider liquidation, and velocity flood payloads in a volatile, air-gapped container context before committing to the primary database.
*   **High-Precision Resource Profiler:** Integrates `tracemalloc` and platform-aware `resource` tracking to output exact memory allocation deltas, peak memory usage, and user/system CPU processing latency during active neural analytics convolution passes.
*   **IPC Communication Bus:** Exposes a localhost TCP JSON-RPC endpoint to pipe telemetry metrics directly into standard console views.

### 8. Enterprise Rearchitecture Grid (`app/enterprise_rearchitecture.py`)
*   **Decoupled Async Inference Worker Pool:** Decouples GNN forward pass and SHAP computation from the primary streaming thread via an asynchronous queues processing system (`InferenceWorkerPool`).
*   **Distributed Graph Database Connector:** Replaces the single-threaded in-memory NetworkX canvas with a thread-safe, distributed Neo4j/Memgraph driver using bolt connection protocol (`Neo4jGraphConnector`).
*   **Circuit Breaker & Redis State Manager:** Protects outbound third-party KYC calls (DigiLocker Sandbox) using a fault-tolerant Circuit Breaker pattern. Restores auth states post-network dropout via Redis TTL keys (300 seconds).
*   **Dynamic Vault Tokenization:** Uses dynamic rotation wheels to derive salted keys combining the system secret, clearing networks (e.g., UPI, Visa, PayPal), and index matrices to secure PII.

### 9. Interactive Curses Dashboard Terminal UI (`tools/sugriva_terminal_ui.py`)
An interactive, multi-pane terminal dashboard to monitor system security operations and ingest telemetry in real-time.
*   **Telemetry Stream (Top-Left):** Visualizes live ingestion across UPI, NEFT, and RTGS rails.
*   **Ledger Surface (Bottom-Left):** Displays VPA-specific accounts velocity, IP coordinates, and rails.
*   **Threat Isolation Sandbox (Top-Right):** Automatically streams real-time alerts using a client subscription to the backend server's `/api/v1/analytics/alerts` SSE stream.
*   **Diagnostics & SHAP XAI (Middle-Right):** Displays SHAP attribution weights during inspection, or live database and network infrastructure diagnostic statuses when idle.
*   **Analyst Command Console (Bottom):** Allows running commands to interact with the system on the fly.

---

## Configuration Specifications

Backing configuration parameters are read dynamically via environment variables:

| Environment Variable | Default Value | Description |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Broker address |
| `REDIS_URL` | `redis://localhost:6379/0` | Key-value store endpoint |
| `SQLITE_DB_PATH` | `./data/sugriva_vault.db` | Persistence database location |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Analytics search server endpoint |
| `CRYPTO_HMAC_SECRET` | *(HMAC hex)* | Signature validation key |
| `TOKEN_SALT` | `SUGRIVA_SALT_2026` | Tokenization salt |
| `KAFKA_TOPIC` | `sugriva-raw-telemetry` | Destination stream queue |
| `SYSTEM_PORT` | `8000` | FastAPI server listener port |

---

## Running the MVP (Step-by-Step Instructions)

### 1. Prerequisites
*   Docker and Docker Compose
*   Python 3.10+

### 2. Startup Boot Sequence

#### Step A: Fire up the Infrastructure Containers
Start the required backing services (Kafka, Redis, Elasticsearch):
```bash
docker-compose up -d
```

#### Step B: Set Up and Activate the Virtual Environment
Create your Python virtual environment and activate it:

*   **Linux / macOS:**
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
*   **Windows (PowerShell):**
    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```

#### Step C: Install Dependencies
Install all requirements:
```bash
pip install -r requirements.txt
```

#### Step D: Run the Orchestration Core
Launch the main backend orchestrator which automatically runs fast-seeding (50,000 records, completes in ~4 seconds) and spins up FastAPI:
```bash
python run_mvp.py
```

#### Step E: Start the Stream Traffic Simulator (Optional)
To generate continuous live transaction streams and spoof credential stuffing or liquidations, open another terminal window and run:
```bash
python tools/simulate_streams.py
```

#### Step F: Run the Live Terminal UI Dashboard
Open a new terminal window, activate the virtual environment, and launch the interactive dashboard:
```bash
python tools/sugriva_terminal_ui.py
```

---

## Analyst Console Command Sheet

When running the **Terminal UI Dashboard** (`tools/sugriva_terminal_ui.py`), the bottom command line console accepts the following interactive instructions:

| Command | Action | Example |
|---|---|---|
| `help` | Shows command menu and guide | (Displays menu in the right pane when idle) |
| `diagnose` / `status` | Runs dynamic health checks on SQLite, Redis, Elasticsearch, and the API server, as well as the new Neo4j, InferencePool, and Circuit Breaker components | `diagnose` |
| `fetch <vpa>` | Inspects telemetry history, risk score, and SHAP XAI metrics for a specific sender VPA | `fetch user_2984@bank` |
| `tokenise <vpa> <net>` | Tests dynamic vault tokenization for a VPA on a specific clearing network (e.g. NPCI, VISA-NET) | `tokenise test@bank NPCI` |
| `breaker [trip/reset]` | Manually trips (sets to OPEN) or resets (sets to CLOSED) the mock DigiLocker sandbox circuit breaker | `breaker trip` |
| `inject <vpa> <amount> <ip> [SUCCESS/FAILED]` | Spoof/injects a custom transaction into the telemetry pipeline | `inject attacker@bank 850000 10.0.0.1 FAILED` |
| `set threshold <float>` | Updates the dynamic risk threshold on the fly for coloring logs and isolation trigger | `set threshold 0.65` |
| `clear` | Wipes current visual log buffers in the UI | `clear` |
| `exit` | Gracefully closes the dashboard wrapper | `exit` |
| `1` / `2` / `3` | Shortcut keys: Press to inject predefined credential stuffing (`1`), treasury liquidation (`2`), or velocity flood (`3`) spoof attacks | (Press single key `1` in the terminal) |

