import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import type { FlagType } from "../state/mockEngine";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ShieldAlert,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  Lock,
  Key,
  RotateCcw,
  CheckCircle2
} from "lucide-react";

interface TelemetryTabProps {
  activeRail: string | null;
}

type SortField = "risk" | "amount" | "timestamp" | "velocity" | "severity";

export const TelemetryTab: React.FC<TelemetryTabProps> = ({ activeRail }) => {
  const { records, executeManualAudit } = useStore();

  // Filtration & Sorting States
  const [filterMode, setFilterMode] = useState<"ALL" | "FLAGGED_ONLY">("ALL");
  const [selectedFlagType, setSelectedFlagType] = useState<FlagType | "ALL">("ALL");
  const [priorityToggle, setPriorityToggle] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter logic
  let processed = activeRail
    ? records.filter(r => r.rail === activeRail)
    : records;

  if (filterMode === "FLAGGED_ONLY") {
    processed = processed.filter(r => r.flagged || r.risk >= 0.5);
  }

  if (selectedFlagType !== "ALL") {
    processed = processed.filter(r => r.flagType === selectedFlagType);
  }

  // Priority toggle logic: Elevate high risk / anomaly transactions to the top
  if (priorityToggle) {
    processed = [...processed].sort((a, b) => b.risk - a.risk);
  } else {
    // Standard sorting
    processed = [...processed].sort((a, b) => {
      let valA: number | string = a.risk;
      let valB: number | string = b.risk;

      if (sortField === "amount") {
        valA = a.amount;
        valB = b.amount;
      } else if (sortField === "timestamp") {
        valA = a.timestamp;
        valB = b.timestamp;
      } else if (sortField === "velocity") {
        valA = a.velocity;
        valB = b.velocity;
      } else if (sortField === "risk" || sortField === "severity") {
        valA = a.risk;
        valB = b.risk;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  const getEscrowBadge = (escrow: string) => {
    switch (escrow) {
      case "CLEAR":
        return <span className="success-badge">CLEAR</span>;
      case "PENDING":
        return <span className="warning-badge">PENDING OTP</span>;
      case "ISOLATED":
        return <span className="error-badge">ISOLATED</span>;
      case "RATE_LIMITED":
        return <span className="error-badge">RATE LIMITED</span>;
      case "AUTO_FROZEN":
        return <span className="error-badge flex-badge"><ShieldAlert size={10} /> AUTO FROZEN</span>;
      case "MULE_SUSPENDED":
        return <span className="error-badge flex-badge" style={{ backgroundColor: "#ffe6ff", color: "#cc00cc", border: "1px solid #cc00cc" }}><ShieldAlert size={10} /> MULE SUSPENDED</span>;
      default:
        return <span className="flat-badge">{escrow}</span>;
    }
  };

  const getRiskColorClass = (risk: number) => {
    if (risk >= 0.75) return "row-danger";
    if (risk >= 0.50) return "row-warning";
    return "row-normal";
  };

  return (
    <div className="telemetry-tab-container">
      {/* Tab Header & Filtration / Sorting Control Bar */}
      <div className="tab-header-row">
        <h2>Live Transaction Telemetry Ingestion & Anomaly Filtration Stream</h2>
      </div>

      {/* Control Panel: Filters, Priority Toggle, and Sorting */}
      <div className="telemetry-controls-bar">
        {/* Filter Toggle: All vs Anomalies Only */}
        <div className="filter-group">
          <Filter size={12} className="icon-muted" />
          <button
            onClick={() => setFilterMode("ALL")}
            className={`filter-btn ${filterMode === "ALL" ? "filter-active" : ""}`}
          >
            All Telemetry ({records.length})
          </button>
          <button
            onClick={() => setFilterMode("FLAGGED_ONLY")}
            className={`filter-btn ${filterMode === "FLAGGED_ONLY" ? "filter-active-flagged" : ""}`}
          >
            <AlertTriangle size={10} />
            Anomalies & Flagged Only ({records.filter(r => r.flagged || r.risk >= 0.5).length})
          </button>
        </div>

        {/* Filter by Flagging Type */}
        <div className="filter-dropdown-group">
          <label>FLAG TYPE:</label>
          <select
            value={selectedFlagType}
            onChange={(e) => setSelectedFlagType(e.target.value as FlagType | "ALL")}
            className="control-select"
          >
            <option value="ALL">All Flag Types</option>
            <option value="HMAC_SIGNATURE_MISMATCH">HMAC Signature Mismatch</option>
            <option value="PII_TOKEN_LEAK_RISK">PII Token Leak Risk</option>
            <option value="MITRE_TACTIC_SPIKE">MITRE Tactic Spike</option>
            <option value="AES_ENVELOPE_CORRUPT">AES Envelope Corrupt</option>
            <option value="QUANTUM_REPLAY_ATTACK">Quantum Replay Attack</option>
            <option value="DB_ACID_ROLLBACK_VIOLATION">DB ACID Rollback Violation</option>
            <option value="UNAUTHORIZED_ZERO_TRUST_AUTH">Unauthorized Zero-Trust Auth</option>
            <option value="VELOCITY_SPIKE">Velocity Spike Flood</option>
            <option value="MULE_NODE_AGGREGATION">Mule Node Aggregation</option>
          </select>
        </div>

        {/* Priority Toggle */}
        <button
          onClick={() => setPriorityToggle(!priorityToggle)}
          className={`priority-toggle-btn ${priorityToggle ? "priority-active" : ""}`}
        >
          <ShieldAlert size={12} />
          <span>PRIORITY: {priorityToggle ? "ANOMALY SET FIRST" : "STANDARD"}</span>
        </button>

        {/* Sorting System */}
        <div className="sort-group">
          <ArrowUpDown size={12} className="icon-muted" />
          <label>SORT BY:</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="control-select"
          >
            <option value="risk">Risk Index</option>
            <option value="amount">Amount (INR)</option>
            <option value="timestamp">Timestamp</option>
            <option value="velocity">Velocity</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="order-btn"
          >
            {sortOrder.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Table Stream */}
      <div className="table-wrapper">
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>ID & TIMESTAMP</th>
              <th>RAIL</th>
              <th>VPA NODE</th>
              <th>RISK INDEX</th>
              <th>EXPLICIT REASON FOR FLAGGING</th>
              <th>FLAGGING TYPE</th>
              <th>ESCROW STATE</th>
              <th>AMOUNT (INR)</th>
              <th>MANUAL AUDIT ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {processed.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row-msg">
                  No telemetry transactions matching active filtration parameters.
                </td>
              </tr>
            ) : (
              processed.map((rec) => (
                <motion.tr
                  key={rec.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={getRiskColorClass(rec.risk)}
                >
                  <td className="timestamp-col">
                    <div className="font-bold font-mono">{rec.id}</div>
                    <div className="ts-sub">{rec.timestamp}</div>
                  </td>
                  <td className="rail-col">
                    {["UPI", "NEFT", "RTGS"].includes(rec.rail) ? (
                      <span className="inbound-rail"><ArrowDownLeft size={10} /> {rec.rail}</span>
                    ) : (
                      <span className="outbound-rail"><ArrowUpRight size={10} /> {rec.rail}</span>
                    )}
                  </td>
                  <td className="vpa-col">{rec.vpa}</td>
                  <td className="risk-col font-bold" style={{ color: rec.risk >= 0.75 ? "var(--error-color)" : rec.risk >= 0.5 ? "var(--warning-color)" : "var(--success-color)" }}>
                    {rec.risk.toFixed(4)}
                  </td>

                  {/* Explicit Reason for Flagging */}
                  <td className="reason-col">
                    <div className={`reason-text-box ${rec.flagged ? "flagged-box" : ""}`}>
                      {rec.flagReason}
                    </div>
                  </td>

                  <td>
                    <span className={`flag-type-badge ${rec.flagType !== "NORMAL" ? "flagged-type" : ""}`}>
                      {rec.flagType}
                    </span>
                  </td>

                  <td>{getEscrowBadge(rec.escrow)}</td>

                  <td className="amount-col font-bold">
                    ₹{rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* Manual Audit Action Buttons */}
                  <td className="actions-cell">
                    {rec.flagged || rec.risk >= 0.5 ? (
                      <div className="inline-audit-group">
                        <button
                          title="Quarantine Account"
                          onClick={() => executeManualAudit(rec.id, "QUARANTINE")}
                          className="mini-audit-btn btn-quarantine"
                        >
                          <Lock size={10} />
                        </button>
                        <button
                          title="Revoke Session Keys"
                          onClick={() => executeManualAudit(rec.id, "REVOKE_SESSION")}
                          className="mini-audit-btn btn-revoke"
                        >
                          <Key size={10} />
                        </button>
                        <button
                          title="Execute DB Rollback"
                          onClick={() => executeManualAudit(rec.id, "ROLLBACK_DB")}
                          className="mini-audit-btn btn-rollback"
                        >
                          <RotateCcw size={10} />
                        </button>
                        <button
                          title="Override & Approve"
                          onClick={() => executeManualAudit(rec.id, "OVERRIDE")}
                          className="mini-audit-btn btn-approve"
                        >
                          <CheckCircle2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <span className="clear-tag">CLEAR</span>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .telemetry-tab-container {
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
        .telemetry-controls-bar {
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
        .filter-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filter-btn {
          background: transparent;
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .filter-active {
          background-color: var(--bg-primary);
          color: var(--color-text);
          border-color: var(--color-text-muted);
        }
        .filter-active-flagged {
          background-color: var(--error-bg);
          color: var(--error-color);
          border: var(--border-error);
        }
        .filter-dropdown-group, .sort-group {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .control-select {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 3px 8px;
          font-size: 11px;
          font-family: var(--font-mono);
        }
        .priority-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .priority-active {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .order-btn {
          background: var(--bg-primary);
          border: var(--border-default);
          padding: 3px 8px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
        }
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
          border: var(--border-default);
          background-color: var(--bg-surface);
        }
        .telemetry-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        .telemetry-table th {
          position: sticky;
          top: 0;
          background-color: var(--bg-surface-active);
          padding: 8px 12px;
          font-weight: bold;
          border-bottom: var(--border-default);
          font-size: 10px;
          color: var(--color-text-muted);
          z-index: 1;
        }
        .telemetry-table td {
          padding: 8px 12px;
          border-bottom: var(--border-default);
          vertical-align: middle;
        }
        .timestamp-col { color: var(--color-text-muted); }
        .ts-sub { font-size: 10px; opacity: 0.8; }
        .vpa-col { font-family: var(--font-mono); font-weight: 600; }
        .amount-col { text-align: right; }
        .reason-col { max-width: 320px; }
        .reason-text-box {
          font-size: 10px;
          line-height: 1.3;
          color: var(--color-text);
        }
        .flagged-box {
          font-weight: 600;
          color: var(--error-color);
        }
        .flag-type-badge {
          font-size: 9px;
          padding: 2px 6px;
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          color: var(--color-text-muted);
          border-radius: 2px;
          font-family: var(--font-mono);
        }
        .flagged-type {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
          font-weight: bold;
        }
        .inline-audit-group {
          display: flex;
          gap: 4px;
        }
        .mini-audit-btn {
          border: none;
          padding: 4px;
          border-radius: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-quarantine { background-color: var(--warning-bg); border: var(--border-highlight); color: var(--warning-color); }
        .btn-revoke { background-color: var(--bg-surface-active); border: var(--border-default); color: var(--color-text); }
        .btn-rollback { background-color: var(--quantum-bg); border: 1px solid var(--quantum-color); color: var(--quantum-color); }
        .btn-approve { background-color: var(--success-bg); border: var(--border-success); color: var(--success-color); }
        .clear-tag { font-size: 9px; color: var(--success-color); font-weight: bold; }
        .empty-row-msg { text-align: center; padding: 40px !important; color: var(--color-text-muted); }
        .inbound-rail { color: var(--quantum-color); font-weight: bold; }
        .outbound-rail { color: var(--accent-primary); font-weight: bold; }
        .row-danger { background-color: var(--error-bg); }
        .row-warning { background-color: var(--warning-bg); }
        .row-normal { background-color: #ffffff; }
        .flex-badge { display: inline-flex; align-items: center; gap: 4px; }
        .icon-muted { color: var(--color-text-muted); }
      `}</style>
    </div>
  );
};
