import React, { useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { Play, AlertTriangle } from "lucide-react";

export const Footer: React.FC = () => {
  const { 
    triggerStuffing, 
    triggerLiquidation, 
    triggerFlood, 
    triggerQuantumExploit,
    role
  } = useStore();

  // Listen to keyboard shortcuts: Ctrl+1, Ctrl+2, etc.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === "1") {
          e.preventDefault();
          triggerStuffing();
        } else if (e.key === "2") {
          e.preventDefault();
          triggerLiquidation();
        } else if (e.key === "3") {
          e.preventDefault();
          triggerFlood();
        } else if (e.key === "4") {
          e.preventDefault();
          triggerQuantumExploit();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [role]);

  return (
    <footer className="footer-container">
      <div className="footer-shortcuts">
        <span className="shortcut-title">INJECT ATTACK SIMULATIONS:</span>
        
        <button onClick={triggerStuffing} className="shortcut-btn">
          <Play size={12} />
          <span>[Ctrl+1] Credential Stuffing</span>
        </button>

        <button onClick={triggerLiquidation} className="shortcut-btn danger-btn">
          <AlertTriangle size={12} />
          <span>[Ctrl+2] G-Sec Liquidation</span>
        </button>

        <button onClick={triggerFlood} className="shortcut-btn">
          <Play size={12} />
          <span>[Ctrl+3] Velocity Flood</span>
        </button>

        <button onClick={triggerQuantumExploit} className="shortcut-btn quantum-btn">
          <AlertTriangle size={12} />
          <span>[Ctrl+4] QKD Coherence Anomaly</span>
        </button>
      </div>

      <div className="footer-system-info">
        <span>SUGRIVA CORE v2.4 // SYSTEM STABLE</span>
      </div>

      <style>{`
        .footer-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 40px;
          padding: 0 20px;
          background-color: var(--bg-surface);
          border-top: var(--border-default);
          font-size: 11px;
          color: var(--color-text-muted);
          z-index: 10;
        }
        .footer-shortcuts {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .shortcut-title {
          font-weight: bold;
          color: var(--color-text);
        }
        .shortcut-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-primary);
          border: var(--border-default);
          color: var(--color-text);
          padding: 4px 8px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.15s;
        }
        .shortcut-btn:hover {
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .danger-btn:hover {
          border: var(--border-error);
          color: var(--error-color);
        }
        .quantum-btn:hover {
          border: 1px solid var(--quantum-color);
          color: var(--quantum-color);
        }
        .footer-system-info {
          font-weight: bold;
          letter-spacing: 1px;
        }
      `}</style>
    </footer>
  );
};
