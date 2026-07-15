import React from "react";
import { useStore } from "../state/StoreContext";
import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";

export const AuthMonitorTab: React.FC = () => {
  const { records, threshold } = useStore();

  const recent = records.slice(0, 15);

  const getStepUpAction = (risk: number) => {
    if (risk >= threshold) {
      return {
        label: "DIGILOCKER KYC REQUIRED",
        desc: "Identity blocked. Sandboxed biometric/credential verify required.",
        class: "kyc-required"
      };
    }
    if (risk >= 0.50) {
      return {
        label: "SMS OTP PENDING",
        desc: "Held in escrow. Secondary transaction-bound token validation required.",
        class: "otp-pending"
      };
    }
    return {
      label: "INLINE PASS",
      desc: "Autocleared via low-risk GNN parameter threshold validation.",
      class: "inline-pass"
    };
  };

  return (
    <div className="auth-tab-container">
      <div className="tab-header-row">
        <h2>Risk-Based Adaptive Authentication Challenges (RBI Directions & DPDP 2023)</h2>
      </div>

      <div className="auth-mesh-grid">
        <div className="auth-steps-overview">
          <div className="step-card inline-pass-card">
            <ShieldCheck size={18} />
            <div className="step-details">
              <h3>Low Risk (&lt;0.50)</h3>
              <p>Autocleared instantly using standard classical token parameters.</p>
            </div>
          </div>
          <div className="step-card otp-pending-card">
            <KeyRound size={18} />
            <div className="step-details">
              <h3>Elevated Risk (0.50 - 0.75)</h3>
              <p>Requires transaction-bound dynamic 2FA/TOTP response verification.</p>
            </div>
          </div>
          <div className="step-card kyc-required-card">
            <ShieldAlert size={18} />
            <div className="step-details">
              <h3>Critical Risk (&gt;=0.75)</h3>
              <p>Quarantines transaction, locks VPA accounts, prompts DigiLocker KYC.</p>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="auth-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ACCOUNT VPA</th>
                <th>RISK SCORE</th>
                <th>AUTHENTICATION STATE CHALLENGE</th>
                <th>COMPLIANCE DISPATCH ACTION</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row-msg">
                    No active transaction authentication loops logged.
                  </td>
                </tr>
              ) : (
                recent.map((rec, i) => {
                  const challenge = getStepUpAction(rec.risk);
                  return (
                    <tr key={rec.timestamp + i} className={challenge.class}>
                      <td className="timestamp-col">{rec.timestamp}</td>
                      <td className="vpa-col">{rec.vpa}</td>
                      <td className="risk-col">{rec.risk.toFixed(4)}</td>
                      <td className="challenge-label">{challenge.label}</td>
                      <td className="challenge-desc">{challenge.desc}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .auth-tab-container {
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
        .auth-mesh-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          flex: 1;
          overflow: hidden;
        }
        .auth-steps-overview {
          display: flex;
          gap: 20px;
        }
        .step-card {
          flex: 1;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 15px;
          border: var(--border-default);
          background-color: var(--bg-surface);
          border-radius: 3px;
        }
        .step-details h3 {
          margin: 0 0 4px 0;
          font-size: 12px;
          font-weight: bold;
        }
        .step-details p {
          margin: 0;
          font-size: 11px;
          color: var(--color-text-muted);
          line-height: 1.4;
        }
        
        .inline-pass-card {
          border-left: 4px solid var(--success-color);
          color: var(--success-color);
        }
        .otp-pending-card {
          border-left: 4px solid var(--warning-color);
          color: var(--warning-color);
        }
        .kyc-required-card {
          border-left: 4px solid var(--error-color);
          color: var(--error-color);
        }
        
        .table-wrapper {
          flex: 1;
          overflow-y: auto;
          border: var(--border-default);
          background-color: var(--bg-surface);
        }
        .auth-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }
        .auth-table th {
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
        .auth-table td {
          padding: 10px 15px;
          border-bottom: var(--border-default);
        }
        .timestamp-col {
          color: var(--color-text-muted);
        }
        .vpa-col {
          font-family: var(--font-mono);
          font-weight: bold;
        }
        .risk-col {
          font-weight: bold;
        }
        .challenge-label {
          font-weight: bold;
        }
        .challenge-desc {
          color: var(--color-text-muted);
        }
        
        /* Row Highlighting styling overrides */
        .inline-pass .challenge-label, .inline-pass .risk-col {
          color: var(--success-color);
        }
        .otp-pending {
          background-color: var(--warning-bg);
        }
        .otp-pending .challenge-label, .otp-pending .risk-col {
          color: var(--warning-color);
        }
        .kyc-required {
          background-color: var(--error-bg);
        }
        .kyc-required .challenge-label, .kyc-required .risk-col {
          color: var(--error-color);
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
