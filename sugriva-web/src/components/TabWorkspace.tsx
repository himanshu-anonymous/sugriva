import React, { useState } from "react";
import { TelemetryTab } from "../tabs/TelemetryTab";
import { SecurityMeshTab } from "../tabs/SecurityMeshTab";
import { AuthMonitorTab } from "../tabs/AuthMonitorTab";
import { DatabaseTab } from "../tabs/DatabaseTab";
import { CryptoTab } from "../tabs/CryptoTab";
import { QuantumTab } from "../tabs/QuantumTab";
import { AuditIncidentTab } from "../tabs/AuditIncidentTab";
import { motion, AnimatePresence } from "framer-motion";

interface TabWorkspaceProps {
  activeRail: string | null;
}

type TabType = "telemetry" | "mesh" | "auth" | "db" | "crypto" | "quantum" | "audit";

export const TabWorkspace: React.FC<TabWorkspaceProps> = ({ activeRail }) => {
  const [activeTab, setActiveTab] = useState<TabType>("telemetry");

  const tabLabels: { id: TabType; label: string }[] = [
    { id: "telemetry", label: "Telemetry Log" },
    { id: "mesh", label: "Security Mesh" },
    { id: "auth", label: "Auth steps" },
    { id: "db", label: "Database Search" },
    { id: "crypto", label: "Crypto logs" },
    { id: "quantum", label: "Quantum guard" },
    { id: "audit", label: "Audits & Incidents" },
  ];

  return (
    <div className="workspace-container">
      {/* Tabs Switch Navigation Bar */}
      <div className="workspace-tabs-row">
        {tabLabels.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`workspace-tab-btn ${activeTab === tab.id ? "active-workspace-tab" : ""}`}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabUnderline" 
                className="active-underline"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Switchable Workspace Tab Panel */}
      <div className="workspace-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="tab-motion-wrapper"
          >
            {activeTab === "telemetry" && <TelemetryTab activeRail={activeRail} />}
            {activeTab === "mesh" && <SecurityMeshTab />}
            {activeTab === "auth" && <AuthMonitorTab />}
            {activeTab === "db" && <DatabaseTab />}
            {activeTab === "crypto" && <CryptoTab />}
            {activeTab === "quantum" && <QuantumTab />}
            {activeTab === "audit" && <AuditIncidentTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        .workspace-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background-color: var(--bg-primary);
        }
        .workspace-tabs-row {
          display: flex;
          background-color: var(--bg-surface);
          border-bottom: var(--border-default);
          padding: 0 10px;
          height: 40px;
        }
        .workspace-tab-btn {
          position: relative;
          background: transparent;
          border: none;
          padding: 0 20px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          color: var(--color-text-muted);
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s;
        }
        .workspace-tab-btn:hover {
          color: var(--accent-primary);
        }
        .active-workspace-tab {
          color: var(--accent-primary);
        }
        .active-underline {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--accent-primary);
        }
        .workspace-panel {
          flex: 1;
          overflow: hidden;
        }
        .tab-motion-wrapper {
          height: 100%;
          width: 100%;
        }
      `}</style>
    </div>
  );
};
