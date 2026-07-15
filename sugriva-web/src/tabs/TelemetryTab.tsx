import React from "react";
import { useStore } from "../state/StoreContext";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, ShieldAlert } from "lucide-react";

interface TelemetryTabProps {
  activeRail: string | null;
}

export const TelemetryTab: React.FC<TelemetryTabProps> = ({ activeRail }) => {
  const { records } = useStore();

  const filtered = activeRail 
    ? records.filter(r => r.rail === activeRail)
    : records;

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
    return "";
  };

  return (
    <div className="telemetry-tab-container">
      <div className="tab-header-row">
        <h2>Live Transaction Log Ingestion Stream {activeRail && `[FILTER: ${activeRail}]`}</h2>
      </div>

      <div className="table-wrapper">
        <table className="telemetry-table">
          <thead>
            <tr>
              <th>TIMESTAMP</th>
              <th>RAIL</th>
              <th>NETWORK</th>
              <th>VPA NODE</th>
              <th>IP ADDRESS</th>
              <th>VEL</th>
              <th>RISK INDEX</th>
              <th>ESCROW ACTION</th>
              <th>AMOUNT (INR)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row-msg">
                  No telemetry stream matching filter constraints.
                </td>
              </tr>
            ) : (
              filtered.map((rec, i) => (
                <motion.tr 
                  key={rec.timestamp + i}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={getRiskColorClass(rec.risk)}
                >
                  <td className="timestamp-col">{rec.timestamp}</td>
                  <td className="rail-col">
                    {["UPI", "NEFT", "RTGS"].includes(rec.rail) ? (
                      <span className="inbound-rail"><ArrowDownLeft size={10} /> {rec.rail}</span>
                    ) : (
                      <span className="outbound-rail"><ArrowUpRight size={10} /> {rec.rail}</span>
                    )}
                  </td>
                  <td>{rec.network}</td>
                  <td className="vpa-col">{rec.vpa}</td>
                  <td>{rec.ip}</td>
                  <td className="center-col">{rec.velocity}</td>
                  <td className="risk-col font-bold" style={{ color: rec.risk >= 0.75 ? "var(--error-color)" : rec.risk >= 0.5 ? "var(--warning-color)" : "var(--success-color)" }}>
                    {rec.risk.toFixed(4)}
                  </td>
                  <td>{getEscrowBadge(rec.escrow)}</td>
                  <td className="amount-col font-bold">
                    ₹{rec.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
          margin-bottom: 15px;
        }
        .tab-header-row h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
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
          font-size: 12px;
        }
        .telemetry-table th {
          position: sticky;
          top: 0;
          background-color: var(--bg-surface-active);
          padding: 10px 15px;
          font-weight: bold;
          border-bottom: var(--border-default);
          font-size: 11px;
          color: var(--color-text-muted);
          z-index: 1;
        }
        .telemetry-table td {
          padding: 8px 15px;
          border-bottom: var(--border-default);
        }
        .timestamp-col {
          color: var(--color-text-muted);
        }
        .vpa-col {
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .center-col {
          text-align: center;
        }
        .font-bold {
          font-weight: bold;
        }
        .amount-col {
          text-align: right;
          color: var(--color-text);
        }
        .empty-row-msg {
          text-align: center;
          padding: 40px !important;
          color: var(--color-text-muted);
        }
        .inbound-rail {
          color: var(--quantum-color);
          font-weight: bold;
        }
        .outbound-rail {
          color: var(--accent-primary);
          font-weight: bold;
        }
        .row-danger {
          background-color: var(--error-bg);
        }
        .row-warning {
          background-color: var(--warning-bg);
        }
        .flex-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
};
