import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Share2,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Home
} from "lucide-react";

interface PaymentRailBrowserProps {
  activeRail: string | null;
  onSelectRail: (rail: string | null) => void;
}

export const PaymentRailBrowser: React.FC<PaymentRailBrowserProps> = ({ activeRail, onSelectRail }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [domesticOpen, setDomesticOpen] = useState(true);
  const [crossOpen, setCrossOpen] = useState(true);

  const domesticRails = ["UPI", "NEFT", "RTGS"];
  const crossRails = ["Visa", "Mastercard", "PayPal"];

  return (
    <aside className={`sidebar-container ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar Header with Collapse Toggle */}
      <div className="sidebar-header">
        <div className="header-left">
          <Layers size={14} className="header-icon" />
          {!isCollapsed && <span>PAYMENT RAILS</span>}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="collapse-toggle-btn"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Expanded Menu View */}
      {!isCollapsed ? (
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
      ) : (
        /* Collapsed Strip View with Quick Icons */
        <div className="collapsed-menu">
          <button
            onClick={() => onSelectRail(null)}
            className={`icon-rail-btn ${activeRail === null ? "active-item" : ""}`}
            title="Show All Rails"
          >
            <Layers size={14} />
            <span className="icon-badge">ALL</span>
          </button>

          <div className="collapsed-divider">
            <Home size={10} className="divider-icon" />
          </div>

          {domesticRails.map(rail => (
            <button
              key={rail}
              onClick={() => onSelectRail(rail)}
              className={`icon-rail-btn ${activeRail === rail ? "active-item" : ""}`}
              title={`Domestic: ${rail}`}
            >
              <span className="rail-short">{rail.substring(0, 3)}</span>
            </button>
          ))}

          <div className="collapsed-divider">
            <Globe size={10} className="divider-icon" />
          </div>

          {crossRails.map(rail => (
            <button
              key={rail}
              onClick={() => onSelectRail(rail)}
              className={`icon-rail-btn ${activeRail === rail ? "active-item" : ""}`}
              title={`Cross-Border: ${rail}`}
            >
              <span className="rail-short">{rail.substring(0, 3)}</span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        .sidebar-container {
          width: 240px;
          background-color: var(--bg-surface);
          border-right: var(--border-default);
          display: flex;
          flex-direction: column;
          user-select: none;
          transition: width 0.2s ease-in-out;
          flex-shrink: 0;
        }
        .sidebar-collapsed {
          width: 48px;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 40px;
          padding: 0 12px;
          font-weight: bold;
          font-size: 11px;
          letter-spacing: 1px;
          border-bottom: var(--border-default);
          color: var(--accent-primary);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          white-space: nowrap;
        }
        .header-icon {
          color: var(--accent-primary);
          flex-shrink: 0;
        }
        .collapse-toggle-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 2px;
          transition: color 0.15s;
        }
        .collapse-toggle-btn:hover {
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

        /* Collapsed View Styles */
        .collapsed-menu {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 4px;
          gap: 6px;
          overflow-y: auto;
        }
        .icon-rail-btn {
          width: 36px;
          height: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: var(--border-default);
          background-color: var(--bg-primary);
          color: var(--color-text);
          font-size: 9px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .icon-rail-btn:hover {
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .rail-short {
          font-family: var(--font-mono);
          font-size: 9px;
        }
        .icon-badge {
          font-size: 8px;
          line-height: 1;
          margin-top: 1px;
        }
        .collapsed-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px 0;
          color: var(--color-text-muted);
          border-top: 1px dashed var(--color-text-muted);
          margin: 2px 0;
        }
        .divider-icon {
          opacity: 0.6;
        }
      `}</style>
    </aside>
  );
};
