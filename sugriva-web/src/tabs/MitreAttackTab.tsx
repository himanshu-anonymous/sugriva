import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { Crosshair } from "lucide-react";

interface MitreTechnique {
  id: string;
  tactic: string;
  name: string;
  description: string;
  mappedTelemetry: string;
}

const MITRE_MATRIX: MitreTechnique[] = [
  {
    id: "T1078",
    tactic: "TA0006: Credential Access",
    name: "Valid Accounts & Credential Stuffing",
    description: "Adversaries obtain and use credentials of existing accounts to bypass authentication.",
    mappedTelemetry: "AuthDiscrepancy Score & High Velocity Failed OTPs"
  },
  {
    id: "T1557",
    tactic: "TA0001 / TA0006: In-the-Middle",
    name: "Adversary-in-the-Middle & HMAC Tampering",
    description: "Adversaries position themselves between targets to intercept/alter payload headers.",
    mappedTelemetry: "HMAC Digest Mismatch & AES-256 Envelope IV Corruption"
  },
  {
    id: "T1005",
    tactic: "TA0009: Collection",
    name: "Data from Local System / PII Exfiltration",
    description: "Adversaries search local systems to collect sensitive PII and account tokens.",
    mappedTelemetry: "PII Tokenizer Cleartext Risk & Unhashed PAN Detection"
  },
  {
    id: "T1499",
    tactic: "TA0040: Impact",
    name: "Endpoint Denial of Service & Flood",
    description: "Adversaries degrade or deny access to services by flooding rate limiters.",
    mappedTelemetry: "Velocity Spike (>3 tx/5s) & Rate Limit Quarantine Trigger"
  },
  {
    id: "T1565",
    tactic: "TA0040: Impact",
    name: "Data Manipulation & ACID Violation",
    description: "Adversaries insert, edit, or delete data to disrupt business transactions.",
    mappedTelemetry: "DB ACID Mutation Block & SHA-256 Merkle Chain Discrepancy"
  },
  {
    id: "T1587",
    tactic: "TA0006: Credential Access",
    name: "Develop Capabilities & Quantum Spoofing",
    description: "Adversaries exploit quantum key distribution or photon coherence instabilities.",
    mappedTelemetry: "QKD Photon Coherence Loss (<95%) & TRNG Entropy Drain"
  }
];

export const MitreAttackTab: React.FC = () => {
  const { records } = useStore();
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(MITRE_MATRIX[0]);

  // Compute live threat hits per MITRE technique
  const getHitCount = (techId: string) => {
    switch (techId) {
      case "T1078":
        return records.filter(r => r.flagType === "UNAUTHORIZED_ZERO_TRUST_AUTH").length;
      case "T1557":
        return records.filter(r => r.flagType === "HMAC_SIGNATURE_MISMATCH" || r.flagType === "AES_ENVELOPE_CORRUPT").length;
      case "T1005":
        return records.filter(r => r.flagType === "PII_TOKEN_LEAK_RISK" || r.flagType === "MULE_NODE_AGGREGATION").length;
      case "T1499":
        return records.filter(r => r.flagType === "VELOCITY_SPIKE" || r.escrow === "RATE_LIMITED").length;
      case "T1565":
        return records.filter(r => r.flagType === "DB_ACID_ROLLBACK_VIOLATION").length;
      case "T1587":
        return records.filter(r => r.flagType === "QUANTUM_REPLAY_ATTACK").length;
      default:
        return 0;
    }
  };

  const getMatchedRecords = (techId: string) => {
    return records.filter(r => {
      if (techId === "T1078") return r.flagType === "UNAUTHORIZED_ZERO_TRUST_AUTH";
      if (techId === "T1557") return r.flagType === "HMAC_SIGNATURE_MISMATCH" || r.flagType === "AES_ENVELOPE_CORRUPT";
      if (techId === "T1005") return r.flagType === "PII_TOKEN_LEAK_RISK" || r.flagType === "MULE_NODE_AGGREGATION";
      if (techId === "T1499") return r.flagType === "VELOCITY_SPIKE" || r.escrow === "RATE_LIMITED";
      if (techId === "T1565") return r.flagType === "DB_ACID_ROLLBACK_VIOLATION";
      if (techId === "T1587") return r.flagType === "QUANTUM_REPLAY_ATTACK";
      return false;
    });
  };

  return (
    <div className="mitre-tab-container">
      <div className="tab-header-row">
        <h2>MITRE ATT&CK Threat Telemetry Mapping Engine</h2>
      </div>

      <div className="mitre-workspace">
        {/* Left Side: MITRE Matrix Grid */}
        <div className="matrix-column">
          <div className="column-title">
            <Crosshair size={14} />
            <span>ADVERSARY TACTICS & TECHNIQUES MATRIX</span>
          </div>

          <div className="matrix-cards-grid">
            {MITRE_MATRIX.map(tech => {
              const hits = getHitCount(tech.id);
              const isSelected = selectedTechnique?.id === tech.id;
              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechnique(tech)}
                  className={`mitre-card ${isSelected ? "mitre-card-active" : ""} ${hits > 0 ? "card-has-threats" : ""}`}
                >
                  <div className="card-top">
                    <span className="tech-id font-mono">{tech.id}</span>
                    <span className={`hit-badge ${hits > 0 ? "error-badge" : "flat-badge"}`}>
                      {hits} TELEMETRY HITS
                    </span>
                  </div>
                  <div className="tech-name">{tech.name}</div>
                  <div className="tech-tactic">{tech.tactic}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Mapping Inspector */}
        <div className="inspector-column">
          {selectedTechnique ? (
            <div className="inspector-card flat-border">
              <div className="inspector-header">
                <div>
                  <span className="font-mono tech-tag">{selectedTechnique.id}</span>
                  <h3>{selectedTechnique.name}</h3>
                  <span className="tactic-subtitle">{selectedTechnique.tactic}</span>
                </div>
              </div>

              <div className="inspector-body">
                <div className="info-block">
                  <h4>MITRE ATT&CK TECHNIQUE DESCRIPTION</h4>
                  <p>{selectedTechnique.description}</p>
                </div>

                <div className="info-block border-highlight">
                  <h4>MAPPED SUGRIVA TELEMETRY ANOMALY INDICATORS</h4>
                  <p className="mapped-text">{selectedTechnique.mappedTelemetry}</p>
                </div>

                <div className="info-block">
                  <h4>LIVE CORRELATED TELEMETRY ANOMALIES ({getHitCount(selectedTechnique.id)})</h4>
                  <div className="hits-table-wrapper">
                    <table className="hits-table">
                      <thead>
                        <tr>
                          <th>TX ID</th>
                          <th>TIMESTAMP</th>
                          <th>VPA NODE</th>
                          <th>RISK INDEX</th>
                          <th>FLAG REASON</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getMatchedRecords(selectedTechnique.id).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="empty-msg">
                              No active telemetry stream matches technique {selectedTechnique.id}.
                            </td>
                          </tr>
                        ) : (
                          getMatchedRecords(selectedTechnique.id).map(r => (
                            <tr key={r.id}>
                              <td className="font-mono font-bold">{r.id}</td>
                              <td className="ts-col">{r.timestamp}</td>
                              <td className="vpa-col">{r.vpa}</td>
                              <td className="font-bold color-error">{r.risk.toFixed(4)}</td>
                              <td className="reason-col">{r.flagReason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="inspector-empty">Select a MITRE technique to inspect mapped telemetry.</div>
          )}
        </div>
      </div>

      <style>{`
        .mitre-tab-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px;
          overflow: hidden;
        }
        .tab-header-row {
          margin-bottom: 15px;
        }
        .tab-header-row h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
        }
        .mitre-workspace {
          flex: 1;
          display: flex;
          gap: 20px;
          overflow: hidden;
        }
        .matrix-column {
          flex: 0 0 380px;
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
          margin-bottom: 12px;
        }
        .matrix-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .mitre-card {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mitre-card:hover {
          border-color: var(--color-text-muted);
        }
        .mitre-card-active {
          border: var(--border-highlight);
          background-color: #fff5e6;
        }
        .card-has-threats {
          border-left: 3px solid var(--error-color);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .tech-id {
          font-weight: bold;
          font-size: 11px;
          color: var(--accent-primary);
        }
        .hit-badge {
          font-size: 9px;
          font-weight: bold;
        }
        .tech-name {
          font-weight: bold;
          font-size: 12px;
          color: var(--color-text);
          margin-bottom: 4px;
        }
        .tech-tactic {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .inspector-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .inspector-card {
          flex: 1;
          background-color: var(--bg-surface);
          padding: 20px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          border-radius: 3px;
        }
        .inspector-header {
          border-bottom: var(--border-default);
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .tech-tag {
          font-size: 11px;
          color: var(--accent-primary);
          font-weight: bold;
        }
        .inspector-header h3 {
          margin: 4px 0;
          font-size: 16px;
          font-weight: 800;
        }
        .tactic-subtitle {
          font-size: 11px;
          color: var(--color-text-muted);
        }
        .inspector-body {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .info-block {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
        }
        .info-block h4 {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .info-block p {
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
          color: var(--color-text);
        }
        .border-highlight {
          border-left: 3px solid var(--accent-primary);
        }
        .mapped-text {
          font-family: var(--font-mono);
          font-weight: 600;
          color: var(--accent-primary);
        }
        .hits-table-wrapper {
          overflow-y: auto;
          max-height: 200px;
          margin-top: 8px;
        }
        .hits-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        .hits-table th {
          position: sticky;
          top: 0;
          background-color: var(--bg-surface-active);
          padding: 6px 10px;
          font-weight: bold;
          border-bottom: var(--border-default);
          color: var(--color-text-muted);
        }
        .hits-table td {
          padding: 6px 10px;
          border-bottom: var(--border-default);
        }
        .font-mono { font-family: var(--font-mono); }
        .font-bold { font-weight: bold; }
        .ts-col { color: var(--color-text-muted); }
        .vpa-col { font-family: var(--font-mono); }
        .reason-col { color: var(--error-color); }
        .empty-msg { text-align: center; padding: 20px !important; color: var(--color-text-muted); }
        .color-error { color: var(--error-color); }
        .flat-badge {
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 2px 6px;
        }
      `}</style>
    </div>
  );
};
