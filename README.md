# Project Sugriva: Enterprise Cyber-Financial Threat Correlation & Mitigation Engine

Project Sugriva is a high-throughput cyber-financial threat detection, telemetry ingestion, and mitigation platform. It combines asynchronous streaming ingestion, advanced cryptographic filtering, graph-based topological correlation, and post-quantum safe layers to isolate risk in real time.

For an exhaustive guide detailing every function, data flow mapping, and complete technology specs, refer to the **[Enterprise Reference & Technical Specifications Manual](file:///c:/Users/Priyanshu%20Patil/Documents/program01/sugriva/SYSTEM_REFERENCE.md)** or read the comprehensive system manual in **[COMPREHENSIVE_GUIDE.md](file:///c:/Users/Priyanshu%20Patil/Documents/program01/sugriva/COMPREHENSIVE_GUIDE.md)**.

---

## 1. System Architecture & Telemetry Pipeline

```mermaid
flowchart TD
    A[Inbound Telemetry / Syslog / ISO 20022] --> B[FastAPI Gateway Router]
    B -->|PII Masking & Tokenization| C[Apache Kafka Buffer Queue]
    C -->|Asynchronous Batch Consuming| D[Pipeline Processing Worker]
    
    subgraph AI & Correlation Engine
        D -->|GNN Node Construction| E[Neo4j / NetworkX Parent-Node Bridge]
        E -->|Spatial-Temporal Convolution| F[STGNN Classifier]
        F -->|Explainable Weights| G[SHAP Kernel Explainer]
    end
    
    subgraph Security Isolation & Compliance Gates
        G -->|Dynamic Risk Score 0.0-1.0| H{Auth Orchestrator Router}
        H -->|<0.50| I[Inline Pass]
        H -->|0.50 - 0.75| J[SMS OTP Challenge]
        H -->|>=0.75| K[DigiLocker KYC Block & Isolation Sandbox]
    end
    
    D -->|Persistent Writes| L[(SQLite WAL Database)]
    D -->|Log Ingestion Index| M[Elasticsearch Cluster]
```

---

### 1.1. 3-Phase Multi-Factor Access Gateway

Sugriva enforces a strict multi-tier verification process for administrative terminal access:

```mermaid
flowchart TD
    Start[User Login Request] --> A[Phase 1: Credentials Check]
    A -->|Check adminAccounts ID & password| B{Valid Credentials?}
    B -->|No| B_Fail[Audit Denial Log & Lock Access]
    B -->|Yes| C[Phase 2: Dynamic OTP Generation]
    
    C -->|Deliver SMS MFA Code| D[User Enters OTP]
    D -->|Match generated code| E{Correct OTP?}
    E -->|No| E_Fail[Audit Denial Log & Lock Access]
    E -->|Yes| F[Phase 3: SDK Integration Package/Key Upload]
    
    F -->|Drag & Drop sugriva_sdk.json| G[Read & Parse Signature Claims]
    G -->|Verify SDK identifier & registered signature| H{Valid SDK Key?}
    H -->|No| H_Fail[Audit Denial Log & Lock Access]
    H -->|Yes| Success[Authorize Admin Access & Open Dashboard]
```

---

## 2. Hybrid Post-Quantum Cryptographic Gateway

Sugriva implements a forward-proof **Hybrid Key Encapsulation Mechanism (KEM) Gateway** to thward Harvest-Now-Decrypt-Later (HNDL) sweeps while retaining legacy performance compliance.

```mermaid
flowchart LR
    A[Incoming Request] --> B[HYBRID KEM GATEWAY]
    subgraph Double-Seal Encryption Wrapper
        B --> C[AES-256-GCM Classical Stream]
        B --> D[NIST ML-KEM-768 Kyber-Safe Encapsulation]
    end
    C --> E[Stateless SHA-256 Tokenization Gateway]
    D --> E
    E --> F[SHA-256 HMAC Verification]
    F --> G[(Durable SQLite Storage)]
```

---

### 2.1. SQLite Cryptographic Database Shielding

Sugriva implements field-level AES-CBC database encryption for sensitive transaction data fields (VPAs, IP addresses, transaction amounts) stored on disk, and decodes them dynamically during read queries:

```mermaid
flowchart TD
    subgraph Data Write Path - Encryption
        A[Incoming Transaction Record] --> B{Sensitive Field?}
        B -->|vpa / ip / amount| C[Derive Key: PBKDF2 Master Hash]
        C --> D[AES-CBC Encryption Wrapper]
        D -->|Base64 Encoded Ciphertext| E[(SQLite DB File on Disk)]
        B -->|rail / network / risk / escrow| E
    end
    
    subgraph Data Read Path - Decryption
        E --> F[Establish Connection: get_db_connection]
        F --> G[Register Hook: create_function decrypt]
        G --> H[SQL Query: SELECT decrypt vpa FROM tx_ledger]
        H --> I[Dynamic Decryption Node]
        I --> J[TUI / Web Console Dashboard Rendering]
    end
```

---

## 3. Dynamic Parent-Node GNN Correlation Mesh

To bridge unstructured cybersecurity network events (Splunk logs, EDR metrics, firewall logs) with transaction records (UPI, NEFT, RTGS) at low latency, the system uses a **Parent Intermediary Node** abstraction layer:

```mermaid
flowchart TD
    subgraph Cybersecurity Telemetry
        A[Firewall Log Node]
        B[Kerberos Auth Event Node]
    end
    subgraph Transaction Ledger
        C[UPI Transfer VPA Node]
        D[Sender IP Node]
    end
    A --> E[Unified Parent Intermediary Node]
    B --> E
    C --> E
    D --> E
    E -->|Graph Construction| F[PyTorch Geometric Spatial-Temporal GNN]
    F -->|Risk Classification| G[0.00 - 1.00 Clamped Risk Output]
```

---

## 4. Immutable Cryptographic Hashing Chain (Non-Repudiation)

Audit logs are cryptographically linked in a private chain structure. Tampering with any historical entry breaks the hash validation throughout the entire log history:

```mermaid
flowchart LR
    subgraph Audit Log Entry N-1
        A[Payload N-1] --> B[prev_hash: a8f2...]
        B --> C[curr_hash: 99c4...]
    end
    subgraph Audit Log Entry N
        D[Payload N] --> E[prev_hash: 99c4...]
        E --> F[curr_hash: 32da...]
    end
    C -->|SHA-256 Linked Pointer| E
```

---

## 5. Sliding Window Velocity Rate-Limiter

To defend core banking switches from distributed high-frequency transaction floods (DDoS simulations), Sugriva utilizes a Redis-backed sliding-window limit model:

```mermaid
gantt
    title 5-Second Sliding Rate Limiting Window (Max 3 Transactions)
    dateFormat  X
    axisFormat %s
    section Requests
    TX 1 (Allowed)   :active, 0, 1
    TX 2 (Allowed)   :active, 2, 3
    TX 3 (Allowed)   :active, 4, 5
    TX 4 (BLOCKED)   :crit, 4, 5
```

---

## 6. Core Modules & Functionalities

### 1. Ingestion Layer (`app/ingestion.py`)
*   **FastAPI Router:** Exposes `/api/v1/telemetry/process-raw` to receive telemetry payloads.
*   **Regex Normalizer:** Extracts core network and metadata fields from raw Syslog formatting.
*   **ISO 20022 XML Parser:** Parses structured financial transaction messages (NEFT/RTGS SFMS architectures).
*   **Buffer Ingestion:** Asynchronously writes normalized events to Apache Kafka using `aiokafka` with Gzip compression and a 10ms linger interval.

### 2. Cryptographic Security Gateway (`app/crypto.py`)
*   **PII Tokenization:** Salted SHA-256 tokenization to scrub PANs, VPAs, and client credentials.
*   **Encryption at Rest:** AES-256-GCM authenticated encryption/decryption routines for sensitive payload fields.
*   **Message Integrity:** SHA-256 HMAC verification pipeline ensuring zero-tampering.
*   **Post-Quantum Agility:** Dynamic agility wrappers wrapping classical algorithms with NIST-standardized Kyber/Dilithium.

### 3. Persistent Storage Layer (`app/storage.py`)
*   **SQLite Ledger:** Highly tuned SQLite layout configured with Write-Ahead Logging (WAL) and synchronous mode turned off.
*   **Redis Velocity Engine:** Utilizes Redis sorted sets (`ZADD` / `ZCOUNT`) to compute rolling 3-second transactional frequencies per user.
*   **Elasticsearch Security Index:** Indexes all parsed fields into `sugriva-security-index` for high-velocity query and analytic search capabilities.

### 4. Neural Analytics Mesh (`app/analytics.py`)
*   **In-Memory Graph Topology:** Maps network IP addresses, session tokens, and financial endpoints into `networkx` graphs linked via a central `BRIDGE-telemetry_id` node.
*   **Unsupervised Anomaly Isolation:** Employs a scikit-learn `IsolationForest` to act as a sandbox filter.
*   **Spatial-Temporal Graph Neural Network (STGNN):** PyTorch Geometric implementation using GCN layers to output risk scores.
*   **Explainable AI (XAI):** Linear SHAP kernel explainer resolving exact feature attribution weights.

---

## 7. Configuration Specifications

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

## 8. Running the MVP (Step-by-Step Instructions)

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

#### Step G: Run the Sugriva Textual TUI Template (Posting Integration)
To run the advanced Textual template mimicking Posting's aesthetic grid layout:
```powershell
cd C:\Users\Priyanshu Patil\Documents\antigravity\happy-carson\tui_template
& "C:\Users\Priyanshu Patil\Documents\program01\sugriva\venv\Scripts\python.exe" run_demo.py
```

---

## 9. Sugriva Textual TUI Console Commands

The advanced Textual dashboard (`tui_template/run_demo.py`) features the following built-in console commands on the main input line:

| Command | Action / Description | Example |
| :--- | :--- | :--- |
| `help` | Outputs console command definitions menu. | `help` |
| `login admin <password>` | Secure PBKDF2-HMAC authentication to switch to ADMIN. (Pwd: `adminpassword`). | `login admin adminpassword` |
| `login analyst` | Transitions role permissions back to ANALYST (view-only mode). | `login analyst` |
| `fetch <vpa>` | Queries SQLite ledger history for VPA node. | `fetch user_1120@bank` |
| `breaker [trip/reset]` | Trip OPEN or reset CLOSED the security circuit breaker (ADMIN). | `breaker trip` |
| `set threshold <float>` | Updates GNN risk score containment threshold (ADMIN). | `set threshold 0.80` |
| `Ctrl+1` / `Ctrl+2` / `Ctrl+3` | Shortcut keys to inject stuffing (`1`), G-Sec liquidation (`2`), or transaction floods (`3`) (ADMIN). | (Press keys) |
| `Ctrl+4` | Shortcut key to inject **Quantum Attack** (coherence collapse & entropy drain) (ADMIN). | (Press keys) |

---

## 10. Web-Based Sugriva Control Center (`sugriva-web/`)

Sugriva incorporates a high-fidelity, flat-design Web UI mapping all TUI features into a premium browser-based interface.

### Technical Web Stack
* **Framework:** React + Vite + TypeScript
* **Animations:** Framer Motion (for fluid tab-swapping and spinning QKD quantum indicators)
* **Styling:** Vanilla CSS (no Tailwind, no gradients; absolute flat high-contrast design)
* **Branding Font:** Orbitron (Google Fonts)

### High-Contrast Visual Design
* **Primary Contrast:** White backdrop (`#ffffff`/`#fcfcfc`) bounded by clean gray dividers, utilizing Safety Orange (`#ff6600`) for active tabs, input borders, and badge outlines.
* **Positive Feedback Tints:** Verified clear transactions and manual overrides render in a deep green font (`#009933`) over a light green tint background panel (`#e6ffe6`).
* **Active Mule Indicators:** Suspected mule accounts isolated by GNN node correlation render in magenta (`#cc00cc`) over soft background tint (`#ffe6ff`).

### Core Interactive Workspaces
1. **Telemetry Log:** Real-time filtered payments grid.
2. **Security Mesh:** Animated SVG connections detailing `Account VPA -> [BRIDGE] -> IP`.
3. **Auth steps:** RBI-compliant compliance gateways (Inline vs SMS OTP vs DigiLocker KYC).
4. **Database Search:** Fuzzy accounts registry with one-click administrative unfreeze override triggers.
5. **Crypto logs:** Stateless SHA-256 tokens, HMAC integrity validations, and AES-256 ciphers.
6. **Quantum guard:** Active coherence metrics, hardware TRNG entropy bits, and ML-KEM/ML-DSA speed.
7. **Audits & Incidents:** Verifiable SHA-256 chained audit logs and CERT-In 6-Hour SLA countdown timers.

### Web Console Commands
Type commands directly in the navbar terminal input line:
* `login admin adminpassword` — Elevates active role to ADMIN.
* `login analyst` — Downgrades active role to ANALYST.
* `logout` — Resets administrative credentials back to read-only tier.
* `unfreeze <vpa>` — Override quarantine locks on frozen account nodes (ADMIN).
* `breaker [trip/reset]` — Toggle security circuit breaker fail-closed gates (ADMIN).
* `set threshold <float>` — Alter GNN isolation limit on the fly (ADMIN).

### Running the Web Application
Navigate to the web project subdirectory, install dependencies, and launch Vite dev:
```bash
cd sugriva-web
npm install
npm run dev
```
Open **[http://localhost:3000/](http://localhost:3000/)** in your browser.
Trigger attack injections using the footer click panels or press keyboard shortcuts (`Ctrl+1` through `Ctrl+4`).
