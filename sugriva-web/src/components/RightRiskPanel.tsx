import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { TrendingUp, PanelRightClose, PanelRightOpen, ShieldAlert, Activity } from "lucide-react";

export const RightRiskPanel: React.FC = () => {
  const { records, threshold } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get active stats from the record buffer
  const total = records.length || 1;
  const clearCnt = records.filter(r => r.escrow === "CLEAR").length;
  const pendingCnt = records.filter(r => r.escrow === "PENDING").length;
  const threatCnt = records.filter(r => ["ISOLATED", "RATE_LIMITED", "AUTO_FROZEN"].includes(r.escrow)).length;
  const quantumCnt = records.filter(r => r.risk >= 0.75 && (r.network === "BLOCKED" || r.vpa.includes("vault"))).length;

  const getScaleBlocks = (cnt: number) => {
    const w = Math.min(15, Math.round((cnt / total) * 15)) || 0;
    return {
      filled: "█".repeat(w),
      empty: "░".repeat(15 - w),
      count: cnt
    };
  };

  const getQuantumBlocks = (cnt: number) => {
    const w = Math.min(15, cnt);
    return {
      filled: "█".repeat(w),
      empty: "░".repeat(15 - w),
      count: cnt
    };
  };

  const passBlocks = getScaleBlocks(clearCnt);
  const stepBlocks = getScaleBlocks(pendingCnt);
  const blockBlocks = getScaleBlocks(threatCnt);
  const qBlocks = getQuantumBlocks(quantumCnt);

  // Latest record SHAP variables
  const latest = records[0] || {
    risk: 0.00,
    shap: { ip_anomaly: 0.05, auth_discrepancy: 0.05, velocity_impact: 0.05, quantum_channel_instability: 0.0, entropy_drain: 0.0, pqc_decryption_anomalies: 0.0 }
  };

  const getRiskColor = (risk: number) => {
    if (risk >= threshold) return "var(--error-color)";
    if (risk >= 0.50) return "var(--warning-color)";
    return "var(--success-color)";
  };

  return (
    <aside className={`risk-panel-container ${isCollapsed ? "risk-panel-collapsed" : ""}`}>
      {/* Panel Header with Collapse Toggle */}
      <div className="panel-header">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="collapse-toggle-btn"
          title={isCollapsed ? "Expand Risk Panel" : "Collapse Risk Panel"}
        >
          {isCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>

        {!isCollapsed && <span className="header-title">DYNAMIC RISK RATIO</span>}
      </div>

      {!isCollapsed ? (
        /* Expanded Full Risk Panel */
        <>
          {/* Main Risk Ratio Header */}
          <div className="risk-hero">
            <span className="risk-title" style={{ color: getRiskColor(latest.risk) }}>
              risk: {latest.risk.toFixed(4)}
            </span>
          </div>

          {/* SHAP Weight Progress bars */}
          <div className="shap-section">
            <span className="section-title">SHAP AT-RUN INFERENCE WEIGHTS</span>
            
            <div className="shap-item">
              <div className="shap-label">
                <span>IP Anomaly Weight</span>
                <span>{latest.shap.ip_anomaly.toFixed(4)}</span>
              </div>
              <div className="shap-track">
                <div className="shap-bar orange-bar" style={{ width: `${latest.shap.ip_anomaly * 100}%` }} />
              </div>
            </div>

            <div className="shap-item">
              <div className="shap-label">
                <span>Auth Status Discrepancy</span>
                <span>{latest.shap.auth_discrepancy.toFixed(4)}</span>
              </div>
              <div className="shap-track">
                <div className="shap-bar orange-bar" style={{ width: `${latest.shap.auth_discrepancy * 100}%` }} />
              </div>
            </div>

            <div className="shap-item">
              <div className="shap-label">
                <span>Velocity Scale Impact</span>
                <span>{latest.shap.velocity_impact.toFixed(4)}</span>
              </div>
              <div className="shap-track">
                <div className="shap-bar orange-bar" style={{ width: `${latest.shap.velocity_impact * 100}%` }} />
              </div>
            </div>

            <div className="shap-item">
              <div className="shap-label">
                <span>Post-Quantum Channel Instability</span>
                <span>{latest.shap.quantum_channel_instability.toFixed(4)}</span>
              </div>
              <div className="shap-track">
                <div className="shap-bar quantum-bar" style={{ width: `${latest.shap.quantum_channel_instability * 100}%` }} />
              </div>
            </div>

            <div className="shap-item">
              <div className="shap-label">
                <span>TRNG Entropy Drain</span>
                <span>{latest.shap.entropy_drain.toFixed(4)}</span>
              </div>
              <div className="shap-track">
                <div className="shap-bar quantum-bar" style={{ width: `${latest.shap.entropy_drain * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Auth Telemetry sparkline block */}
          <div className="graph-section">
            <div className="graph-header">
              <TrendingUp size={14} className="graph-header-icon" />
              <span>AUTH ROUTING TELEMETRY</span>
            </div>
            <div className="graph-row">
              <span className="graph-label">Pass:</span>
              <span className="graph-sparkline pass-spark">
                | <span className="bar-solid">{passBlocks.filled}</span>{passBlocks.empty} |
              </span>
              <span className="graph-count">({passBlocks.count})</span>
            </div>
            <div className="graph-row">
              <span className="graph-label">Step-up:</span>
              <span className="graph-sparkline step-spark">
                | <span className="bar-solid">{stepBlocks.filled}</span>{stepBlocks.empty} |
              </span>
              <span className="graph-count">({stepBlocks.count})</span>
            </div>
          </div>

          {/* Threat Detections sparkline block */}
          <div className="graph-section border-top-divider">
            <div className="graph-header threat-header">
              <TrendingUp size={14} className="graph-header-icon" />
              <span>THREAT & QUANTUM DETECTIONS</span>
            </div>
            <div className="graph-row">
              <span className="graph-label">Blocks:</span>
              <span className="graph-sparkline block-spark">
                | <span className="bar-solid">{blockBlocks.filled}</span>{blockBlocks.empty} |
              </span>
              <span className="graph-count">({blockBlocks.count})</span>
            </div>
            <div className="graph-row">
              <span className="graph-label">Quantum:</span>
              <span className="graph-sparkline quantum-spark">
                | <span className="bar-solid">{qBlocks.filled}</span>{qBlocks.empty} |
              </span>
              <span className="graph-count">({qBlocks.count})</span>
            </div>
          </div>
        </>
      ) : (
        /* Collapsed Compact View */
        <div className="collapsed-risk-view">
          {/* Compact Risk Score Badge */}
          <div
            className="compact-risk-badge"
            style={{ color: getRiskColor(latest.risk), borderColor: getRiskColor(latest.risk) }}
            title={`Current Risk: ${latest.risk.toFixed(4)}`}
          >
            <Activity size={12} />
            <span className="risk-num">{latest.risk.toFixed(2)}</span>
          </div>

          <div className="collapsed-divider" />

          {/* Compact SHAP Indicators */}
          <div className="compact-shap-list">
            <div className="compact-shap-item" title={`IP Anomaly: ${latest.shap.ip_anomaly.toFixed(4)}`}>
              <span>IP</span>
              <div className="mini-track">
                <div className="mini-bar orange-bar" style={{ width: `${latest.shap.ip_anomaly * 100}%` }} />
              </div>
            </div>

            <div className="compact-shap-item" title={`Auth Discrepancy: ${latest.shap.auth_discrepancy.toFixed(4)}`}>
              <span>ATH</span>
              <div className="mini-track">
                <div className="mini-bar orange-bar" style={{ width: `${latest.shap.auth_discrepancy * 100}%` }} />
              </div>
            </div>

            <div className="compact-shap-item" title={`Velocity Scale: ${latest.shap.velocity_impact.toFixed(4)}`}>
              <span>VEL</span>
              <div className="mini-track">
                <div className="mini-bar orange-bar" style={{ width: `${latest.shap.velocity_impact * 100}%` }} />
              </div>
            </div>

            <div className="compact-shap-item" title={`QKD Instability: ${latest.shap.quantum_channel_instability.toFixed(4)}`}>
              <span>QKD</span>
              <div className="mini-track">
                <div className="mini-bar quantum-bar" style={{ width: `${latest.shap.quantum_channel_instability * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="collapsed-divider" />

          {/* Compact Threat Counters */}
          <div className="compact-counters">
            <div className="mini-count-badge pass-badge" title={`Pass: ${clearCnt}`}>
              <span>P:</span> <strong>{clearCnt}</strong>
            </div>

            <div className="mini-count-badge threat-badge" title={`Blocked Threats: ${threatCnt}`}>
              <ShieldAlert size={10} />
              <strong>{threatCnt}</strong>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .risk-panel-container {
          width: 320px;
          background-color: var(--bg-surface);
          border-left: var(--border-default);
          display: flex;
          flex-direction: column;
          padding: 15px;
          user-select: none;
          overflow-y: auto;
          transition: width 0.2s ease-in-out;
          flex-shrink: 0;
        }
        .risk-panel-collapsed {
          width: 48px;
          padding: 12px 6px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          letter-spacing: 1px;
          color: var(--accent-primary);
          margin-bottom: 15px;
        }
        .collapse-toggle-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 2px;
          transition: color 0.15s;
        }
        .collapse-toggle-btn:hover {
          color: var(--accent-primary);
        }
        .header-title {
          font-weight: bold;
          letter-spacing: 1px;
        }
        .risk-hero {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 15px;
          text-align: center;
          border-radius: 2px;
          margin-bottom: 20px;
        }
        .risk-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .shap-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 10px;
          font-weight: bold;
          color: var(--color-text-muted);
          letter-spacing: 0.5px;
        }
        .shap-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .shap-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--color-text);
          font-weight: 500;
        }
        .shap-track {
          height: 6px;
          background-color: var(--bg-surface-active);
          border-radius: 3px;
          overflow: hidden;
        }
        .shap-bar {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .orange-bar {
          background-color: var(--accent-primary);
        }
        .quantum-bar {
          background-color: var(--quantum-color);
        }
        .graph-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 15px 0;
        }
        .border-top-divider {
          border-top: var(--border-default);
        }
        .graph-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: bold;
          font-size: 11px;
          letter-spacing: 0.5px;
          color: var(--success-color);
          margin-bottom: 6px;
        }
        .threat-header {
          color: var(--error-color);
        }
        .graph-header-icon {
          flex-shrink: 0;
        }
        .graph-row {
          display: flex;
          align-items: center;
          font-size: 11px;
          color: var(--color-text);
        }
        .graph-label {
          width: 65px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .graph-sparkline {
          font-family: var(--font-mono);
          letter-spacing: 0.5px;
          margin-right: 8px;
          color: #cccccc;
        }
        .bar-solid {
          font-weight: bold;
        }
        .pass-spark .bar-solid {
          color: var(--success-color);
        }
        .step-spark .bar-solid {
          color: var(--warning-color);
        }
        .block-spark .bar-solid {
          color: var(--error-color);
        }
        .quantum-spark .bar-solid {
          color: var(--quantum-color);
        }
        .graph-count {
          color: var(--color-text-muted);
          font-weight: 500;
        }

        /* Collapsed View Styles */
        .collapsed-risk-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .compact-risk-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid var(--border-default);
          background-color: var(--bg-primary);
          border-radius: 3px;
          font-family: var(--font-mono);
          font-weight: bold;
        }
        .risk-num {
          font-size: 9px;
          line-height: 1;
          margin-top: 1px;
        }
        .collapsed-divider {
          width: 100%;
          border-top: 1px dashed var(--color-text-muted);
          margin: 2px 0;
        }
        .compact-shap-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .compact-shap-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 8px;
          font-weight: bold;
          color: var(--color-text-muted);
          gap: 2px;
        }
        .mini-track {
          width: 30px;
          height: 4px;
          background-color: var(--bg-surface-active);
          border-radius: 2px;
          overflow: hidden;
        }
        .mini-bar {
          height: 100%;
          border-radius: 2px;
        }
        .compact-counters {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
        }
        .mini-count-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 9px;
          font-weight: bold;
        }
        .pass-badge {
          background-color: var(--success-bg);
          color: var(--success-color);
          border: var(--border-success);
        }
        .threat-badge {
          background-color: var(--error-bg);
          color: var(--error-color);
          border: var(--border-error);
        }
      `}</style>
    </aside>
  );
};
