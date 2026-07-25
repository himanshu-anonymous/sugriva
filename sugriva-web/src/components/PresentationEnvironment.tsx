import React from "react";
import { useStore } from "../state/StoreContext";
import { motion } from "framer-motion";
import {
  PlayCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Key,
  Database,
  Lock,
  FileCheck,
  Send,
  UserCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText
} from "lucide-react";

export const PresentationEnvironment: React.FC = () => {
  const {
    records,
    setIsPresentationMode,
    presentationStep,
    setPresentationStep,
    selectedDemoTxId,
    setSelectedDemoTxId,
    executeManualAudit,
    dispatchOperationalReport,
    dispatchRegulatoryReport
  } = useStore();

  // Find selected transaction or pick first flagged/high-risk transaction
  const flaggedRecords = records.filter(r => r.flagged || r.risk >= 0.5);
  const activeTx = records.find(r => r.id === selectedDemoTxId) || flaggedRecords[0] || records[0];

  const steps = [
    { num: 1, title: "1. Monitoring & Flagged Ingestion", icon: ShieldAlert },
    { num: 2, title: "2. Zero-Trust Auth Status", icon: Key },
    { num: 3, title: "3. Database Effect & ACID Log", icon: Database },
    { num: 4, title: "4. Cryptographic Parameter Inspection", icon: Lock },
    { num: 5, title: "5. Immutable WORM Audit Entry", icon: FileCheck },
    { num: 6, title: "6. Dual-Channel Reporting Dispatch", icon: Send },
  ];

  if (!activeTx) {
    return (
      <div className="presentation-container">
        <div className="presentation-header">
          <h3>PRESENTATION & INTERACTIVE SIMULATION ENVIRONMENT</h3>
          <button className="close-btn" onClick={() => setIsPresentationMode(false)}>
            <XCircle size={16} /> Exit Presentation Mode
          </button>
        </div>
        <div className="empty-presentation">No transactions available for demonstration.</div>
      </div>
    );
  }

  return (
    <div className="presentation-overlay">
      <div className="presentation-card">
        {/* Top Control Bar */}
        <div className="presentation-top-bar">
          <div className="bar-title">
            <PlayCircle size={18} className="demo-icon" />
            <div>
              <h2>PRESENTATION ENVIRONMENT SIMULATION</h2>
              <span className="demo-sub">Interactive End-to-End Faulty Flagged Transaction Walkthrough</span>
            </div>
          </div>

          <div className="bar-actions">
            <span className="cmd-badge">CMD: PRESENTATION_MODE_ON</span>
            <button className="close-btn" onClick={() => setIsPresentationMode(false)}>
              <XCircle size={14} /> Exit Simulation
            </button>
          </div>
        </div>

        {/* Flagged Transaction Selector Dropdown */}
        <div className="tx-selector-row">
          <label className="selector-label">SELECT FLAGGED DEMO TRANSACTION:</label>
          <select
            value={activeTx.id}
            onChange={(e) => setSelectedDemoTxId(e.target.value)}
            className="tx-select"
          >
            {records.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} | {r.vpa} | ₹{r.amount.toLocaleString()} | Risk: {r.risk.toFixed(4)} | {r.flagType} {r.flagged ? "🔴 [FLAGGED]" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Stepper Navigation Ribbon */}
        <div className="stepper-ribbon">
          {steps.map(s => {
            const Icon = s.icon;
            const isActive = presentationStep === s.num;
            return (
              <button
                key={s.num}
                onClick={() => setPresentationStep(s.num)}
                className={`step-btn ${isActive ? "step-active" : ""}`}
              >
                <Icon size={14} />
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content Workspace */}
        <div className="step-workspace">
          {/* STEP 1: MONITORING & FLAGGED INGESTION */}
          {presentationStep === 1 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <ShieldAlert size={16} />
                <span>STEP 1: ANOMALOUS TELEMETRY INGESTION & EXPLICIT REASON FOR FLAGGING</span>
              </div>

              <div className="details-grid-2">
                <div className="info-box border-red">
                  <h4>FLAGGED TRANSACTION SUMMARY</h4>
                  <div className="field-row"><span>TRANSACTION ID:</span> <strong>{activeTx.id}</strong></div>
                  <div className="field-row"><span>VPA TARGET NODE:</span> <strong className="font-mono">{activeTx.vpa}</strong></div>
                  <div className="field-row"><span>AMOUNT (INR):</span> <strong>₹{activeTx.amount.toLocaleString()}</strong></div>
                  <div className="field-row"><span>PAYMENT RAIL:</span> <strong>{activeTx.rail} ({activeTx.network})</strong></div>
                  <div className="field-row"><span>ORIGIN IP:</span> <strong>{activeTx.ip}</strong></div>
                  <div className="field-row"><span>TIMESTAMP:</span> <strong>{activeTx.timestamp}</strong></div>
                  <div className="field-row"><span>ESCROW STATE:</span> <span className="error-badge">{activeTx.escrow}</span></div>
                </div>

                <div className="info-box border-orange">
                  <h4>EXPLICIT REASON FOR FLAGGING & THREAT CAUSE</h4>
                  <div className="reason-highlight-box">
                    <AlertTriangle size={18} className="warn-icon" />
                    <div>
                      <div className="flag-type-title">{activeTx.flagType}</div>
                      <p className="flag-reason-text">{activeTx.flagReason}</p>
                    </div>
                  </div>

                  <div className="field-row"><span>RISK INDEX SCORE:</span> <strong className="color-error">{activeTx.risk.toFixed(6)}</strong></div>
                  <div className="field-row"><span>MITRE ATT&CK TACTICS:</span> <strong>{activeTx.mitreTactics.join(", ")}</strong></div>
                  <div className="field-row"><span>MANUAL AUDIT STATUS:</span> <span className="warning-badge">{activeTx.manualAuditStatus}</span></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: ZERO-TRUST AUTH STATUS */}
          {presentationStep === 2 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <Key size={16} />
                <span>STEP 2: ZERO-TRUST AUTHENTICATION & IDENTITY ENCLAVE MONITOR</span>
              </div>

              <div className="details-grid-3">
                <div className="info-card">
                  <h5>JWT TOKEN VALIDITY</h5>
                  <div className={`status-large ${activeTx.authDetails.tokenStatus === "VALID" ? "color-success" : "color-error"}`}>
                    {activeTx.authDetails.tokenStatus}
                  </div>
                  <p>Decoded RS256/Dilithium3 token header verification status.</p>
                </div>

                <div className="info-card">
                  <h5>MFA CHALLENGE RESPONSE</h5>
                  <div className={`status-large ${activeTx.authDetails.mfaChallenge === "PASSED" ? "color-success" : "color-warning"}`}>
                    {activeTx.authDetails.mfaChallenge}
                  </div>
                  <p>Step-up Biometric / Out-of-band OTP verification evaluation.</p>
                </div>

                <div className="info-card">
                  <h5>ZERO-TRUST SCORE & DECISION</h5>
                  <div className="status-large color-primary">
                    {(activeTx.authDetails.zeroTrustScore * 100).toFixed(1)}% ({activeTx.authDetails.authDecision})
                  </div>
                  <p>Adaptive contextual access score computed by enclave.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DATABASE EFFECT & DB STATUS */}
          {presentationStep === 3 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <Database size={16} />
                <span>STEP 3: DATABASE EFFECT, ACID LOG & QUARANTINE ISOLATION STATUS</span>
              </div>

              <div className="details-grid-2">
                <div className="info-box border-blue">
                  <h4>ACID TRANSACTION LOG STATE</h4>
                  <div className="field-row"><span>ACID TX HANDLE:</span> <strong className="font-mono">{activeTx.dbStatus.acidTxId}</strong></div>
                  <div className="field-row"><span>TABLE MUTATION STATE:</span> <span className="warning-badge">{activeTx.dbStatus.tableState}</span></div>
                  <div className="field-row"><span>COMMIT LATENCY:</span> <strong>{activeTx.dbStatus.latencyMs} ms</strong></div>
                  <div className="field-row"><span>ROLLBACK TRIGGERED:</span> <strong>{activeTx.dbStatus.rollbackTriggered ? "YES (ACID ROLLED BACK)" : "NO (QUARANTINED)"}</strong></div>
                </div>

                <div className="info-box">
                  <h4>DATABASE QUARANTINE EFFECT</h4>
                  <p className="db-effect-desc">
                    Upon threat index threshold breach ({activeTx.risk.toFixed(4)} &ge; 0.75), Sugriva ACID manager automatically rerouted table row insertion from <code>public.transactions</code> to isolated <code>quarantine.suspended_ledgers</code>.
                  </p>
                  <div className="code-block">
                    {`BEGIN TRANSACTION; -- ${activeTx.dbStatus.acidTxId}
INSERT INTO quarantine.suspended_ledgers (
  tx_id, vpa, amount, risk_score, flag_type, isolation_reason
) VALUES (
  '${activeTx.id}', '${activeTx.vpa}', ${activeTx.amount}, ${activeTx.risk}, '${activeTx.flagType}', '${activeTx.flagReason}'
);
-- ACID Status: ${activeTx.dbStatus.tableState}`}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: DEEP CRYPTOGRAPHIC LOGS */}
          {presentationStep === 4 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <Lock size={16} />
                <span>STEP 4: PARAMETER-BY-PARAMETER CRYPTOGRAPHIC ENCLAVE INSPECTION</span>
              </div>

              <div className="crypto-cards-container">
                {/* 1. PII TOKENIZER */}
                <div className="crypto-box">
                  <div className="crypto-box-header">
                    <UserCheck size={14} />
                    <span>PII TOKENIZER ENCLAVE</span>
                    <span className={`status-badge-mini ${activeTx.cryptoLogs.piiTokenizer.status === "SECURE" ? "success-badge" : "error-badge"}`}>
                      {activeTx.cryptoLogs.piiTokenizer.status}
                    </span>
                  </div>
                  <div className="field-row"><span>RAW PII MASK:</span> <code className="code-inline">{activeTx.cryptoLogs.piiTokenizer.rawPiiSample}</code></div>
                  <div className="field-row"><span>HMAC BLIND INDEX:</span> <code className="code-inline">{activeTx.cryptoLogs.piiTokenizer.blindHmacIndex}</code></div>
                  <div className="field-row"><span>AES-GCM TOKEN:</span> <code className="code-inline">{activeTx.cryptoLogs.piiTokenizer.aesEncryptedToken}</code></div>
                  <p className="crypto-desc">Protects Sensitive PAN/VPA identifiers via HMAC-SHA256 blind indexing before storage.</p>
                </div>

                {/* 2. HMAC SIGNER */}
                <div className="crypto-box">
                  <div className="crypto-box-header">
                    <FileCheck size={14} />
                    <span>HMAC SIGNATURE VALIDATOR</span>
                    <span className={`status-badge-mini ${activeTx.cryptoLogs.hmacSigner.isValid ? "success-badge" : "error-badge"}`}>
                      {activeTx.cryptoLogs.hmacSigner.isValid ? "HMAC MATCH" : "HMAC MISMATCH"}
                    </span>
                  </div>
                  <div className="field-row"><span>ALGORITHM:</span> <strong>{activeTx.cryptoLogs.hmacSigner.algorithm}</strong></div>
                  <div className="field-row"><span>RECEIVED SIG:</span> <code className="code-inline">{activeTx.cryptoLogs.hmacSigner.receivedSig}</code></div>
                  <div className="field-row"><span>CALCULATED SIG:</span> <code className="code-inline">{activeTx.cryptoLogs.hmacSigner.calculatedSig}</code></div>
                  <p className="crypto-desc">Verifies payload integrity against canonical request headers in HSM enclave.</p>
                </div>

                {/* 3. AES ENVELOPE */}
                <div className="crypto-box">
                  <div className="crypto-box-header">
                    <Lock size={14} />
                    <span>AES-256-GCM ENVELOPE WRAPPER</span>
                    <span className={`status-badge-mini ${activeTx.cryptoLogs.aesEnvelope.envelopeStatus === "VERIFIED" ? "success-badge" : "error-badge"}`}>
                      {activeTx.cryptoLogs.aesEnvelope.envelopeStatus}
                    </span>
                  </div>
                  <div className="field-row"><span>MASTER KEK ID:</span> <strong>{activeTx.cryptoLogs.aesEnvelope.kekId}</strong></div>
                  <div className="field-row"><span>AES GCM IV:</span> <code className="code-inline">{activeTx.cryptoLogs.aesEnvelope.iv}</code></div>
                  <div className="field-row"><span>AUTH TAG:</span> <code className="code-inline">{activeTx.cryptoLogs.aesEnvelope.tag}</code></div>
                  <p className="crypto-desc">Envelopes transaction payload with ephemeral DEKs wrapped under HSM RSA-4096 / PQC KEM.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: IMMUTABLE WORM AUDIT ENTRY */}
          {presentationStep === 5 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <FileCheck size={16} />
                <span>STEP 5: IMMUTABLE WRITE-ONCE-READ-MANY (WORM) AUDIT LEDGER ENTRY</span>
              </div>

              <div className="details-grid-2">
                <div className="info-box border-green">
                  <h4>WORM AUDIT LOG ENTRY FOR TX {activeTx.id}</h4>
                  <div className="field-row"><span>AUDIT ENTRY ID:</span> <strong className="font-mono">{activeTx.auditId}</strong></div>
                  <div className="field-row"><span>MERKLE PROOF:</span> <code className="code-inline">{activeTx.wormMerkleProof}</code></div>
                  <div className="field-row"><span>TIMESTAMP:</span> <strong>{activeTx.timestamp}</strong></div>
                  <div className="field-row"><span>COMPLIANCE STATUS:</span> <span className="success-badge">IMMUTABLE (WORM VERIFIED)</span></div>
                </div>

                <div className="info-box">
                  <h4>CRYPTOGRAPHIC MERKLE TREE LINKAGE</h4>
                  <p className="db-effect-desc">
                    WORM logging architecture guarantees audit records cannot be altered by adversaries. Every entry is appended to a cryptographic SHA-256 Merkle chain:
                  </p>
                  <div className="code-block">
                    {`WORM_NODE [${activeTx.auditId}] {
  TxID: "${activeTx.id}",
  VPA: "${activeTx.vpa}",
  RiskScore: ${activeTx.risk},
  FlagType: "${activeTx.flagType}",
  MerkleProofRoot: "${activeTx.wormMerkleProof}",
  SignedByEnclave: "SUGRIVA-PQC-HSM-VAULT"
}`}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: DUAL-CHANNEL REPORTING DISPATCH */}
          {presentationStep === 6 && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="step-panel">
              <div className="panel-section-title">
                <Send size={16} />
                <span>STEP 6: DUAL-CHANNEL REPORTING DISPATCH (INTERNAL SOC & EXTERNAL REGULATORY)</span>
              </div>

              <div className="details-grid-2">
                {/* Internal Channel */}
                <div className="info-box border-orange">
                  <h4>CHANNEL 1: INTERNAL OPERATIONAL RESPONSE (SOC)</h4>
                  <p className="channel-desc">Triggers automated PagerDuty/Slack webhooks, SOC alert tickets, and account quarantine rules.</p>
                  <button
                    className="action-btn btn-orange"
                    onClick={() => dispatchOperationalReport(activeTx.id)}
                  >
                    <Send size={12} /> Dispatch Internal SOC Operational Alert
                  </button>
                </div>

                {/* External Channel */}
                <div className="info-box border-red">
                  <h4>CHANNEL 2: EXTERNAL REGULATORY REPORTING (STATUTORY)</h4>
                  <p className="channel-desc">Generates FinCEN SAR, RBI 6-Hour Cyber Incident Report, and GDPR PII breach compliance files.</p>
                  <button
                    className="action-btn btn-red"
                    onClick={() => dispatchRegulatoryReport(activeTx.id)}
                  >
                    <FileText size={12} /> Generate & File Statutory Regulatory SAR
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* MANUAL AUDIT CONTROL ACTIONS BAR */}
        <div className="manual-audit-control-bar">
          <div className="control-bar-label">
            <AlertTriangle size={14} className="warn-icon" />
            <span>MANUAL AUDIT CONTROL ACTIONS ON FLAGGED TX:</span>
          </div>

          <div className="actions-group">
            <button
              className="audit-act-btn btn-quarantine"
              onClick={() => executeManualAudit(activeTx.id, "QUARANTINE")}
            >
              <Lock size={12} /> Quarantine Account
            </button>

            <button
              className="audit-act-btn btn-revoke"
              onClick={() => executeManualAudit(activeTx.id, "REVOKE_SESSION")}
            >
              <Key size={12} /> Revoke HMAC Keys
            </button>

            <button
              className="audit-act-btn btn-sar"
              onClick={() => executeManualAudit(activeTx.id, "FILE_SAR")}
            >
              <Send size={12} /> File Regulatory SAR
            </button>

            <button
              className="audit-act-btn btn-rollback"
              onClick={() => executeManualAudit(activeTx.id, "ROLLBACK_DB")}
            >
              <RotateCcw size={12} /> Execute DB Rollback
            </button>

            <button
              className="audit-act-btn btn-approve"
              onClick={() => executeManualAudit(activeTx.id, "OVERRIDE")}
            >
              <CheckCircle2 size={12} /> Override & Approve
            </button>
          </div>
        </div>

        {/* Bottom Stepper Controls */}
        <div className="presentation-bottom-nav">
          <button
            disabled={presentationStep === 1}
            onClick={() => setPresentationStep(presentationStep - 1)}
            className="nav-btn"
          >
            <ChevronLeft size={14} /> Previous Step
          </button>

          <span className="step-indicator font-bold">
            STEP {presentationStep} OF 6
          </span>

          <button
            disabled={presentationStep === 6}
            onClick={() => setPresentationStep(presentationStep + 1)}
            className="nav-btn btn-highlight"
          >
            Next Step <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .presentation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .presentation-card {
          width: 95%;
          max-width: 1200px;
          height: 90vh;
          background-color: var(--bg-surface);
          border: var(--border-highlight);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .presentation-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background-color: var(--bg-surface-active);
          border-bottom: var(--border-default);
        }
        .bar-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .bar-title h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--accent-primary);
        }
        .demo-icon {
          color: var(--accent-primary);
        }
        .demo-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .bar-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .cmd-badge {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
          padding: 3px 8px;
          font-size: 10px;
          font-weight: bold;
          border-radius: 2px;
        }
        .close-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .close-btn:hover {
          color: var(--error-color);
          border: var(--border-error);
        }
        .tx-selector-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 20px;
          background-color: var(--bg-primary);
          border-bottom: var(--border-default);
        }
        .selector-label {
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .tx-select {
          flex: 1;
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 11px;
          font-family: var(--font-mono);
        }
        .stepper-ribbon {
          display: flex;
          background-color: var(--bg-surface-active);
          border-bottom: var(--border-default);
          overflow-x: auto;
        }
        .step-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: transparent;
          border: none;
          border-right: var(--border-default);
          padding: 10px;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .step-btn:hover {
          color: var(--accent-primary);
        }
        .step-active {
          background-color: var(--bg-primary);
          color: var(--accent-primary);
          border-bottom: 2px solid var(--accent-primary);
        }
        .step-workspace {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background-color: var(--bg-primary);
        }
        .panel-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: bold;
          color: var(--color-text-muted);
          margin-bottom: 15px;
        }
        .details-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .details-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
        }
        .info-box {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 15px;
          border-radius: 3px;
        }
        .border-red { border-left: 3px solid var(--error-color); }
        .border-orange { border-left: 3px solid var(--accent-primary); }
        .border-blue { border-left: 3px solid var(--quantum-color); }
        .border-green { border-left: 3px solid var(--success-color); }
        .info-box h4 {
          margin: 0 0 12px 0;
          font-size: 12px;
          font-weight: bold;
          color: var(--color-text);
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 11px;
          border-bottom: 1px dashed #eee;
        }
        .reason-highlight-box {
          display: flex;
          gap: 10px;
          background-color: var(--warning-bg);
          border: var(--border-highlight);
          padding: 10px;
          border-radius: 3px;
          margin-bottom: 12px;
        }
        .flag-type-title {
          font-weight: bold;
          font-size: 12px;
          color: var(--accent-primary);
        }
        .flag-reason-text {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: var(--color-text);
        }
        .warn-icon {
          color: var(--accent-primary);
          flex-shrink: 0;
        }
        .font-mono { font-family: var(--font-mono); }
        .color-error { color: var(--error-color); }
        .color-success { color: var(--success-color); }
        .color-warning { color: var(--warning-color); }
        .color-primary { color: var(--accent-primary); }
        .info-card {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 15px;
          border-radius: 3px;
          text-align: center;
        }
        .info-card h5 {
          margin: 0 0 8px 0;
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .status-large {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .info-card p {
          margin: 0;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .code-block {
          background-color: #f4f4f4;
          border: var(--border-default);
          padding: 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          white-space: pre-wrap;
          margin-top: 10px;
          border-radius: 2px;
        }
        .code-inline {
          font-family: var(--font-mono);
          background-color: #eee;
          padding: 1px 4px;
          font-size: 10px;
        }
        .db-effect-desc, .crypto-desc, .channel-desc {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        .crypto-cards-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .crypto-box {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
        }
        .crypto-box-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 8px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
          margin-top: 10px;
        }
        .btn-orange {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .btn-red {
          background-color: var(--error-bg);
          border: var(--border-error);
          color: var(--error-color);
        }
        .manual-audit-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background-color: var(--bg-surface-active);
          border-top: var(--border-default);
          border-bottom: var(--border-default);
        }
        .control-bar-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: bold;
          font-size: 11px;
        }
        .actions-group {
          display: flex;
          gap: 8px;
        }
        .audit-act-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .btn-quarantine { background-color: var(--warning-bg); border: var(--border-highlight); color: var(--warning-color); }
        .btn-revoke { background-color: #f0f0f0; border: var(--border-default); color: var(--color-text); }
        .btn-sar { background-color: var(--error-bg); border: var(--border-error); color: var(--error-color); }
        .btn-rollback { background-color: var(--quantum-bg); border: 1px solid var(--quantum-color); color: var(--quantum-color); }
        .btn-approve { background-color: var(--success-bg); border: var(--border-success); color: var(--success-color); }
        .presentation-bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background-color: var(--bg-surface);
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: var(--border-default);
          padding: 6px 14px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .btn-highlight {
          background-color: var(--accent-primary);
          color: #ffffff;
          border: none;
        }
        .step-indicator {
          font-size: 11px;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};
