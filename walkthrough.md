# Walkthrough: Sugriva Web UI Control Center & Framer Navigation Migration

This document details the technical execution of transitioning the Sugriva Terminal UI dashboard into a high-fidelity React Web UI with custom authentication gates.

---

## 1. Migration Execution Checklist

All steps are completed successfully:
- **[x] Step 1: Initialise Web Project (Vite + React + TS)**
  - Created modular workspace under `sugriva-web/`.
- **[x] Step 2: Install Framer Motion and setup style variables**
  - Configured high-contrast variables under `src/styles/variables.css` implementing the White/Orange/Green design guidelines.
- **[x] Step 3: Implement components and Framer Navbar integration**
  - Ported the modern Framer Navbar component layout containing a spinning QKD indicator, real-time command input console, and active role badges.
- **[x] Step 4: Port Python transaction simulator state engine to mock React store**
  - Rewrote the simulator loop, GNN calculations, sliding window rate-limiter, auto-freeze quarantine gates, and SHA-256 hash chains in TypeScript under `src/state/mockEngine.ts`.
- **[x] Step 5: Implement all tab workspaces**
  - Added switchable tabs for Telemetry, Security Mesh connection graphs, adaptive step-up compliance triggers, fuzzy database search queries, cryptographic generators, and SLA countdowns.
- **[x] Step 6: Create 3-Phase Multi-Factor Login Gateway**
  - **Phase 1: Credentials Gate:** ID and password login (`admin` / `adminpassword`).
  - **Phase 2: OTP Verification:** Dynamic 6-digit MFA code generation and check.
  - **Phase 3: SDK Integration Package Upload:** Interactive file uploader accepting a local `sugriva_sdk.json` file.
- **[x] Step 7: Verify and launch web server locally**
  - Production build compiled successfully with zero compiler errors.
  - Served web server on `http://localhost:3000/`.

---

## 2. Technical UI Design Details

### A. High-Contrast White & Orange Palette
* **Theme:** Flat, borders-focused layout on clean white surfaces (`#ffffff` / `#fcfcfc`).
* **Visual Anchors:** Safety Orange (`#ff6600`) borders highlight active input states, role tiers, active tabs, and quantum channels.
* **Positive Feedback:** Successful transactions and manually unfrozen account badges display safe neon green fonts (`#009933`) over a subtle green tint background (`#e6ffe6`).

### B. Framer Motion Animations
* **Quantum Radar:** Rotating QKD icon at 8s/spin representing dynamic channel stability checks.
* **Tab Selection:** Tabs transition smoothly using a sliding underline powered by Framer layout animations.
* **Loading and Alert Pulses:** Warning alerts and quarantine banners pulse in size (`scale: [1, 1.05, 1]`) during active containment blocks.

---

## 3. Verification SDK Package Details

A local verification signature configuration file `sugriva_sdk.json` has been placed in both the workspace root and the web public folder. The login gateway validates the schema format and cryptographic signatures:
```json
{
  "sdk_identifier": "SUGRIVA-PQC-SECURE-SDK-v2.0",
  "license_signature": "3045022100a1b2c3d4e5f60708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202200deadbeef",
  "hw_entropy_checksum": "a8f39b1a0d3f221415b8e90708010214a1e909a8bf02419aee981bf09b02cd4a",
  "status": "VERIFIED_COMPLIANT",
  "issuer": "Sugriva Security Operations Gate"
}
```
If successfully parsed, the gateway displays a confirmation checkmark and unlocks the full administrative control panel.

---

## 4. How to Test & Verify Security Features

### A. Testing the 3-Phase Multi-Factor Gateway
1. Navigate to **`http://localhost:3000/`**.
2. **Sign Up Test:** Click **"Sign Up"** at the bottom of the card. Register a custom ID (VPA) and hardware ID. Type a password and note the dynamic color-coded strength ratings (Weak -> Quantum Resistant). Click **"Compile Trust Profile"** to automatically download the profile signature JSON file.
3. **Phase 1 Test:** Toggle back to **"Log In"**, enter your registered ID and Password, and click **"Authenticate Credentials"**.
4. **Phase 2 Test:** Click the **"Autofill code"** shortcut link in the blue OTP challenge box, then click **"Verify OTP Code"**.
5. **Phase 3 Test:** Drag and drop the downloaded JSON license file (or select it via file explorer) into the upload area. The system will verify the signature matching parameters and unlock the dashboard.

### B. Testing the Developer Tools Inspect Blocker
1. Once on the Web UI, right-click anywhere on the screen. The context menu is intercepted and blocked.
2. Press **`F12`**, **`Ctrl+Shift+I`** (Inspect Elements), or **`Ctrl+Shift+J`** (Console panel). Key events are captured and cancelled at the root, blocking DevTools launch attempts.
3. Press **`Ctrl+U`** (View Page Source) or **`Ctrl+S`** (Save page payloads). The commands are blocked, preventing source code exposure.

### C. Verifying SQLite AES Field-Level Encryption
To verify that sensitive VPA, IP, and transaction amount fields are fully encrypted on disk:
1. Open a terminal and use Python to run a direct raw query on the SQLite database:
   ```bash
   python -c "import sqlite3; conn = sqlite3.connect('data/sugriva_ledger.db'); cursor = conn.cursor(); cursor.execute('SELECT amount, vpa, ip FROM tx_ledger LIMIT 5'); print(cursor.fetchall())"
   ```
2. **Result Check:** The printed rows will display values wrapped in `IV:Ciphertext` Base64 strings, proving that PII data is fully encrypted at rest on your disk.
3. Now run the query using Sugriva's secure driver helper, which registers the custom SQL decryption hook:
   ```bash
   python -c "import sys; sys.path.insert(0, 'tui_template'); import tui.widgets.sugriva.engine as e; conn = e.get_db_connection(); cursor = conn.cursor(); cursor.execute('SELECT decrypt(amount), decrypt(vpa), decrypt(ip) FROM tx_ledger LIMIT 5'); print(cursor.fetchall())"
   ```
4. **Result Check:** The fields will be printed in plaintext, verifying that dynamic SQL-level decryption is operating successfully on reads.

### D. Testing Risk Color Grading
1. Open the **Telemetry Log** tab in the main web dashboard.
2. Monitor incoming mock transactions:
   * Transactions with standard low-risk indicators (`risk < 0.50`) are rendered in clean **white**.
   * Transactions with warnings (`risk 0.50 - 0.75`) are highlighted with a **yellow** background tint.
   * Transaction anomalies with critical risk ratings (`risk >= 0.75`) are highlighted with a **red** background tint.
3. Click the attack simulation panels in the footer to inject critical threats (e.g. credential stuffing or demat liquidations) and watch the alerts color dynamically in real time.
