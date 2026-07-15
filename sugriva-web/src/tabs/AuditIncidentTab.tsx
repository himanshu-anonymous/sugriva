import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { ShieldAlert, BookOpen, Clock } from "lucide-react";

export const AuditIncidentTab: React.FC = () => {
  const { auditLogs, incidents } = useStore();
  const [activeSub, setActiveSub] = useState<"audit" | "incidents">("audit");
  const [, setTick] = useState(0);

  // Dynamic SLA Countdown timer tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRemainingTime = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - Date.now();
    if (diff <= 0) return "EXPIRED (SLA BREACH)";
    
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="audit-tab-container">
      <div className="tab-header-row">
        <h2>Verifiable Hash Chains & incident Reporting Registry</h2>
      </div>

      <div className="tab-navigation">
        <button 
          onClick={() => setActiveSub("audit")} 
          className={`subnav-btn ${activeSub === "audit" ? "active-subnav" : ""}`}
        >
          <BookOpen size={12} />
          <span>Verifiable Audit Log Chains (SHA-256)</span>
        </button>
        <button 
          onClick={() => setActiveSub("incidents")} 
          className={`subnav-btn ${activeSub === "incidents" ? "active-subnav" : ""}`}
        >
          <ShieldAlert size={12} />
          <span>CERT-In Cyber Incident Incident Log (6-Hour SLA)</span>
        </button>
      </div>

      <div className="subworkspace flat-border">
        {activeSub === "audit" ? (
          <div className="audit-workspace">
            <div className="table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>USER ROLE</th>
                    <th>SECURITY DISPATCH ACTION</th>
                    <th>COMPLIANCE STATUS</th>
                    <th>PREV HASH LINK</th>
                    <th>CURRENT HASH</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-row-msg">
                        No cryptographic audit logs written.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, i) => (
                      <tr key={log.timestamp + i}>
                        <td className="ts-col">{log.timestamp}</td>
                        <td className="vpa-col">{log.role}</td>
                        <td className="action-col">{log.action}</td>
                        <td>
                          <span className={`status-badge ${log.status === "DENIED" || log.status === "CRITICAL" ? "error-badge" : "success-badge"}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="hash-col">{log.prevHash.substring(0, 10)}...</td>
                        <td className="hash-col">{log.currHash.substring(0, 10)}...</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="incidents-workspace">
            <div className="table-wrapper">
              <table className="incidents-table">
                <thead>
                  <tr>
                    <th>INCIDENT ID</th>
                    <th>QUARANTINED VPA</th>
                    <th>SEVERITY</th>
                    <th>MESSAGE RAIL</th>
                    <th>DETECTION TIME</th>
                    <th>SLA TIMELINE LIMIT</th>
                    <th>INCIDENT ACTIONS STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-row-msg">
                        No high-risk security threat incidents reported.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc, i) => (
                      <tr key={inc.id + i} className="incident-row">
                        <td className="font-bold">{inc.id}</td>
                        <td className="vpa-col">{inc.vpa}</td>
                        <td>
                          <span className={`status-badge ${inc.severity === "CRITICAL" ? "error-badge" : "warning-badge"}`}>
                            {inc.severity}
                          </span>
                        </td>
                        <td>{inc.rail}</td>
                        <td className="ts-col">{new Date(inc.detectionTime).toLocaleTimeString()}</td>
                        <td className="sla-col font-bold">
                          <Clock size={10} className="sla-icon" />
                          <span>{getRemainingTime(inc.slaDeadline)}</span>
                        </td>
                        <td className="status-col">{inc.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .audit-tab-container {
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
        .tab-navigation {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
        .subnav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
          color: var(--color-text-muted);
          padding: 8px 12px;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .subnav-btn:hover {
          color: var(--accent-primary);
        }
        .active-subnav {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .subworkspace {
          flex: 1;
          background-color: var(--bg-surface);
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .audit-workspace, .incidents-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
        }
        .audit-table, .incidents-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }
        .audit-table th, .incidents-table th {
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
        .audit-table td, .incidents-table td {
          padding: 10px 15px;
          border-bottom: var(--border-default);
        }
        .ts-col {
          color: var(--color-text-muted);
        }
        .vpa-col {
          font-family: var(--font-mono);
          font-weight: bold;
        }
        .action-col {
          font-weight: 500;
        }
        .hash-col {
          font-family: var(--font-mono);
          color: var(--color-text-muted);
        }
        .font-bold {
          font-weight: bold;
        }
        .sla-col {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--error-color);
        }
        .sla-icon {
          flex-shrink: 0;
        }
        .incident-row {
          background-color: var(--error-bg);
        }
        .status-col {
          font-weight: bold;
          color: var(--error-color);
        }
        .empty-row-msg {
          text-align: center;
          padding: 40px !important;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};
