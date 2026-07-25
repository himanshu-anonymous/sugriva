import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import type { FlagType } from "../state/mockEngine";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Zap,
  Key,
  Database,
  Cpu,
  Play,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Crosshair,
  Filter
} from "lucide-react";

export type AttackCategory =
  | "ALL"
  | "QUANTUM_CRYPTO"
  | "AUTH_CREDENTIAL"
  | "VELOCITY_FLOOD"
  | "DATABASE_PII"
  | "MITRE_TACTIC";

export interface AttackDefinition {
  id: string;
  name: string;
  category: AttackCategory;
  flagType: FlagType;
  mitreCode: string;
  description: string;
  vector: string;
  triggerKey: string;
  simAction: () => Promise<void>;
}

export const AllAttacksTab: React.FC = () => {
  const {
    records,
    eventQueue,
    qkdCoherence,
    trngEntropy,
    pqcFailures,
    triggerStuffing,
    triggerLiquidation,
    triggerFlood,
    triggerQuantumExploit,
    executeCommand
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<AttackCategory>("ALL");
  const [selectedAttackId, setSelectedAttackId] = useState<string>("quantum-replay");

  // Attack Catalogue encompassing Quantum, Credential, Network, DB & MITRE TTPs
  const attackCatalog: AttackDefinition[] = [
    {
      id: "quantum-replay",
      name: "Quantum Signature Spoofing & Photon Loss",
      category: "QUANTUM_CRYPTO",
      flagType: "QUANTUM_REPLAY_ATTACK",
      mitreCode: "T1587: Develop Capabilities",
      description: "Adversaries exploit quantum key distribution or photon coherence instabilities to intercept post-quantum keys.",
      vector: "QKD Photon Coherence Drop (<95.0%) & TRNG Entropy Drain",
      triggerKey: "Ctrl+4",
      simAction: triggerQuantumExploit
    },
    {
      id: "hmac-tamper",
      name: "HMAC Signature Mismatch / Payload Alteration",
      category: "QUANTUM_CRYPTO",
      flagType: "HMAC_SIGNATURE_MISMATCH",
      mitreCode: "T1557: Adversary-in-the-Middle",
      description: "In-the-Middle attackers alter canonical request headers or transaction amounts before HMAC digest validation.",
      vector: "Calculated HMAC Digest vs Header Signature Discrepancy",
      triggerKey: "Ctrl+2",
      simAction: triggerLiquidation
    },
    {
      id: "aes-corrupt",
      name: "AES-256 Envelope IV Corruption",
      category: "QUANTUM_CRYPTO",
      flagType: "AES_ENVELOPE_CORRUPT",
      mitreCode: "T1557: Adversary-in-the-Middle",
      description: "Attempted tampering with AES-GCM Initialization Vector or Key Wrapping KEK in HSM enclave.",
      vector: "GCM Tag Mismatch & RSA-4096 / KEM Wrap Failure",
      triggerKey: "CLI 'flag AES'",
      simAction: async () => { executeCommand("flag AES"); }
    },
    {
      id: "credential-stuffing",
      name: "Credential Stuffing & Auth Token Forgery",
      category: "AUTH_CREDENTIAL",
      flagType: "UNAUTHORIZED_ZERO_TRUST_AUTH",
      mitreCode: "T1078: Valid Accounts",
      description: "High-frequency automated bot logins trying stolen credentials and bypassing zero-trust MFA tokens.",
      vector: "AuthDiscrepancy Score (>0.5) & Step-up MFA Challenge Failure",
      triggerKey: "Ctrl+1",
      simAction: triggerStuffing
    },
    {
      id: "velocity-flood",
      name: "DDoS Velocity Transaction Flood",
      category: "VELOCITY_FLOOD",
      flagType: "VELOCITY_SPIKE",
      mitreCode: "T1499: Endpoint Denial of Service",
      description: "Adversary flood sweep generating >3 micro-transactions within 5 seconds to overload rate limiters.",
      vector: "Sliding Window Rate Limit Breach & IP Blacklisting",
      triggerKey: "Ctrl+3",
      simAction: triggerFlood
    },
    {
      id: "mule-laundering",
      name: "Mule Account Rapid Fund Aggregation",
      category: "VELOCITY_FLOOD",
      flagType: "MULE_NODE_AGGREGATION",
      mitreCode: "T1005: Collection / TA0008: Lateral Movement",
      description: "Rapid multi-sender money funneling targeting mule transit accounts before liquidation.",
      vector: "GNN Topology Clustering & Multi-sender Node Correlation",
      triggerKey: "Auto-Detected",
      simAction: triggerFlood
    },
    {
      id: "pii-leak",
      name: "Cleartext PII Exfiltration Attempt",
      category: "DATABASE_PII",
      flagType: "PII_TOKEN_LEAK_RISK",
      mitreCode: "T1005: Data from Local System",
      description: "Adversaries searching metadata payloads for un-hashed PANs or unmasked account credentials.",
      vector: "PII Tokenizer Cleartext Scan & Blind HMAC Failure",
      triggerKey: "Auto-Detected",
      simAction: triggerStuffing
    },
    {
      id: "db-rollback-violation",
      name: "ACID Database Transaction Mutation",
      category: "DATABASE_PII",
      flagType: "DB_ACID_ROLLBACK_VIOLATION",
      mitreCode: "T1565: Data Manipulation",
      description: "Direct unauthorized database insertion attempt circumventing relational ledger constraints.",
      vector: "ACID Row Isolation & Quarantine Table Reroute",
      triggerKey: "CLI 'breaker trip'",
      simAction: async () => { executeCommand("breaker trip"); }
    }
  ];

  // Helper to compute hit count & recent detection status for an attack
  const getAttackStats = (flagType: FlagType) => {
    const matched = records.filter(r => r.flagType === flagType || (flagType === "QUANTUM_REPLAY_ATTACK" && (qkdCoherence < 95 || trngEntropy < 80 || pqcFailures > 0)));
    const hitCount = matched.length;

    // Check if initiated recently (within top 5 recent records)
    const recent = records.slice(0, 5).some(r => r.flagType === flagType);
    const lastRecord = matched[0];

    return {
      hitCount,
      isRecentlyInitiated: recent,
      lastTimestamp: lastRecord ? lastRecord.timestamp : "No recent events",
      lastVpa: lastRecord ? lastRecord.vpa : "N/A"
    };
  };

  // Filter catalog
  const filteredCatalog = attackCatalog.filter(atk => {
    if (selectedCategory === "ALL") return true;
    return atk.category === selectedCategory;
  });

  const activeAttack = attackCatalog.find(a => a.id === selectedAttackId) || attackCatalog[0];
  const activeStats = getAttackStats(activeAttack.flagType);

  // Filter recent attack notifications from event queue & audit log
  const recentNotifications = eventQueue.slice(0, 8);

  return (
    <div className="all-attacks-tab-container">
      {/* Header */}
      <div className="tab-header-row">
        <h2>ALL ATTACKS MONITORING & THREAT NOTIFICATION CENTER</h2>
      </div>

      {/* Real-time Attack Notification Ticker */}
      <div className="attack-notification-ticker flat-border">
        <div className="ticker-badge">
          <Bell size={13} className="bell-ring" />
          <span>LIVE ATTACK NOTIFICATION FEED</span>
        </div>

        <div className="ticker-stream">
          {recentNotifications.length === 0 ? (
            <span className="no-notif">Monitoring live pipeline... No active attack notifications.</span>
          ) : (
            <AnimatePresence mode="popLayout">
              {recentNotifications.map(notif => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`notif-item ${notif.severity === "CRITICAL" ? "notif-critical" : "notif-warn"}`}
                >
                  <AlertTriangle size={10} />
                  <span className="notif-time">{notif.timestamp}</span>
                  <span className="notif-type">[{notif.eventType}]</span>
                  <span className="notif-vpa">{notif.targetVpa}:</span>
                  <span className="notif-msg">{notif.details}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Category Filtration Toggle Bar */}
      <div className="category-filter-bar">
        <span className="filter-label">FILTER ATTACK CATEGORIES:</span>
        <div className="filter-buttons">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`cat-btn ${selectedCategory === "ALL" ? "cat-active" : ""}`}
          >
            <Filter size={10} /> ALL ATTACKS ({attackCatalog.length})
          </button>

          <button
            onClick={() => setSelectedCategory("QUANTUM_CRYPTO")}
            className={`cat-btn ${selectedCategory === "QUANTUM_CRYPTO" ? "cat-active-quantum" : ""}`}
          >
            <Cpu size={10} /> QUANTUM & CRYPTOGRAPHIC ({attackCatalog.filter(a => a.category === "QUANTUM_CRYPTO").length})
          </button>

          <button
            onClick={() => setSelectedCategory("AUTH_CREDENTIAL")}
            className={`cat-btn ${selectedCategory === "AUTH_CREDENTIAL" ? "cat-active-auth" : ""}`}
          >
            <Key size={10} /> AUTH & CREDENTIALS ({attackCatalog.filter(a => a.category === "AUTH_CREDENTIAL").length})
          </button>

          <button
            onClick={() => setSelectedCategory("VELOCITY_FLOOD")}
            className={`cat-btn ${selectedCategory === "VELOCITY_FLOOD" ? "cat-active-flood" : ""}`}
          >
            <Zap size={10} /> VELOCITY & FLOODS ({attackCatalog.filter(a => a.category === "VELOCITY_FLOOD").length})
          </button>

          <button
            onClick={() => setSelectedCategory("DATABASE_PII")}
            className={`cat-btn ${selectedCategory === "DATABASE_PII" ? "cat-active-db" : ""}`}
          >
            <Database size={10} /> DATABASE & PII ({attackCatalog.filter(a => a.category === "DATABASE_PII").length})
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="attacks-workspace">
        {/* Left Column: Interactive Attack Grid with Subsection Highlighting */}
        <div className="attacks-grid-column">
          <div className="column-title">
            <ShieldAlert size={14} />
            <span>SELECTABLE ATTACK MONITORING GRID (CLICK TO INSPECT)</span>
          </div>

          <div className="attack-cards-list">
            {filteredCatalog.map(atk => {
              const stats = getAttackStats(atk.flagType);
              const isSelected = selectedAttackId === atk.id;
              return (
                <motion.div
                  key={atk.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setSelectedAttackId(atk.id)}
                  className={`attack-card ${isSelected ? "attack-card-active" : ""} ${stats.isRecentlyInitiated ? "recently-initiated-card" : ""}`}
                >
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="mitre-code font-mono">{atk.mitreCode}</span>
                      <h4 className="attack-name">{atk.name}</h4>
                    </div>

                    {/* Subsection Highlighting Badge */}
                    {stats.isRecentlyInitiated ? (
                      <span className="badge-highlight-recently">
                        <Zap size={10} className="flash-icon" /> RECENTLY INITIATED
                      </span>
                    ) : stats.hitCount > 0 ? (
                      <span className="badge-threat-active">
                        <AlertTriangle size={10} /> {stats.hitCount} HITS DETECTED
                      </span>
                    ) : (
                      <span className="badge-monitored">
                        <CheckCircle2 size={10} /> MONITORED
                      </span>
                    )}
                  </div>

                  <div className="card-body">
                    <p className="card-desc">{atk.description}</p>
                    <div className="card-meta">
                      <span>VECTOR: <strong className="color-primary">{atk.vector}</strong></span>
                      <span>TRIGGER: <code className="code-inline">{atk.triggerKey}</code></span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Attack Inspector & Simulator */}
        <div className="attack-inspector-column flat-border">
          <div className="inspector-header">
            <Crosshair size={14} className="color-primary" />
            <span>ATTACK MONITORING & SIMULATION INSPECTOR</span>
          </div>

          <div className="inspector-content">
            <div className="inspector-title-row">
              <h3>{activeAttack.name}</h3>
              <span className="category-tag">{activeAttack.category}</span>
            </div>

            <div className="mitre-tag-row">
              <span className="mitre-badge font-mono">{activeAttack.mitreCode}</span>
              <span className="flag-type-badge font-mono">{activeAttack.flagType}</span>
            </div>

            {/* Subsection Highlighting Alert Banner */}
            {activeStats.isRecentlyInitiated && (
              <div className="recent-alert-banner">
                <AlertTriangle size={16} className="warn-icon" />
                <div>
                  <strong>ATTACK RECENTLY INITIATED BY ATTACKER SIDE</strong>
                  <p>System security sensors fired live quarantine response at {activeStats.lastTimestamp} on target {activeStats.lastVpa}.</p>
                </div>
              </div>
            )}

            <div className="inspector-section border-orange">
              <h4>ATTACK MECHANISM & VECTOR DETAILS</h4>
              <p>{activeAttack.description}</p>
              <div className="vector-box">
                <span>SUGRIVA ANOMALY DETECTION RULE:</span>
                <strong>{activeAttack.vector}</strong>
              </div>
            </div>

            <div className="inspector-section">
              <h4>ATTACK STATISTICAL SUMMARY</h4>
              <div className="stats-mini-grid">
                <div className="stat-box">
                  <span>TOTAL DETECTED HITS:</span>
                  <strong className="color-error font-mono">{activeStats.hitCount}</strong>
                </div>
                <div className="stat-box">
                  <span>LAST OCCURRENCE:</span>
                  <strong className="font-mono">{activeStats.lastTimestamp}</strong>
                </div>
                <div className="stat-box">
                  <span>TARGET NODE:</span>
                  <strong className="font-mono">{activeStats.lastVpa}</strong>
                </div>
              </div>
            </div>

            {/* Interactive Attack Simulation Trigger Button */}
            <div className="sim-trigger-box">
              <h4>INJECT ATTACK SIMULATION ON ATTACKER SIDE</h4>
              <p>Triggers a live demonstration of this attack vector through the Sugriva pipeline.</p>
              <button
                className="sim-action-btn"
                onClick={() => activeAttack.simAction()}
              >
                <Play size={12} /> INITIATE ATTACK SIMULATION [{activeAttack.triggerKey}]
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .all-attacks-tab-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          overflow: hidden;
        }
        .tab-header-row {
          margin-bottom: 10px;
        }
        .tab-header-row h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
        }
        .attack-notification-ticker {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--bg-surface-active);
          padding: 6px 12px;
          margin-bottom: 12px;
          border-radius: 2px;
          height: 36px;
        }
        .ticker-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: bold;
          font-size: 10px;
          color: var(--accent-primary);
          flex-shrink: 0;
        }
        .bell-ring {
          animation: ring 2s ease infinite;
        }
        @keyframes ring {
          0%, 100% { transform: rotate(0); }
          10%, 30% { transform: rotate(15deg); }
          20%, 40% { transform: rotate(-15deg); }
        }
        .ticker-stream {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          overflow-x: auto;
          white-space: nowrap;
        }
        .no-notif {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .notif-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 10px;
          font-family: var(--font-mono);
        }
        .notif-critical {
          background-color: var(--error-bg);
          border: var(--border-error);
          color: var(--error-color);
        }
        .notif-warn {
          background-color: var(--warning-bg);
          border: var(--border-highlight);
          color: var(--warning-color);
        }
        .notif-time { color: var(--color-text-muted); }
        .notif-type { font-weight: bold; }
        .notif-vpa { font-weight: bold; }
        .category-filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .filter-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cat-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-surface);
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .cat-active {
          background-color: var(--bg-primary);
          color: var(--color-text);
          border-color: var(--color-text-muted);
        }
        .cat-active-quantum { background-color: var(--quantum-bg); border: 1px solid var(--quantum-color); color: var(--quantum-color); }
        .cat-active-auth { background-color: #fff5e6; border: var(--border-highlight); color: var(--accent-primary); }
        .cat-active-flood { background-color: var(--warning-bg); border: var(--border-highlight); color: var(--warning-color); }
        .cat-active-db { background-color: var(--error-bg); border: var(--border-error); color: var(--error-color); }
        .attacks-workspace {
          flex: 1;
          display: flex;
          gap: 15px;
          overflow: hidden;
        }
        .attacks-grid-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .column-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 10px;
        }
        .attack-cards-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .attack-card {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .attack-card:hover {
          border-color: var(--color-text-muted);
        }
        .attack-card-active {
          border: var(--border-highlight);
          background-color: #fff5e6;
        }
        .recently-initiated-card {
          border-left: 4px solid var(--error-color);
          animation: pulseBorder 1.5s infinite;
        }
        @keyframes pulseBorder {
          0%, 100% { background-color: var(--error-bg); }
          50% { background-color: #fff5e6; }
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
        }
        .mitre-code {
          font-size: 10px;
          color: var(--accent-primary);
          font-weight: bold;
        }
        .attack-name {
          margin: 2px 0 0 0;
          font-size: 12px;
          font-weight: bold;
          color: var(--color-text);
        }
        .badge-highlight-recently {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: var(--error-color);
          color: #ffffff;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
        }
        .badge-threat-active {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: var(--error-bg);
          border: var(--border-error);
          color: var(--error-color);
          padding: 2px 6px;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
        }
        .badge-monitored {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: var(--success-bg);
          border: var(--border-success);
          color: var(--success-color);
          padding: 2px 6px;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
        }
        .card-desc {
          margin: 0 0 8px 0;
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.3;
        }
        .card-meta {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .attack-inspector-column {
          flex: 0 0 420px;
          background-color: var(--bg-surface);
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .inspector-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          border-bottom: var(--border-default);
          padding-bottom: 10px;
          margin-bottom: 12px;
        }
        .inspector-title-row h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 800;
        }
        .category-tag {
          font-size: 9px;
          font-weight: bold;
          background-color: var(--bg-surface-active);
          padding: 2px 6px;
          border-radius: 2px;
          color: var(--color-text-muted);
        }
        .mitre-tag-row {
          display: flex;
          gap: 6px;
          margin: 8px 0 12px 0;
        }
        .mitre-badge {
          font-size: 10px;
          font-weight: bold;
          color: var(--accent-primary);
          background-color: #fff5e6;
          padding: 2px 6px;
          border: var(--border-highlight);
        }
        .flag-type-badge {
          font-size: 10px;
          color: var(--color-text-muted);
          background-color: var(--bg-primary);
          padding: 2px 6px;
          border: var(--border-default);
        }
        .recent-alert-banner {
          display: flex;
          gap: 10px;
          background-color: var(--error-bg);
          border: var(--border-error);
          padding: 10px;
          border-radius: 3px;
          margin-bottom: 12px;
          font-size: 11px;
        }
        .recent-alert-banner p {
          margin: 2px 0 0 0;
          font-size: 10px;
          color: var(--error-color);
        }
        .warn-icon {
          color: var(--error-color);
          flex-shrink: 0;
        }
        .inspector-section {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
          margin-bottom: 12px;
        }
        .border-orange { border-left: 3px solid var(--accent-primary); }
        .inspector-section h4 {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .inspector-section p {
          margin: 0 0 8px 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .vector-box {
          display: flex;
          flex-direction: column;
          font-size: 10px;
          background-color: var(--bg-surface);
          padding: 6px;
          border: var(--border-default);
        }
        .vector-box span { color: var(--color-text-muted); }
        .vector-box strong { color: var(--accent-primary); }
        .stats-mini-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 10px;
        }
        .stat-box {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed #eee;
          padding-bottom: 2px;
        }
        .sim-trigger-box {
          background-color: #fff5e6;
          border: var(--border-highlight);
          padding: 12px;
          border-radius: 3px;
        }
        .sim-trigger-box h4 {
          margin: 0 0 4px 0;
          font-size: 11px;
          font-weight: bold;
          color: var(--accent-primary);
        }
        .sim-trigger-box p {
          margin: 0 0 10px 0;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .sim-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          background-color: var(--accent-primary);
          color: #ffffff;
          border: none;
          padding: 8px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .sim-action-btn:hover { opacity: 0.9; }
        .font-mono { font-family: var(--font-mono); }
        .code-inline { font-family: var(--font-mono); background: #eee; padding: 1px 4px; font-size: 9px; }
        .color-primary { color: var(--accent-primary); }
        .color-error { color: var(--error-color); }
      `}</style>
    </div>
  );
};
