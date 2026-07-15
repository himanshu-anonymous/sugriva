import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import { Search, Eye, ShieldAlert, KeyRound } from "lucide-react";

export const DatabaseTab: React.FC = () => {
  const { records, triggerUnfreeze } = useStore();
  const [searchTerm, setSearchTerm] = useState("");

  // Extract unique VPAs and their current status from the active record history
  const vpaStatusMap = new Map<string, { ip: string; risk: number; escrow: string; amount: number }>();
  
  // Seed some fallback mock accounts if ledger history is small
  const baseAccounts = [
    { vpa: "demat_vault@treasury", ip: "198.51.100.99", risk: 0.05, escrow: "CLEAR", amount: 12000000.0 },
    { vpa: "gsec_vault@corp", ip: "203.0.113.88", risk: 0.12, escrow: "CLEAR", amount: 6400000.0 },
    { vpa: "user_7712@bank", ip: "192.168.0.42", risk: 0.01, escrow: "CLEAR", amount: 450.0 },
    { vpa: "user_1120@bank", ip: "192.168.1.109", risk: 0.55, escrow: "PENDING", amount: 15400.0 },
    { vpa: "user_9045@bank", ip: "192.168.3.11", risk: 0.02, escrow: "CLEAR", amount: 120.0 }
  ];

  baseAccounts.forEach(acc => vpaStatusMap.set(acc.vpa, acc));

  // Layer real-time transaction updates on top
  [...records].reverse().forEach(rec => {
    vpaStatusMap.set(rec.vpa, {
      ip: rec.ip,
      risk: rec.risk,
      escrow: rec.escrow,
      amount: rec.amount
    });
  });

  const accountsList = Array.from(vpaStatusMap.entries()).map(([vpa, data]) => ({
    vpa,
    ...data
  }));

  const filtered = accountsList.filter(acc => 
    acc.vpa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.ip.includes(searchTerm)
  );

  return (
    <div className="database-tab-container">
      <div className="tab-header-row">
        <h2>Local Ledger Account Registry Index Search (Fuzzy Lookup)</h2>
      </div>

      <div className="search-bar-row">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search account VPA, ip address..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="database-table">
          <thead>
            <tr>
              <th>ACCOUNT NODE VPA</th>
              <th>IP ADDRESS ASSOCIATED</th>
              <th>LATEST VALUE (INR)</th>
              <th>NODE RISK SCORE</th>
              <th>REGISTRY LOCK STATE</th>
              <th>ADMINISTRATIVE CONTROL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row-msg">
                  No registered account node matching query limits.
                </td>
              </tr>
            ) : (
              filtered.map((acc, i) => {
                const isQuarantined = ["ISOLATED", "AUTO_FROZEN"].includes(acc.escrow);
                return (
                  <tr key={acc.vpa + i} className={isQuarantined ? "frozen-row" : ""}>
                    <td className="vpa-col">{acc.vpa}</td>
                    <td>{acc.ip}</td>
                    <td>₹{acc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="risk-col font-bold" style={{ color: acc.risk >= 0.75 ? "var(--error-color)" : acc.risk >= 0.5 ? "var(--warning-color)" : "var(--success-color)" }}>
                      {acc.risk.toFixed(4)}
                    </td>
                    <td>
                      {isQuarantined ? (
                        <span className="error-badge flex-badge"><ShieldAlert size={10} /> QUARANTINED</span>
                      ) : acc.escrow === "PENDING" ? (
                        <span className="warning-badge flex-badge"><KeyRound size={10} /> HELD (2FA)</span>
                      ) : (
                        <span className="success-badge">ACTIVE</span>
                      )}
                    </td>
                    <td>
                      {isQuarantined ? (
                        <button onClick={() => triggerUnfreeze(acc.vpa)} className="override-btn">
                          Override Unfreeze
                        </button>
                      ) : (
                        <span className="text-muted font-bold"><Eye size={12} /> Standard Read</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .database-tab-container {
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
        .search-bar-row {
          margin-bottom: 15px;
        }
        .search-input-wrapper {
          display: flex;
          align-items: center;
          background-color: var(--bg-surface);
          border: var(--border-default);
          border-radius: 3px;
          padding: 0 12px;
          height: 38px;
          max-width: 400px;
        }
        .search-icon {
          color: var(--color-text-muted);
          margin-right: 8px;
        }
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: var(--color-text);
        }
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
          border: var(--border-default);
          background-color: var(--bg-surface);
        }
        .database-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }
        .database-table th {
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
        .database-table td {
          padding: 10px 15px;
          border-bottom: var(--border-default);
        }
        .vpa-col {
          font-family: var(--font-mono);
          font-weight: bold;
        }
        .risk-col {
          font-family: var(--font-mono);
        }
        .font-bold {
          font-weight: bold;
        }
        .override-btn {
          background-color: var(--error-bg);
          border: var(--border-error);
          color: var(--error-color);
          font-size: 10px;
          font-weight: bold;
          padding: 4px 10px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .override-btn:hover {
          background-color: var(--error-color);
          color: var(--bg-primary);
        }
        .text-muted {
          color: var(--color-text-muted);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .flex-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .frozen-row {
          background-color: var(--error-bg);
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
