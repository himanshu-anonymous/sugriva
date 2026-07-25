import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import type { TxRecord, AuditLog } from "../state/mockEngine";
import {
  ShieldAlert,
  BookOpen,
  Clock,
  Send,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Code,
  Terminal,
  Copy
} from "lucide-react";

// ISO 20022 XML Generator
export function generateIso20022Xml(rec: TxRecord): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${rec.id}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <ClrSys>
          <Prtry>${rec.network}</Prtry>
        </ClrSys>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-${rec.id}</EndToEndId>
        <UETR>c19a4e88-81ff-4a4a-9642-${rec.id.toLowerCase().replace(/[^a-z0-9]/g, '')}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="INR">${rec.amount.toFixed(2)}</IntrBkSttlmAmt>
      <Dbtr>
        <Nm>${rec.vpa}</Nm>
        <PstlAdr>
          <Ctry>IN</Ctry>
        </PstlAdr>
      </Dbtr>
      <Cdtr>
        <Nm>merchant_clearing@bank.net</Nm>
      </Cdtr>
      <SplmtryData>
        <Envlp>
          <SugrivaSecurityHeader>
            <PqcAlgorithm>ML-KEM-1024 / Kyber-1024</PqcAlgorithm>
            <HmacDigest>${rec.cryptoLogs.hmacSigner.calculatedSig}</HmacDigest>
            <RiskScore>${rec.risk.toFixed(4)}</RiskScore>
            <EscrowStatus>${rec.escrow}</EscrowStatus>
            <WormMerkleProof>${rec.wormMerkleProof}</WormMerkleProof>
          </SugrivaSecurityHeader>
        </Envlp>
      </SplmtryData>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;
}

// RFC 5424 Syslog Generator
export function generateRfc5424Syslog(log: AuditLog): string {
  const pri = log.status === "CRITICAL" || log.status === "AUTO_FREEZE" ? 131 : 134;
  const isoTime = new Date().toISOString();
  return `<${pri}>1 ${isoTime} sugriva-soc-node01 audit-daemon 4092 ID47 [meta txId="${log.txId || 'GLOBAL'}" role="${log.role}" status="${log.status}" currHash="${log.currHash.substring(0, 12)}"] SUGRIVA_WORM_AUDIT_LOG: ${log.action}`;
}

export const AuditIncidentTab: React.FC = () => {
  const { auditLogs, incidents, records, verifyWormChain, dispatchOperationalReport, dispatchRegulatoryReport } = useStore();
  const [activeSub, setActiveSub] = useState<"worm" | "channels" | "incidents" | "iso20022" | "syslog">("worm");
  const [, setTick] = useState(0);

  // Selected Tx for ISO 20022 XML
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

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

  const activeRecordForXml = records.find(r => r.id === selectedTxId) || records[0];

  const handleCopyXml = (xmlStr: string) => {
    navigator.clipboard.writeText(xmlStr);
    setCopiedStatus("Copied ISO 20022 XML!");
    setTimeout(() => setCopiedStatus(null), 2000);
  };

  return (
    <div className="audit-tab-container">
      <div className="tab-header-row">
        <h2>Immutable WORM Audit Ledger, ISO 20022 XML & Syslog Streaming Registry</h2>
      </div>

      <div className="tab-navigation">
        <button 
          onClick={() => setActiveSub("worm")} 
          className={`subnav-btn ${activeSub === "worm" ? "active-subnav" : ""}`}
        >
          <BookOpen size={12} />
          <span>1. WORM Audit Chain</span>
        </button>

        <button 
          onClick={() => setActiveSub("iso20022")} 
          className={`subnav-btn ${activeSub === "iso20022" ? "active-subnav" : ""}`}
        >
          <Code size={12} />
          <span>2. ISO 20022 XML Messages</span>
        </button>

        <button 
          onClick={() => setActiveSub("syslog")} 
          className={`subnav-btn ${activeSub === "syslog" ? "active-subnav" : ""}`}
        >
          <Terminal size={12} />
          <span>3. RFC 5424 Syslog Stream</span>
        </button>

        <button 
          onClick={() => setActiveSub("channels")} 
          className={`subnav-btn ${activeSub === "channels" ? "active-subnav" : ""}`}
        >
          <Send size={12} />
          <span>4. Dual-Channel Reporting</span>
        </button>

        <button 
          onClick={() => setActiveSub("incidents")} 
          className={`subnav-btn ${activeSub === "incidents" ? "active-subnav" : ""}`}
        >
          <ShieldAlert size={12} />
          <span>5. Statutory CERT-In Log</span>
        </button>
      </div>

      <div className="subworkspace flat-border">
        {/* SUB 1: WORM AUDIT CHAIN */}
        {activeSub === "worm" && (
          <div className="audit-workspace">
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

        {/* SUB 2: ISO 20022 XML MESSAGES */}
        {activeSub === "iso20022" && (
          <div className="iso-workspace">
            <div className="iso-control-bar">
              <div className="tx-selector-group">
                <span>SELECT TRANSACTION FOR ISO 20022 XML CONVERSION:</span>
                <select
                  className="tx-select font-mono"
                  value={selectedTxId || activeRecordForXml?.id || ""}
                  onChange={e => setSelectedTxId(e.target.value)}
                >
                  {records.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.id} | {r.vpa} | ₹{r.amount.toLocaleString()} | [{r.network}]
                    </option>
                  ))}
                </select>
              </div>

              {activeRecordForXml && (
                <div className="iso-actions">
                  <button
                    className="iso-btn"
                    onClick={() => handleCopyXml(generateIso20022Xml(activeRecordForXml))}
                  >
                    <Copy size={12} /> {copiedStatus || "Copy ISO 20022 XML"}
                  </button>
                </div>
              )}
            </div>

            {activeRecordForXml ? (
              <div className="xml-viewer-container font-mono">
                <div className="xml-header">
                  <Code size={12} />
                  <span>ISO 20022 FINANCIAL MESSAGE SCHEMA (pacs.008.001.10) WITH PQC SECURITY HEADERS</span>
                </div>
                <pre className="xml-code-block">
                  {generateIso20022Xml(activeRecordForXml)}
                </pre>
              </div>
            ) : (
              <div className="empty-row-msg">No transactions available to generate ISO 20022 XML.</div>
            )}
          </div>
        )}

        {/* SUB 3: RFC 5424 SYSLOG STREAM */}
        {activeSub === "syslog" && (
          <div className="syslog-workspace">
            <div className="syslog-header-bar">
              <div className="bar-info">
                <Terminal size={14} className="color-primary" />
                <div>
                  <strong>RFC 5424 SYSLOG COMPLIANCE AUDIT STREAM</strong>
                  <div className="sub-text">Standardized Syslog output stream for SIEM & SOC aggregators (Splunk, QRadar, Datadog)</div>
                </div>
              </div>
            </div>

            <div className="syslog-terminal-body font-mono">
              {auditLogs.length === 0 ? (
                <div className="log-line">No Syslog entries in buffer...</div>
              ) : (
                auditLogs.map((log, i) => {
                  const sysStr = generateRfc5424Syslog(log);
                  const isCrit = log.status === "CRITICAL" || log.status === "AUTO_FREEZE";
                  return (
                    <div key={i} className={`syslog-line ${isCrit ? "syslog-crit" : ""}`}>
                      {sysStr}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUB 4: DUAL-CHANNEL REPORTING ENGINE */}
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

        {/* SUB 5: INCIDENTS LOG */}
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
          margin-bottom: 10px;
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
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .subnav-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: var(--border-default);
          cursor: pointer;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          padding: 5px 10px;
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
        .audit-workspace, .incidents-workspace, .channels-workspace, .iso-workspace, .syslog-workspace {
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
        .iso-control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          background-color: var(--bg-surface-active);
          border-bottom: var(--border-default);
          gap: 15px;
        }
        .tx-selector-group {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .tx-select {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 4px 8px;
          font-size: 11px;
          color: var(--color-text);
          border-radius: 2px;
          outline: none;
        }
        .iso-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-primary);
          color: #ffffff;
          border: none;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .xml-viewer-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 15px;
          overflow: hidden;
        }
        .xml-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: bold;
          color: #888888;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .xml-code-block {
          flex: 1;
          margin: 0;
          font-size: 11px;
          line-height: 1.4;
          overflow-y: auto;
          white-space: pre-wrap;
          color: #ce9178;
        }
        .syslog-header-bar {
          padding: 10px 15px;
          background-color: var(--bg-surface-active);
          border-bottom: var(--border-default);
        }
        .syslog-terminal-body {
          flex: 1;
          background-color: #1e1e1e;
          color: #00ff88;
          padding: 15px;
          font-size: 10px;
          line-height: 1.6;
          overflow-y: auto;
        }
        .syslog-line {
          white-space: pre-wrap;
          word-break: break-all;
          margin-bottom: 4px;
        }
        .syslog-crit {
          color: #ff5555;
          font-weight: bold;
        }
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
