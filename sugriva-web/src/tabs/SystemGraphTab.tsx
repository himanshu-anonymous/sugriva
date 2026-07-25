import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { motion } from "framer-motion";
import { Activity, Cpu, Database, ShieldAlert, Lock, Send, FileCheck, Network } from "lucide-react";

export type SystemParameter = "anomalyRate" | "latency" | "cryptoHealth" | "queueDepth" | "cpuLoad" | "mitreScore";

interface SystemNode {
  id: string;
  name: string;
  type: string;
  icon: any;
  status: "ONLINE" | "DEGRADED" | "ATTACK_DETECTED";
  metrics: {
    anomalyRate: number; // %
    latency: number; // ms
    cryptoHealth: number; // %
    queueDepth: number;
    cpuLoad: number; // %
    mitreScore: number;
  };
  description: string;
}

export const SystemGraphTab: React.FC = () => {
  const { records, qkdCoherence, trngEntropy, pqcFailures, eventQueue, auditLogs } = useStore();
  const [selectedParam, setSelectedParam] = useState<SystemParameter>("anomalyRate");
  const [activeNodeId, setActiveNodeId] = useState<string>("gnn-mesh");

  const anomalyCount = records.filter(r => r.flagged || r.risk >= 0.5).length;
  const totalCount = Math.max(1, records.length);
  const overallAnomalyRate = parseFloat(((anomalyCount / totalCount) * 100).toFixed(1));

  // Dynamic Graph Nodes Representation
  const nodes: SystemNode[] = [
    {
      id: "ingestion-gw",
      name: "1. INGESTION API GATEWAY",
      type: "Ingress Router",
      icon: Network,
      status: "ONLINE",
      metrics: {
        anomalyRate: overallAnomalyRate,
        latency: 1.4,
        cryptoHealth: 99.8,
        queueDepth: eventQueue.filter(e => e.status === "QUEUED").length,
        cpuLoad: 24.5,
        mitreScore: 0.15
      },
      description: "Edge rate-limiting API Gateway handling NPCI, Visa, RTGS, & SWIFT network ingestion streams."
    },
    {
      id: "auth-enclave",
      name: "2. ZERO-TRUST AUTH ENCLAVE",
      type: "Identity Enclave",
      icon: Lock,
      status: records.some(r => r.flagType === "UNAUTHORIZED_ZERO_TRUST_AUTH") ? "DEGRADED" : "ONLINE",
      metrics: {
        anomalyRate: parseFloat(((records.filter(r => r.authDetails.tokenStatus !== "VALID").length / totalCount) * 100).toFixed(1)),
        latency: 3.2,
        cryptoHealth: 98.4,
        queueDepth: eventQueue.filter(e => e.status === "PROCESSING").length,
        cpuLoad: 38.2,
        mitreScore: 0.42
      },
      description: "Hardware Security Module (HSM) evaluating RS256/Dilithium3 JWT tokens and MFA biometric challenges."
    },
    {
      id: "crypto-engine",
      name: "3. PII & CRYPTO ENCLAVE",
      type: "HSM Cryptography",
      icon: Cpu,
      status: pqcFailures > 0 ? "ATTACK_DETECTED" : "ONLINE",
      metrics: {
        anomalyRate: parseFloat(((records.filter(r => r.cryptoLogs.hmacSigner.isValid === false).length / totalCount) * 100).toFixed(1)),
        latency: 2.1,
        cryptoHealth: parseFloat((qkdCoherence * 0.7 + trngEntropy * 0.3).toFixed(1)),
        queueDepth: eventQueue.filter(e => e.status === "CRYPTO_VERIFIED").length,
        cpuLoad: 45.1,
        mitreScore: 0.65
      },
      description: "Executes PII HMAC blind indexing, canonical HMAC-SHA256 signature verification, & AES-256-GCM envelope key wrapping."
    },
    {
      id: "gnn-mesh",
      name: "4. GNN THREAT & MITRE MESH",
      type: "Security Graph Neural Net",
      icon: ShieldAlert,
      status: anomalyCount > 5 ? "ATTACK_DETECTED" : "ONLINE",
      metrics: {
        anomalyRate: overallAnomalyRate,
        latency: 4.8,
        cryptoHealth: 99.2,
        queueDepth: eventQueue.length,
        cpuLoad: 68.4,
        mitreScore: 0.88
      },
      description: "Active GNN topology analyzer correlating multi-sender transaction graphs against MITRE ATT&CK TTPs."
    },
    {
      id: "acid-db",
      name: "5. ACID TRANSACTION DATABASE",
      type: "Distributed DB Engine",
      icon: Database,
      status: records.some(r => r.dbStatus.rollbackTriggered) ? "DEGRADED" : "ONLINE",
      metrics: {
        anomalyRate: parseFloat(((records.filter(r => r.dbStatus.tableState === "ISOLATED_QUARANTINE").length / totalCount) * 100).toFixed(1)),
        latency: 2.8,
        cryptoHealth: 99.9,
        queueDepth: 2,
        cpuLoad: 31.0,
        mitreScore: 0.22
      },
      description: "ACID compliant relational storage routing high-risk records automatically into quarantine table partitions."
    },
    {
      id: "worm-vault",
      name: "6. IMMUTABLE WORM AUDIT VAULT",
      type: "Write-Once Ledger",
      icon: FileCheck,
      status: "ONLINE",
      metrics: {
        anomalyRate: 0.0,
        latency: 1.1,
        cryptoHealth: 100.0,
        queueDepth: auditLogs.length,
        cpuLoad: 12.0,
        mitreScore: 0.05
      },
      description: "Immutable WORM logging vault with cryptographic SHA-256 Merkle chain verification guaranteeing zero tamper capability."
    },
    {
      id: "reporting-dispatch",
      name: "7. DUAL-CHANNEL REPORTING DISPATCH",
      type: "Statutory Reporting Router",
      icon: Send,
      status: "ONLINE",
      metrics: {
        anomalyRate: 0.0,
        latency: 3.5,
        cryptoHealth: 99.5,
        queueDepth: 0,
        cpuLoad: 18.2,
        mitreScore: 0.10
      },
      description: "Automated dual-channel dispatcher issuing SOC PagerDuty webhooks and statutory FinCEN/RBI regulatory reports."
    }
  ];

  const activeNode = nodes.find(n => n.id === activeNodeId) || nodes[0];

  const getMetricDisplay = (node: SystemNode, param: SystemParameter) => {
    const val = node.metrics[param];
    switch (param) {
      case "anomalyRate": return `${val.toFixed(1)}%`;
      case "latency": return `${val.toFixed(1)} ms`;
      case "cryptoHealth": return `${val.toFixed(1)}%`;
      case "queueDepth": return `${val} items`;
      case "cpuLoad": return `${val.toFixed(1)}%`;
      case "mitreScore": return `${val.toFixed(2)} Risk`;
    }
  };

  const getParamLabel = (param: SystemParameter) => {
    switch (param) {
      case "anomalyRate": return "ANOMALY RATE (%)";
      case "latency": return "PROCESSING LATENCY (MS)";
      case "cryptoHealth": return "CRYPTO & QKD HEALTH (%)";
      case "queueDepth": return "EVENT QUEUE DEPTH";
      case "cpuLoad": return "SYSTEM CPU LOAD (%)";
      case "mitreScore": return "MITRE THREAT INDEX";
    }
  };

  return (
    <div className="system-graph-tab-container">
      <div className="tab-header-row">
        <h2>Interactive System Architecture & Parameter Topology Graph</h2>
      </div>

      {/* Parameter Toggle Bar */}
      <div className="parameter-toggle-bar">
        <span className="param-label">SELECT SYSTEM PARAMETER OVERLAY:</span>
        <div className="param-buttons">
          {(["anomalyRate", "latency", "cryptoHealth", "queueDepth", "cpuLoad", "mitreScore"] as SystemParameter[]).map(p => (
            <button
              key={p}
              onClick={() => setSelectedParam(p)}
              className={`param-btn ${selectedParam === p ? "param-active" : ""}`}
            >
              {getParamLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph & Inspector Grid */}
      <div className="graph-workspace">
        {/* Left Side: Topology Graph Diagram */}
        <div className="graph-diagram-container flat-border">
          <div className="diagram-header">
            <Activity size={14} />
            <span>PIPELINE TOPOLOGY GRAPH OVERLAY: [{getParamLabel(selectedParam)}]</span>
          </div>

          <div className="nodes-flow-wrapper">
            {nodes.map((node, i) => {
              const Icon = node.icon;
              const isSelected = activeNodeId === node.id;
              const metricVal = getMetricDisplay(node, selectedParam);
              return (
                <React.Fragment key={node.id}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setActiveNodeId(node.id)}
                    className={`node-card ${isSelected ? "node-selected" : ""} ${node.status === "ATTACK_DETECTED" ? "node-attack" : ""}`}
                  >
                    <div className="node-top">
                      <div className="node-title">
                        <Icon size={14} className="node-icon" />
                        <span>{node.name}</span>
                      </div>
                      <span className={`status-badge-mini ${node.status === "ONLINE" ? "success-badge" : "error-badge"}`}>
                        {node.status}
                      </span>
                    </div>

                    <div className="node-metric-display">
                      <span className="metric-label">{getParamLabel(selectedParam)}:</span>
                      <span className="metric-value font-mono">{metricVal}</span>
                    </div>
                  </motion.div>

                  {/* Flow Arrow Connection */}
                  {i < nodes.length - 1 && (
                    <div className="flow-arrow-row">
                      <div className="arrow-line" />
                      <span className="arrow-head">&darr;</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Right Side: Node Parameter Inspector */}
        <div className="node-inspector-container flat-border">
          <div className="inspector-title">
            <Cpu size={14} />
            <span>NODE PARAMETER INSPECTOR</span>
          </div>

          <div className="inspector-content">
            <h3>{activeNode.name}</h3>
            <span className="type-badge">{activeNode.type}</span>
            <p className="node-desc">{activeNode.description}</p>

            <div className="metrics-box-grid">
              <div className="m-card">
                <span>ANOMALY RATE</span>
                <strong>{activeNode.metrics.anomalyRate.toFixed(1)}%</strong>
              </div>
              <div className="m-card">
                <span>LATENCY</span>
                <strong>{activeNode.metrics.latency.toFixed(1)} ms</strong>
              </div>
              <div className="m-card">
                <span>CRYPTO HEALTH</span>
                <strong>{activeNode.metrics.cryptoHealth.toFixed(1)}%</strong>
              </div>
              <div className="m-card">
                <span>QUEUE DEPTH</span>
                <strong>{activeNode.metrics.queueDepth} items</strong>
              </div>
              <div className="m-card">
                <span>CPU LOAD</span>
                <strong>{activeNode.metrics.cpuLoad.toFixed(1)}%</strong>
              </div>
              <div className="m-card">
                <span>MITRE THREAT</span>
                <strong>{activeNode.metrics.mitreScore.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .system-graph-tab-container {
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
        .parameter-toggle-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 8px 12px;
          margin-bottom: 12px;
          border-radius: 2px;
          flex-wrap: wrap;
        }
        .param-label {
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .param-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .param-btn {
          background: var(--bg-primary);
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .param-active {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .graph-workspace {
          flex: 1;
          display: flex;
          gap: 20px;
          overflow: hidden;
        }
        .graph-diagram-container {
          flex: 1;
          background-color: var(--bg-surface);
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .diagram-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 15px;
        }
        .nodes-flow-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .node-card {
          width: 100%;
          max-width: 500px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 10px 15px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .node-card:hover {
          border-color: var(--color-text-muted);
        }
        .node-selected {
          border: var(--border-highlight);
          background-color: #fff5e6;
        }
        .node-attack {
          border-left: 4px solid var(--error-color);
        }
        .node-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .node-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 12px;
        }
        .node-icon {
          color: var(--accent-primary);
        }
        .node-metric-display {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
        }
        .metric-label {
          color: var(--color-text-muted);
        }
        .metric-value {
          font-weight: bold;
          color: var(--accent-primary);
        }
        .flow-arrow-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--color-text-muted);
          font-size: 12px;
        }
        .arrow-line {
          width: 1px;
          height: 10px;
          background-color: var(--color-text-muted);
        }
        .node-inspector-container {
          flex: 0 0 350px;
          background-color: var(--bg-surface);
          padding: 15px;
          overflow-y: auto;
        }
        .inspector-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 15px;
        }
        .inspector-content h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 800;
        }
        .type-badge {
          font-size: 10px;
          background-color: var(--bg-surface-active);
          padding: 2px 6px;
          border-radius: 2px;
          color: var(--color-text-muted);
        }
        .node-desc {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin: 10px 0 15px 0;
        }
        .metrics-box-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .m-card {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 8px;
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          font-size: 10px;
        }
        .m-card span {
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .m-card strong {
          font-size: 12px;
          color: var(--accent-primary);
        }
        .font-mono { font-family: var(--font-mono); }
      `}</style>
    </div>
  );
};
