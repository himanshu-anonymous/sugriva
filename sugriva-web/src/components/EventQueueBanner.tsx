import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { ListOrdered, ChevronDown, ChevronUp, ShieldCheck, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const EventQueueBanner: React.FC = () => {
  const { eventQueue } = useStore();
  const [expanded, setExpanded] = useState(false);

  const queuedCount = eventQueue.filter(e => e.status === "QUEUED").length;
  const processingCount = eventQueue.filter(e => e.status === "PROCESSING").length;
  const verifiedCount = eventQueue.filter(e => e.status === "CRYPTO_VERIFIED").length;
  const auditedCount = eventQueue.filter(e => e.status === "AUDIT_LOGGED").length;

  const latestEvent = eventQueue[0];

  return (
    <div className="event-queue-container">
      {/* Top Banner Row */}
      <div className="queue-banner-row">
        <div className="queue-title-badge" onClick={() => setExpanded(!expanded)}>
          <ListOrdered size={13} className="queue-icon" />
          <span className="queue-title">REAL-TIME EVENT QUEUE & MANAGEMENT</span>
          <span className="count-pill">{eventQueue.length} TOTAL</span>
        </div>

        {/* Live Metrics Pills */}
        <div className="queue-pills-row">
          <div className="pill pill-queued">
            <span>QUEUED:</span> <strong>{queuedCount}</strong>
          </div>
          <div className="pill pill-processing">
            <Activity size={10} className="spin-icon" />
            <span>PROCESSING:</span> <strong>{processingCount}</strong>
          </div>
          <div className="pill pill-verified">
            <ShieldCheck size={10} />
            <span>CRYPTO VERIFIED:</span> <strong>{verifiedCount}</strong>
          </div>
          <div className="pill pill-audited">
            <span>AUDIT LOGGED:</span> <strong>{auditedCount}</strong>
          </div>
        </div>

        {/* Latest Event Stream Ticker */}
        {latestEvent && (
          <div className="queue-ticker" title={latestEvent.details}>
            <span className="ticker-label">LATEST:</span>
            <span className="ticker-type">{latestEvent.eventType}</span>
            <span className="ticker-vpa">{latestEvent.targetVpa}</span>
            <span className={`status-badge-mini status-${latestEvent.status.toLowerCase()}`}>
              {latestEvent.status}
            </span>
          </div>
        )}

        <button className="expand-toggle-btn" onClick={() => setExpanded(!expanded)}>
          <span>{expanded ? "HIDE QUEUE" : "VIEW QUEUE DRAWER"}</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Expandable Drawer showing all queued tasks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="queue-drawer"
          >
            <div className="drawer-header">
              <span>EVENT QUEUE INGESTION STREAM ({eventQueue.length} ITEMS)</span>
              <span className="drawer-sub">Persistent Across All Pages</span>
            </div>

            <div className="drawer-table-wrapper">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>EVENT ID</th>
                    <th>TIMESTAMP</th>
                    <th>EVENT TYPE</th>
                    <th>SOURCE ENCLAVE</th>
                    <th>TARGET NODE/VPA</th>
                    <th>SEVERITY</th>
                    <th>QUEUE STATUS</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>
                <tbody>
                  {eventQueue.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-msg">
                        No events currently in pipeline queue.
                      </td>
                    </tr>
                  ) : (
                    eventQueue.map(item => (
                      <tr key={item.id}>
                        <td className="font-mono">{item.id}</td>
                        <td className="ts-col">{item.timestamp}</td>
                        <td className="font-bold">{item.eventType}</td>
                        <td>{item.source}</td>
                        <td className="font-mono">{item.targetVpa}</td>
                        <td>
                          <span className={`severity-badge sev-${item.severity.toLowerCase()}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge-mini status-${item.status.toLowerCase()}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="details-col">{item.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .event-queue-container {
          background-color: var(--bg-surface);
          border-bottom: var(--border-default);
          font-size: 11px;
          user-select: none;
        }
        .queue-banner-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 20px;
          gap: 15px;
          height: 34px;
        }
        .queue-title-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-weight: bold;
          color: var(--color-text);
        }
        .queue-title {
          font-size: 11px;
          letter-spacing: 0.3px;
        }
        .count-pill {
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 1px 6px;
          border-radius: 2px;
          font-size: 10px;
          color: var(--color-text-muted);
        }
        .queue-pills-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 2px;
          font-size: 10px;
        }
        .pill-queued {
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          color: var(--color-text-muted);
        }
        .pill-processing {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .pill-verified {
          background-color: var(--quantum-bg);
          border: 1px solid var(--quantum-color);
          color: var(--quantum-color);
        }
        .pill-audited {
          background-color: var(--success-bg);
          border: var(--border-success);
          color: var(--success-color);
        }
        .spin-icon {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .queue-ticker {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 2px 10px;
          border-radius: 2px;
          overflow: hidden;
          white-space: nowrap;
          max-width: 450px;
        }
        .ticker-label {
          color: var(--color-text-muted);
          font-weight: bold;
          font-size: 10px;
        }
        .ticker-type {
          font-weight: bold;
          color: var(--accent-primary);
        }
        .ticker-vpa {
          font-family: var(--font-mono);
          color: var(--color-text);
        }
        .expand-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: var(--border-default);
          padding: 3px 8px;
          font-size: 10px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .expand-toggle-btn:hover {
          color: var(--accent-primary);
          border: var(--border-highlight);
        }
        .queue-drawer {
          border-top: var(--border-default);
          background-color: var(--bg-surface);
          max-height: 250px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          padding: 8px 20px;
          background-color: var(--bg-surface-active);
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text);
          border-bottom: var(--border-default);
        }
        .drawer-sub {
          color: var(--color-text-muted);
          font-weight: normal;
        }
        .drawer-table-wrapper {
          overflow-y: auto;
          max-height: 200px;
        }
        .queue-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        .queue-table th {
          position: sticky;
          top: 0;
          background-color: var(--bg-primary);
          padding: 6px 12px;
          font-weight: bold;
          border-bottom: var(--border-default);
          color: var(--color-text-muted);
        }
        .queue-table td {
          padding: 6px 12px;
          border-bottom: var(--border-default);
        }
        .font-mono {
          font-family: var(--font-mono);
        }
        .font-bold {
          font-weight: bold;
        }
        .ts-col {
          color: var(--color-text-muted);
        }
        .details-col {
          color: var(--color-text-muted);
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .severity-badge {
          padding: 1px 5px;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
        }
        .sev-low {
          background-color: var(--success-bg);
          color: var(--success-color);
        }
        .sev-high {
          background-color: var(--warning-bg);
          color: var(--warning-color);
        }
        .sev-critical {
          background-color: var(--error-bg);
          color: var(--error-color);
        }
        .status-badge-mini {
          padding: 1px 5px;
          font-size: 9px;
          font-weight: bold;
          border-radius: 2px;
        }
        .status-queued {
          background-color: var(--bg-surface-active);
          color: var(--color-text-muted);
        }
        .status-processing {
          background-color: #fff5e6;
          color: var(--accent-primary);
        }
        .status-crypto_verified {
          background-color: var(--quantum-bg);
          color: var(--quantum-color);
        }
        .status-audit_logged {
          background-color: var(--success-bg);
          color: var(--success-color);
        }
        .empty-msg {
          text-align: center;
          padding: 20px !important;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};
