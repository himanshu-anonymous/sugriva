import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Laptop,
  CreditCard,
  History,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Key,
  Database
} from "lucide-react";

export const SecurityMeshTab: React.FC = () => {
  const { records, threshold } = useStore();

  // Historical Retrace State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const pageSize = 5;

  // Filter records by search query (VPA, IP, Tx ID, or Flag Type)
  const filteredRecords = searchQuery.trim()
    ? records.filter(
        r =>
          r.vpa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.ip.includes(searchQuery) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.flagType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records;

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages - 1);
  const startIdx = validPage * pageSize;
  const currentBatch = filteredRecords.slice(startIdx, startIdx + pageSize);

  // Selected record for deep retrace inspection
  const inspectedRecord = records.find(r => r.id === selectedTxId) || currentBatch[0] || records[0];

  // Trace historical ancestry for the inspected node
  const nodeAncestry = inspectedRecord
    ? records.filter(r => r.vpa === inspectedRecord.vpa || r.ip === inspectedRecord.ip)
    : [];

  return (
    <div className="mesh-tab-container">
      {/* Header */}
      <div className="tab-header-row">
        <h2>Topological Identity Connection Mesh & Historical Retrace Engine</h2>
      </div>

      {/* Historical Retrace Controls Bar */}
      <div className="retrace-controls-bar">
        {/* Search Node / VPA / IP / Tx ID */}
        <div className="search-wrapper">
          <Search size={12} className="icon-muted" />
          <input
            type="text"
            placeholder="Retrace Node by VPA, IP, Tx ID, or Flag..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
            }}
            className="retrace-input"
          />
        </div>

        {/* Historical Timeline Pagination */}
        <div className="pagination-group">
          <button
            disabled={validPage === 0}
            onClick={() => setCurrentPage(0)}
            className="page-btn"
            title="Jump to Latest Telemetry"
          >
            <RotateCcw size={10} /> Latest
          </button>

          <button
            disabled={validPage === 0}
            onClick={() => setCurrentPage(validPage - 1)}
            className="page-btn"
          >
            <ChevronLeft size={12} /> Newer
          </button>

          <span className="page-indicator font-mono">
            HISTORICAL SNAPSHOT {validPage + 1} / {totalPages} ({filteredRecords.length} RECORDS)
          </span>

          <button
            disabled={validPage >= totalPages - 1}
            onClick={() => setCurrentPage(validPage + 1)}
            className="page-btn"
          >
            Older <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Mesh Workspace & Ancestry Inspector Grid */}
      <div className="mesh-workspace-grid">
        {/* Left Side: Topological Mesh Flow */}
        <div className="mesh-flow-column flat-border">
          <div className="column-title">
            <GitBranch size={14} />
            <span>TOPOLOGICAL CHAIN SNAPSHOT ({currentBatch.length} ACTIVE NODES)</span>
          </div>

          {currentBatch.length === 0 ? (
            <div className="empty-mesh">
              <span>No historical telemetry records matching search query '{searchQuery}'.</span>
            </div>
          ) : (
            <div className="nodes-container">
              {currentBatch.map((rec, i) => {
                const isCritical = rec.risk >= threshold;
                const isWarning = rec.risk >= 0.50 && rec.risk < threshold;
                const nodeColorClass = isCritical ? "critical-node" : isWarning ? "warning-node" : "safe-node";
                const isInspected = inspectedRecord?.id === rec.id;

                return (
                  <div
                    key={rec.id + i}
                    onClick={() => setSelectedTxId(rec.id)}
                    className={`mesh-chain-row ${isInspected ? "row-selected" : ""}`}
                  >
                    {/* Account VPA Node */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`node-card vpa-node-card ${nodeColorClass}`}
                    >
                      <CreditCard size={14} className="node-icon" />
                      <div className="node-details">
                        <span className="node-title">Account VPA</span>
                        <span className="node-value">{rec.vpa}</span>
                        <span className="node-sub font-mono">{rec.id}</span>
                      </div>
                    </motion.div>

                    {/* SVG Connector 1 */}
                    <div className="connector-svg-wrapper">
                      <svg className="connector-svg">
                        <motion.line
                          x1="0"
                          y1="15"
                          x2="100%"
                          y2="15"
                          className={`link-line ${nodeColorClass}-link`}
                          initial={{ strokeDashoffset: 100 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </svg>
                    </div>

                    {/* Parent Intermediary Bridge Node */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`node-card bridge-node-card ${nodeColorClass}`}
                    >
                      <GitBranch size={14} className="node-icon" />
                      <div className="node-details">
                        <span className="node-title">GNN BRIDGE NODE</span>
                        <span className="node-value">RISK: {rec.risk.toFixed(4)}</span>
                        <span className="node-sub">{rec.flagType}</span>
                      </div>
                    </motion.div>

                    {/* SVG Connector 2 */}
                    <div className="connector-svg-wrapper">
                      <svg className="connector-svg">
                        <motion.line
                          x1="0"
                          y1="15"
                          x2="100%"
                          y2="15"
                          className={`link-line ${nodeColorClass}-link`}
                          initial={{ strokeDashoffset: 100 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        />
                      </svg>
                    </div>

                    {/* Physical IP Node */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`node-card ip-node-card ${nodeColorClass}`}
                    >
                      <Laptop size={14} className="node-icon" />
                      <div className="node-details">
                        <span className="node-title">Terminal IP</span>
                        <span className="node-value">{rec.ip}</span>
                        <span className="node-sub">{rec.timestamp}</span>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Deep Ancestry & Retrace Inspector */}
        <div className="retrace-inspector-column flat-border">
          <div className="inspector-header">
            <History size={14} className="color-primary" />
            <span>NODE ANCESTRY & HISTORICAL RETRACE</span>
          </div>

          {inspectedRecord ? (
            <div className="inspector-body">
              {/* Selected Node Summary */}
              <div className="inspect-summary-box">
                <div className="summary-title-row">
                  <span className="font-mono tx-badge">{inspectedRecord.id}</span>
                  <span className="ts-text">{inspectedRecord.timestamp}</span>
                </div>
                <h4 className="vpa-heading">{inspectedRecord.vpa}</h4>
                <div className="field-row">
                  <span>TERMINAL IP:</span> <strong className="font-mono">{inspectedRecord.ip}</strong>
                </div>
                <div className="field-row">
                  <span>ESCROW STATE:</span> <span className="warning-badge">{inspectedRecord.escrow}</span>
                </div>
                <div className="field-row">
                  <span>RISK INDEX:</span> <strong className="color-error">{inspectedRecord.risk.toFixed(4)}</strong>
                </div>
                <div className="field-row">
                  <span>EXPLICIT FLAG CAUSE:</span> <strong>{inspectedRecord.flagType}</strong>
                </div>
              </div>

              {/* Flag Reason Highlight */}
              <div className="reason-box">
                <AlertTriangle size={14} className="warn-icon" />
                <p>{inspectedRecord.flagReason}</p>
              </div>

              {/* Cryptographic Linkage Details */}
              <div className="crypto-link-box">
                <div className="box-section">
                  <Key size={12} />
                  <span>HMAC DIGEST:</span>
                  <code className="code-inline">{inspectedRecord.cryptoLogs.hmacSigner.receivedSig}</code>
                </div>

                <div className="box-section">
                  <Database size={12} />
                  <span>ACID HANDLE:</span>
                  <code className="code-inline">{inspectedRecord.dbStatus.acidTxId}</code>
                </div>

                <div className="box-section">
                  <ShieldCheck size={12} />
                  <span>WORM MERKLE PROOF:</span>
                  <code className="code-inline">{inspectedRecord.wormMerkleProof}</code>
                </div>
              </div>

              {/* Historical Ancestry Hops for this Node */}
              <div className="ancestry-history-section">
                <h4>HISTORICAL TELEMETRY ANCESTRY ({nodeAncestry.length} HOPS)</h4>
                <p className="ancestry-desc">
                  Retraced previous transaction logs involving node <code className="code-inline">{inspectedRecord.vpa}</code> / <code className="code-inline">{inspectedRecord.ip}</code>:
                </p>

                <div className="ancestry-list-wrapper">
                  <AnimatePresence>
                    {nodeAncestry.map((r, i) => (
                      <motion.div
                        key={r.id + i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedTxId(r.id)}
                        className={`ancestry-item ${r.id === inspectedRecord.id ? "active-ancestry" : ""}`}
                      >
                        <div className="ancestry-top">
                          <span className="font-mono font-bold">{r.id}</span>
                          <span className="ts-sub"><Clock size={9} /> {r.timestamp}</span>
                        </div>
                        <div className="ancestry-bottom">
                          <span>₹{r.amount.toLocaleString()}</span>
                          <span className="color-error font-bold">Risk: {r.risk.toFixed(4)}</span>
                          <span className="flag-tag">{r.flagType}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-inspector">Select a node in the mesh to inspect historical ancestry.</div>
          )}
        </div>
      </div>

      <style>{`
        .mesh-tab-container {
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
        .retrace-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 8px 12px;
          margin-bottom: 12px;
          border-radius: 2px;
          gap: 15px;
        }
        .search-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 4px 10px;
          border-radius: 2px;
          flex: 0 1 350px;
        }
        .retrace-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 11px;
          width: 100%;
          color: var(--color-text);
          font-family: var(--font-mono);
        }
        .pagination-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .page-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 4px 8px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .page-indicator {
          font-size: 10px;
          color: var(--color-text-muted);
          font-weight: bold;
        }
        .mesh-workspace-grid {
          flex: 1;
          display: flex;
          gap: 15px;
          overflow: hidden;
        }
        .mesh-flow-column {
          flex: 1;
          background-color: var(--bg-surface);
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .column-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 15px;
        }
        .empty-mesh {
          color: var(--color-text-muted);
          font-size: 12px;
          text-align: center;
          padding: 40px;
        }
        .nodes-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .mesh-chain-row {
          display: flex;
          align-items: center;
          width: 100%;
          cursor: pointer;
          padding: 4px;
          border-radius: 3px;
          transition: background-color 0.15s;
        }
        .mesh-chain-row:hover {
          background-color: var(--bg-surface-active);
        }
        .row-selected {
          background-color: #fff5e6 !important;
        }
        .node-card {
          flex: 0 0 210px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          border-radius: 3px;
        }
        .node-details {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .node-title {
          font-size: 9px;
          font-weight: bold;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
        .node-value {
          font-size: 11px;
          font-weight: bold;
          font-family: var(--font-mono);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .node-sub {
          font-size: 9px;
          color: var(--color-text-muted);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .node-icon { flex-shrink: 0; }
        
        .safe-node { border-left: 4px solid var(--success-color); }
        .safe-node .node-icon { color: var(--success-color); }
        .warning-node { border-left: 4px solid var(--warning-color); background-color: var(--warning-bg); }
        .warning-node .node-icon { color: var(--warning-color); }
        .critical-node { border-left: 4px solid var(--error-color); background-color: var(--error-bg); }
        .critical-node .node-icon { color: var(--error-color); }

        .connector-svg-wrapper {
          flex: 1;
          height: 24px;
          display: flex;
          align-items: center;
        }
        .connector-svg { width: 100%; height: 100%; }
        .link-line { stroke-width: 2px; stroke-dasharray: 6, 4; }
        .safe-node-link { stroke: var(--success-color); }
        .warning-node-link { stroke: var(--warning-color); }
        .critical-node-link { stroke: var(--error-color); }

        .retrace-inspector-column {
          flex: 0 0 380px;
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
        .inspect-summary-box {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
          margin-bottom: 10px;
        }
        .summary-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .tx-badge {
          font-size: 10px;
          font-weight: bold;
          color: var(--accent-primary);
        }
        .ts-text {
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .vpa-heading {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: bold;
          font-family: var(--font-mono);
        }
        .field-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          padding: 3px 0;
          border-bottom: 1px dashed #eee;
        }
        .reason-box {
          display: flex;
          gap: 8px;
          background-color: var(--warning-bg);
          border: var(--border-highlight);
          padding: 8px 10px;
          border-radius: 3px;
          margin-bottom: 10px;
          font-size: 10px;
        }
        .reason-box p { margin: 0; }
        .warn-icon { color: var(--accent-primary); flex-shrink: 0; }
        .crypto-link-box {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 10px;
          border-radius: 3px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .box-section {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .code-inline {
          font-family: var(--font-mono);
          background: #eee;
          padding: 1px 4px;
          font-size: 9px;
          color: var(--color-text);
        }
        .ancestry-history-section h4 {
          margin: 0 0 4px 0;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .ancestry-desc {
          margin: 0 0 8px 0;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .ancestry-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 180px;
          overflow-y: auto;
        }
        .ancestry-item {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 6px 10px;
          border-radius: 2px;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.15s;
        }
        .ancestry-item:hover { border-color: var(--accent-primary); }
        .active-ancestry { border: var(--border-highlight); background-color: #fff5e6; }
        .ancestry-top { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .ts-sub { color: var(--color-text-muted); display: flex; align-items: center; gap: 2px; }
        .ancestry-bottom { display: flex; justify-content: space-between; align-items: center; }
        .flag-tag { font-size: 9px; background: var(--bg-surface-active); padding: 1px 4px; border-radius: 2px; }
        .font-mono { font-family: var(--font-mono); }
        .font-bold { font-weight: bold; }
        .color-primary { color: var(--accent-primary); }
        .color-error { color: var(--error-color); }
        .empty-inspector { text-align: center; color: var(--color-text-muted); padding: 40px 0; font-size: 11px; }
        .icon-muted { color: var(--color-text-muted); }
      `}</style>
    </div>
  );
};
