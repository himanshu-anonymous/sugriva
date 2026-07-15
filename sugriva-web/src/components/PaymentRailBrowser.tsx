import React, { useState } from "react";
import { ChevronDown, ChevronRight, Share2, Layers } from "lucide-react";

interface PaymentRailBrowserProps {
  activeRail: string | null;
  onSelectRail: (rail: string | null) => void;
}

export const PaymentRailBrowser: React.FC<PaymentRailBrowserProps> = ({ activeRail, onSelectRail }) => {
  const [domesticOpen, setDomesticOpen] = useState(true);
  const [crossOpen, setCrossOpen] = useState(true);

  const domesticRails = ["UPI", "NEFT", "RTGS"];
  const crossRails = ["Visa", "Mastercard", "PayPal"];

  return (
    <aside className="sidebar-container">
      <div className="sidebar-header">
        <Layers size={14} className="header-icon" />
        <span>PAYMENT RAILS</span>
      </div>

      <div className="sidebar-menu">
        <button 
          onClick={() => onSelectRail(null)} 
          className={`menu-item all-rails-btn ${activeRail === null ? "active-item" : ""}`}
        >
          <span>Show All Rails</span>
        </button>

        {/* Domestic Rails Node */}
        <div className="menu-group">
          <div onClick={() => setDomesticOpen(!domesticOpen)} className="group-header">
            {domesticOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="group-title">Domestic Routing</span>
          </div>

          {domesticOpen && (
            <div className="group-items">
              {domesticRails.map(rail => (
                <button
                  key={rail}
                  onClick={() => onSelectRail(rail)}
                  className={`menu-subitem ${activeRail === rail ? "active-item" : ""}`}
                >
                  <Share2 size={12} className="item-connector" />
                  <span>{rail}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cross-border Rails Node */}
        <div className="menu-group">
          <div onClick={() => setCrossOpen(!crossOpen)} className="group-header">
            {crossOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="group-title">Cross-Border</span>
          </div>

          {crossOpen && (
            <div className="group-items">
              {crossRails.map(rail => (
                <button
                  key={rail}
                  onClick={() => onSelectRail(rail)}
                  className={`menu-subitem ${activeRail === rail ? "active-item" : ""}`}
                >
                  <Share2 size={12} className="item-connector" />
                  <span>{rail}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sidebar-container {
          width: 240px;
          background-color: var(--bg-surface);
          border-right: var(--border-default);
          display: flex;
          flex-direction: column;
          user-select: none;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 15px;
          font-weight: bold;
          font-size: 11px;
          letter-spacing: 1px;
          border-bottom: var(--border-default);
          color: var(--accent-primary);
        }
        .header-icon {
          color: var(--accent-primary);
        }
        .sidebar-menu {
          flex: 1;
          overflow-y: auto;
          padding: 15px 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .menu-item {
          width: 100%;
          border: var(--border-default);
          background: var(--bg-primary);
          padding: 8px 12px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          color: var(--color-text);
        }
        .menu-item:hover, .menu-subitem:hover {
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .active-item {
          border: var(--border-highlight) !important;
          background-color: var(--bg-surface-active) !important;
          color: var(--accent-primary) !important;
        }
        .menu-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .group-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .group-header:hover {
          color: var(--color-text);
        }
        .group-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 10px;
        }
        .menu-subitem {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          border: 1px solid transparent;
          background: transparent;
          padding: 6px 12px;
          text-align: left;
          font-size: 12px;
          cursor: pointer;
          color: var(--color-text);
          font-weight: 500;
        }
        .item-connector {
          color: var(--color-text-muted);
        }
      `}</style>
    </aside>
  );
};
