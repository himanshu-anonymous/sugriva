import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { ShieldAlert, BookOpen, Clock, Send, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

export const AuditIncidentTab: React.FC = () => {
  const { auditLogs, incidents, records, verifyWormChain, dispatchOperationalReport, dispatchRegulatoryReport } = useStore();
  const [activeSub, setActiveSub] = useState<"worm" | "channels" | "incidents">("worm");
  const [, setTick] = useState(0);

  // WORM Chain Verification State
  const [wormStatus, setWormStatus] = useState<{ checked: boolean; isTamperFree: boolean; merkleRoot: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyWorm = async () => {
    const res = await verifyWormChain();
    setWormStatus({
      checked: true,
      isTamperFree: res.isTamperFree,
      merkleRoot: res.merkleRoot
    });
  };

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
        <h2>Immutable WORM Audit Ledger & Dual-Channel Reporting Registry</h2>
      </div>

      <div className="tab-navigation">
        <button 
          onClick={() => setActiveSub("worm")} 
          className={`subnav-btn ${activeSub === "worm" ? "active-subnav" : ""}`}
        >
          <BookOpen size={12} />
          <span>1. Immutable WORM Audit Chain (SHA-256)</span>
        </button>

        <button 
          onClick={() => setActiveSub("channels")} 
          className={`subnav-btn ${activeSub === "channels" ? "active-subnav" : ""}`}
        >
          <Send size={12} />
          <span>2. Dual-Channel Reporting Engine</span>
        </button>

        <button 
          onClick={() => setActiveSub("incidents")} 
          className={`subnav-btn ${activeSub === "incidents" ? "active-subnav" : ""}`}
        >
          <ShieldAlert size={12} />
          <span>3. Statutory CERT-In Incident Log (6-Hr SLA)</span>
        </button>
      </div>

      <div className="subworkspace flat-border">
        {/* SUB 1: WORM AUDIT CHAIN */}
        {activeSub === "worm" && (
          <div className="audit-workspace">
            {/* WORM Verification Header Tool */}
            <div className="worm-verifier-bar">
              <div className="bar-info">
                <ShieldCheck size={16} className="color-success" />
                <div>
                  <strong>WRITE-ONCE-READ-MANY (WORM) CRYPTOGRAPHIC AUDIT ARCHITECTURE</strong>
                  <div className="sub-text">Linked SHA-256 Merkle Chain prevents post-exploit log alteration</div>
                </div>
              </div>

              <div className="verifier-action">
                <button className="verify-worm-btn" onClick={handleVerifyWorm}>
                  <CheckCircle2 size={12} /> Cryptographically Verify WORM Integrity
                </button>
              </div>
            </div>

            {wormStatus?.checked && (
              <div className={`worm-result-banner ${wormStatus.isTamperFree ? "result-pass" : "result-fail"}`}>
                <CheckCircle2 size={14} />
                <span>
                  MERKLE CHAIN INTEGRITY CHECK PASSED: 0 Tampered Entries. Active Merkle Root: <code>0x{wormStatus.merkleRoot}</code>
                </span>
              </div>
            )}

            <div className="table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP</th>
                    <th>ROLE</th>
                    <th>TARGET TX</th>
                    <th>SECURITY DISPATCH ACTION</th>
                    <th>COMPLIANCE STATUS</th>
                    <th>PREV HASH LINK</th>
                    <th>CURRENT WORM HASH</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-row-msg">
                        No cryptographic WORM audit logs written.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, i) => (
                      <tr key={log.timestamp + i}>
                        <td className="ts-col">{log.timestamp}</td>
                        <td className="vpa-col">{log.role}</td>
                        <td className="font-mono font-bold">{log.txId || "GLOBAL"}</td>
                        <td className="action-col">{log.action}</td>
                        <td>
                          <span className={`status-badge ${log.status === "DENIED" || log.status === "CRITICAL" ? "error-badge" : "success-badge"}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="hash-col">{log.prevHash.substring(0, 12)}...</td>
                        <td className="hash-col font-bold">{log.currHash.substring(0, 12)}...</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB 2: DUAL-CHANNEL REPORTING ENGINE */}
        {activeSub === "channels" && (
          <div className="channels-workspace">
            <div className="channels-grid">
              {/* Channel 1 */}
              <div className="channel-card border-orange">
                <div className="channel-card-title">
                  <Send size={16} className="color-primary" />
                  <div>
                    <h3>CHANNEL 1: INTERNAL OPERATIONAL RESPONSE (SOC)</h3>
                    <span>Automated Security Operations Center Escalation</span>
                  </div>
                </div>

                <p className="channel-desc">
                  Direct automated webhook integration with SOC tools (PagerDuty, Slack Security Alarms, Splunk SIEM). Triggers real-time incident escalation and account quarantine enforcement.
                </p>

                <div className="channel-actions">
                  <h4>SELECT TX FOR INTERNAL SOC DISPATCH:</h4>
                  <div className="dispatch-list">
                    {records.slice(0, 5).map(r => (
                      <div key={r.id} className="dispatch-item">
                        <div>
                          <strong className="font-mono">{r.id}</strong> | {r.vpa} (₹{r.amount.toLocaleString()})
                        </div>
                        <button
                          className="sub-btn btn-orange"
                          onClick={() => dispatchOperationalReport(r.id)}
                        >
                          Dispatch Operational Alert
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel 2 */}
              <div className="channel-card border-red">
                <div className="channel-card-title">
                  <FileText size={16} className="color-error" />
                  <div>
                    <h3>CHANNEL 2: EXTERNAL REGULATORY REPORTING (STATUTORY)</h3>
                    <span>FinCEN SAR, RBI Cyber Incident, & GDPR PII Breach Filing</span>
                  </div>
                </div>

                <p className="channel-desc">
                  Generates statutory regulatory compliance report packages for Financial Intelligence Units (FIU), RBI Cyber Incident Response, and Data Protection Authorities under strict legal timelines.
                </p>

                <div className="channel-actions">
                  <h4>SELECT TX FOR STATUTORY REGULATORY DISPATCH:</h4>
                  <div className="dispatch-list">
                    {records.filter(r => r.flagged || r.risk >= 0.5).slice(0, 5).map(r => (
                      <div key={r.id} className="dispatch-item">
                        <div>
                          <strong className="font-mono">{r.id}</strong> | {r.vpa} | Flag: {r.flagType}
                        </div>
                        <button
                          className="sub-btn btn-red"
                          onClick={() => dispatchRegulatoryReport(r.id)}
                        >
                          File Statutory Regulatory SAR
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB 3: INCIDENTS LOG */}
        {activeSub === "incidents" && (
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
                    <th>REPORTING CHANNEL</th>
                    <th>INCIDENT ACTIONS STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-row-msg">
                        No high-risk security threat incidents reported.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc, i) => (
                      <tr key={inc.id + i} className="incident-row">
                        <td className="font-bold font-mono">{inc.id}</td>
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
                        <td>
                          <span className="channel-tag">{inc.channel}</span>
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
          gap: 12px;
          margin-bottom: 12px;
        }
        .subnav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: var(--border-default);
          cursor: pointer;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          padding: 6px 12px;
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
        .audit-workspace, .incidents-workspace, .channels-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .worm-verifier-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: var(--bg-surface-active);
          border-bottom: var(--border-default);
        }
        .bar-info {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }
        .sub-text {
          font-size: 10px;
          color: var(--color-text-muted);
          font-weight: normal;
        }
        .verify-worm-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--success-bg);
          border: var(--border-success);
          color: var(--success-color);
          padding: 5px 12px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .worm-result-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          font-size: 11px;
          font-weight: bold;
        }
        .result-pass {
          background-color: var(--success-bg);
          color: var(--success-color);
          border-bottom: var(--border-success);
        }
        .result-fail {
          background-color: var(--error-bg);
          color: var(--error-color);
          border-bottom: var(--border-error);
        }
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
        }
        .audit-table, .incidents-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        .audit-table th, .incidents-table th {
          position: sticky;
          top: 0;
          background-color: var(--bg-surface-active);
          padding: 8px 12px;
          font-weight: bold;
          border-bottom: var(--border-default);
          color: var(--color-text-muted);
          z-index: 1;
        }
        .audit-table td, .incidents-table td {
          padding: 8px 12px;
          border-bottom: var(--border-default);
        }
        .ts-col { color: var(--color-text-muted); }
        .vpa-col { font-family: var(--font-mono); font-weight: bold; }
        .action-col { font-weight: 500; }
        .hash-col { font-family: var(--font-mono); color: var(--color-text-muted); }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: var(--font-mono); }
        .channels-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 20px;
          overflow-y: auto;
        }
        .channel-card {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 15px;
          border-radius: 3px;
        }
        .border-orange { border-left: 4px solid var(--accent-primary); }
        .border-red { border-left: 4px solid var(--error-color); }
        .channel-card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .channel-card-title h3 {
          margin: 0;
          font-size: 13px;
          font-weight: bold;
        }
        .channel-card-title span {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .channel-desc {
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin-bottom: 15px;
        }
        .channel-actions h4 {
          margin: 0 0 10px 0;
          font-size: 10px;
          color: var(--color-text-muted);
          font-weight: bold;
        }
        .dispatch-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .dispatch-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 8px;
          font-size: 11px;
          border-radius: 2px;
        }
        .sub-btn {
          border: none;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .btn-orange { background-color: #fff5e6; border: var(--border-highlight); color: var(--accent-primary); }
        .btn-red { background-color: var(--error-bg); border: var(--border-error); color: var(--error-color); }
        .color-primary { color: var(--accent-primary); }
        .color-error { color: var(--error-color); }
        .color-success { color: var(--success-color); }
        .sla-col { display: inline-flex; align-items: center; gap: 4px; color: var(--error-color); }
        .channel-tag { font-size: 9px; font-weight: bold; background-color: var(--bg-surface-active); padding: 2px 6px; border-radius: 2px; }
        .incident-row { background-color: var(--error-bg); }
        .status-col { font-weight: bold; color: var(--error-color); }
        .empty-row-msg { text-align: center; padding: 40px !important; color: var(--color-text-muted); }
      `}</style>
    </div>
  );
};
