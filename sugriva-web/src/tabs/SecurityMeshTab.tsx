import React from "react";
import { useStore } from "../state/StoreContext";
import { motion } from "framer-motion";
import { GitBranch, Laptop, CreditCard } from "lucide-react";

export const SecurityMeshTab: React.FC = () => {
  const { records, threshold } = useStore();

  // Take the 5 most recent records to build a dynamic localized graph
  const recent = records.slice(0, 5);

  return (
    <div className="mesh-tab-container">
      <div className="tab-header-row">
        <h2>Topological Identity Connection Mesh (GNN Input Layer)</h2>
      </div>

      <div className="mesh-workspace">
        {recent.length === 0 ? (
          <div className="empty-mesh">
            <span>Awaiting telemetry ingestion to map nodes...</span>
          </div>
        ) : (
          <div className="nodes-container">
            {recent.map((rec, i) => {
              const isCritical = rec.risk >= threshold;
              const isWarning = rec.risk >= 0.50 && rec.risk < threshold;
              const nodeColorClass = isCritical ? "critical-node" : isWarning ? "warning-node" : "safe-node";

              return (
                <div key={rec.timestamp + i} className="mesh-chain-row">
                  {/* Account VPA Node */}
                  <motion.div 
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`node-card vpa-node-card ${nodeColorClass}`}
                  >
                    <CreditCard size={14} className="node-icon" />
                    <div className="node-details">
                      <span className="node-title">Account VPA</span>
                      <span className="node-value">{rec.vpa}</span>
                    </div>
                  </motion.div>

                  {/* SVG Animated Connector Line 1 */}
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`node-card bridge-node-card ${nodeColorClass}`}
                  >
                    <GitBranch size={14} className="node-icon" />
                    <div className="node-details">
                      <span className="node-title">BRIDGE NODE</span>
                      <span className="node-value">ID: {rec.timestamp.replace(/:/g, "")}</span>
                    </div>
                  </motion.div>

                  {/* SVG Animated Connector Line 2 */}
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
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`node-card ip-node-card ${nodeColorClass}`}
                  >
                    <Laptop size={14} className="node-icon" />
                    <div className="node-details">
                      <span className="node-title">Terminal IP</span>
                      <span className="node-value">{rec.ip}</span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
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
          margin-bottom: 15px;
        }
        .tab-header-row h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
        }
        .mesh-workspace {
          flex: 1;
          border: var(--border-default);
          background-color: var(--bg-surface);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 20px;
          overflow-y: auto;
        }
        .empty-mesh {
          color: var(--color-text-muted);
          font-size: 12px;
        }
        .nodes-container {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .mesh-chain-row {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .node-card {
          flex: 0 0 220px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 15px;
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
          font-size: 12px;
          font-weight: bold;
          font-family: var(--font-mono);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
        .node-icon {
          flex-shrink: 0;
        }
        
        /* Node Status Classes */
        .safe-node {
          border-left: 4px solid var(--success-color);
        }
        .safe-node .node-icon {
          color: var(--success-color);
        }
        
        .warning-node {
          border-left: 4px solid var(--warning-color);
          background-color: var(--warning-bg);
        }
        .warning-node .node-icon {
          color: var(--warning-color);
        }
        
        .critical-node {
          border-left: 4px solid var(--error-color);
          background-color: var(--error-bg);
        }
        .critical-node .node-icon {
          color: var(--error-color);
        }

        /* SVG Line connectors */
        .connector-svg-wrapper {
          flex: 1;
          height: 30px;
          display: flex;
          align-items: center;
        }
        .connector-svg {
          width: 100%;
          height: 100%;
        }
        .link-line {
          stroke-width: 2px;
          stroke-dasharray: 6, 4;
        }
        
        .safe-node-link {
          stroke: var(--success-color);
        }
        .warning-node-link {
          stroke: var(--warning-color);
        }
        .critical-node-link {
          stroke: var(--error-color);
        }
      `}</style>
    </div>
  );
};
