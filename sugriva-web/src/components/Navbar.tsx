import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { checkAdminPassword } from "../state/mockEngine";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Lock, Unlock } from "lucide-react";

export const Navbar: React.FC = () => {
  const { role, setRole, writeAudit, triggerUnfreeze, setThreshold, circuitBreaker, setCircuitBreaker } = useStore();
  const [command, setCommand] = useState("");
  const [consoleLogs, setConsoleLogs] = useState<string[]>(["System initialized. Type 'help' to begin."]);
  const [showConsoleTip, setShowConsoleTip] = useState(false);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    setCommand("");
    const log = `> ${cmd}`;
    setConsoleLogs(prev => [log, ...prev].slice(0, 20));

    const parts = cmd.split(" ");
    const action = parts[0].toLowerCase();

    if (action === "help") {
      setConsoleLogs(prev => [
        "Commands Sheet:",
        "  login admin <password> - Elevate role privileges (pwd: adminpassword)",
        "  login analyst          - Downgrade role to read-only",
        "  unfreeze <vpa>         - Release quarantine locks on VPA (ADMIN)",
        "  breaker [trip/reset]   - Force system fail-closed/restore state (ADMIN)",
        "  set threshold <float>  - Adjust GNN isolation limit (ADMIN)",
        "  help                   - Output instructions",
        ...prev
      ]);
    } else if (action === "login") {
      if (parts[1]?.toLowerCase() === "admin") {
        const password = parts[2];
        if (password && checkAdminPassword(password)) {
          setRole("ADMIN");
          await writeAudit("Authentication tier elevated to ADMIN", "SUCCESS");
          setConsoleLogs(prev => ["Access Granted: System role set to ADMIN.", ...prev]);
        } else {
          await writeAudit("Failed admin escalation attempt", "DENIED");
          setConsoleLogs(prev => ["Access Denied: Incorrect password credential.", ...prev]);
        }
      } else if (parts[1]?.toLowerCase() === "analyst") {
        setRole("ANALYST");
        await writeAudit("Authentication tier set to ANALYST", "SUCCESS");
        setConsoleLogs(prev => ["System role downgraded to ANALYST.", ...prev]);
      } else {
        setConsoleLogs(prev => ["Usage: login admin <password> OR login analyst", ...prev]);
      }
    } else if (action === "unfreeze") {
      if (role !== "ADMIN") {
        await writeAudit("Unauthorized unfreeze override attempt", "DENIED");
        setConsoleLogs(prev => ["Access Denied: ADMIN credentials required.", ...prev]);
      } else {
        const vpa = parts[1];
        if (!vpa) {
          setConsoleLogs(prev => ["Usage: unfreeze <vpa>", ...prev]);
        } else {
          const success = await triggerUnfreeze(vpa);
          if (success) {
            setConsoleLogs(prev => [`VPA ${vpa} quarantine override successful.`, ...prev]);
          } else {
            setConsoleLogs(prev => [`VPA ${vpa} is not currently under quarantine.`, ...prev]);
          }
        }
      }
    } else if (action === "breaker") {
      if (role !== "ADMIN") {
        await writeAudit("Unauthorized circuit breaker toggle attempt", "DENIED");
        setConsoleLogs(prev => ["Access Denied: ADMIN credentials required.", ...prev]);
      } else {
        const sub = parts[1]?.toLowerCase();
        if (sub === "trip") {
          setCircuitBreaker("OPEN");
          await writeAudit("Circuit breaker forced OPEN (Fail-Closed triggered)", "CRITICAL");
          setConsoleLogs(prev => ["Circuit breaker tripped OPEN. Transactions auto-isolated.", ...prev]);
        } else if (sub === "reset") {
          setCircuitBreaker("CLOSED");
          await writeAudit("Circuit breaker reset to CLOSED (Telemetry restored)", "SUCCESS");
          setConsoleLogs(prev => ["Circuit breaker reset to CLOSED.", ...prev]);
        } else {
          setConsoleLogs(prev => ["Usage: breaker [trip/reset]", ...prev]);
        }
      }
    } else if (action === "set" && parts[1]?.toLowerCase() === "threshold") {
      if (role !== "ADMIN") {
        await writeAudit("Unauthorized threshold configuration attempt", "DENIED");
        setConsoleLogs(prev => ["Access Denied: ADMIN credentials required.", ...prev]);
      } else {
        const val = parseFloat(parts[2]);
        if (isNaN(val)) {
          setConsoleLogs(prev => ["Usage: set threshold <float>", ...prev]);
        } else {
          setThreshold(val);
          await writeAudit(`Risk threshold limits altered to ${val}`, "SUCCESS");
          setConsoleLogs(prev => [`Threshold adjusted to ${val} successfully.`, ...prev]);
        }
      }
    } else {
      setConsoleLogs(prev => [`Unknown command: '${cmd}'. Type 'help' for syntax guide.`, ...prev]);
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="brand-logo">
          <Shield size={22} className="logo-icon" />
          <span className="logo-text">SUGRIVA</span>
        </div>
        
        {/* Subtle Green Pulse Ingestion Status */}
        <div className="pipeline-status">
          <motion.div 
            className="status-indicator"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="status-label">INGESTION ACTIVE</span>
        </div>

        {/* Framer motion spinning quantum radar */}
        <div className="quantum-radar">
          <motion.div 
            className="radar-spinner"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          >
            <Cpu size={14} />
          </motion.div>
          <span className="radar-label">QKD MONITORED</span>
        </div>
      </div>

      {/* Terminal Command Input Form */}
      <form onSubmit={handleCommandSubmit} className="console-form">
        <div className="console-wrapper">
          <Terminal size={14} className="console-icon" />
          <input
            type="text"
            placeholder="Type console command (e.g. 'help')..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onFocus={() => setShowConsoleTip(true)}
            onBlur={() => setTimeout(() => setShowConsoleTip(false), 200)}
            className="console-input"
          />
        </div>
        
        {/* Absolute console logs window dropdown */}
        <AnimatePresence>
          {showConsoleTip && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="console-dropdown"
            >
              {consoleLogs.map((log, i) => (
                <div key={i} className={`console-log-line ${log.startsWith('>') ? 'input-log' : ''}`}>
                  {log}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Role and Circuit Breaker Badges */}
      <div className="navbar-badges">
        <div className={`breaker-badge ${circuitBreaker === "OPEN" ? "open-state" : "closed-state"}`}>
          {circuitBreaker === "OPEN" ? <Lock size={12} /> : <Unlock size={12} />}
          <span>BREAKER: {circuitBreaker}</span>
        </div>
        <div className={`role-badge ${role === "ADMIN" ? "role-admin" : "role-analyst"}`}>
          <span>ROLE: {role}</span>
        </div>
      </div>

      <style>{`
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          padding: 0 20px;
          background-color: var(--bg-surface);
          border-bottom: var(--border-default);
          z-index: 100;
          position: relative;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .brand-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .logo-icon {
          color: var(--accent-primary);
        }
        .logo-text {
          font-weight: 900;
          letter-spacing: 2px;
          font-size: 18px;
          color: var(--color-text);
        }
        .pipeline-status {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--success-bg);
          border: var(--border-success);
          padding: 4px 10px;
          border-radius: 2px;
          font-size: 11px;
          color: var(--success-color);
          font-weight: bold;
        }
        .status-indicator {
          width: 6px;
          height: 6px;
          background-color: var(--success-color);
          border-radius: 50%;
        }
        .quantum-radar {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--quantum-bg);
          border: 1px solid var(--quantum-color);
          padding: 4px 10px;
          border-radius: 2px;
          font-size: 11px;
          color: var(--quantum-color);
          font-weight: bold;
        }
        .radar-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .console-form {
          position: relative;
          flex: 0 1 400px;
        }
        .console-wrapper {
          display: flex;
          align-items: center;
          background-color: var(--bg-primary);
          border: var(--border-default);
          border-radius: 3px;
          padding: 0 10px;
          height: 36px;
          transition: border 0.2s;
        }
        .console-wrapper:focus-within {
          border: var(--border-highlight);
        }
        .console-icon {
          color: var(--color-text-muted);
          margin-right: 8px;
        }
        .console-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: var(--color-text);
        }
        .console-dropdown {
          position: absolute;
          top: 42px;
          left: 0;
          right: 0;
          background-color: var(--bg-surface);
          border: var(--border-highlight);
          border-radius: 3px;
          padding: 10px;
          max-height: 250px;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column-reverse;
          gap: 6px;
        }
        .console-log-line {
          font-size: 11px;
          white-space: pre-wrap;
          line-height: 1.4;
          color: var(--color-text);
        }
        .input-log {
          color: var(--accent-primary);
          font-weight: bold;
        }
        .navbar-badges {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .role-badge {
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 6px 12px;
          font-weight: bold;
          font-size: 12px;
        }
        .role-admin {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .role-analyst {
          color: var(--color-text-muted);
        }
        .breaker-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-weight: bold;
          font-size: 12px;
        }
        .open-state {
          background-color: var(--error-bg);
          border: var(--border-error);
          color: var(--error-color);
        }
        .closed-state {
          background-color: var(--success-bg);
          border: var(--border-success);
          color: var(--success-color);
        }
      `}</style>
    </header>
  );
};
