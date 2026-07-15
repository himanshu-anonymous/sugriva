import React from "react";
import { useStore } from "../state/StoreContext";
import { Cpu, ShieldCheck, Zap, Activity } from "lucide-react";

export const QuantumTab: React.FC = () => {
  const { qkdCoherence, trngEntropy, pqcFailures } = useStore();

  const getStatusText = (coherence: number) => {
    if (coherence < 95.0) return "Photon Coherence Breach / Sweep Incident";
    return "Stable (Kyber-Standardised Secure Channels)";
  };

  return (
    <div className="quantum-tab-container">
      <div className="tab-header-row">
        <h2>Quantum Risk Monitoring Control (NIST Post-Quantum Cryptography Guidelines)</h2>
      </div>

      <div className="quantum-grid">
        {/* Left Side Active Anomaly Indicators */}
        <div className="quantum-meters-col">
          <div className="meter-card flat-border">
            <div className="meter-header">
              <Zap size={14} className="meter-icon" />
              <span>QKD ENTAGLEMENT COHERENCE</span>
            </div>
            <div className="meter-value" style={{ color: qkdCoherence < 95.0 ? "var(--error-color)" : "var(--quantum-color)" }}>
              {qkdCoherence.toFixed(2)}%
            </div>
            <div className="meter-progress-bar">
              <div 
                className="bar-fill" 
                style={{ 
                  width: `${qkdCoherence}%`,
                  backgroundColor: qkdCoherence < 95.0 ? "var(--error-color)" : "var(--quantum-color)" 
                }} 
              />
            </div>
            <div className="meter-desc">{getStatusText(qkdCoherence)}</div>
          </div>

          <div className="meter-card flat-border">
            <div className="meter-header">
              <Activity size={14} className="meter-icon" />
              <span>TRNG HARDWARE ENTROPY</span>
            </div>
            <div className="meter-value" style={{ color: trngEntropy < 50.0 ? "var(--error-color)" : "var(--accent-primary)" }}>
              {trngEntropy.toFixed(1)} bits
            </div>
            <div className="meter-progress-bar">
              <div 
                className="bar-fill" 
                style={{ 
                  width: `${trngEntropy}%`,
                  backgroundColor: trngEntropy < 50.0 ? "var(--error-color)" : "var(--accent-primary)" 
                }} 
              />
            </div>
            <div className="meter-desc">Hardware thermal entropy pool state.</div>
          </div>
        </div>

        {/* Right Side Algorithm Speed Stats */}
        <div className="quantum-specs-col flat-border">
          <div className="specs-header">
            <Cpu size={14} className="specs-icon" />
            <span>NIST Cryptographic Decryption Engine</span>
          </div>

          <div className="spec-row">
            <span>Kyber KEM Encapsulation Speed:</span>
            <span className="spec-val">0.04 ms</span>
          </div>
          <div className="spec-row">
            <span>Dilithium Signature Verify:</span>
            <span className="spec-val">0.11 ms</span>
          </div>
          <div className="spec-row">
            <span>ML-KEM-768 Decipher Errors:</span>
            <span className="spec-val" style={{ color: pqcFailures > 0 ? "var(--error-color)" : "var(--success-color)" }}>
              {pqcFailures}
            </span>
          </div>
          <div className="spec-row border-top-divider">
            <span>Agility Algorithm Status:</span>
            <span className="status-label success-badge">NATIVE PQC SECURED</span>
          </div>

          <div className="pqc-alert-box">
            <ShieldCheck size={18} />
            <p>Agility wrapper dynamically wraps classical keys inside ML-KEM-768 ciphers to prevent Harvest-Now-Decrypt-Later (HNDL) sweeps.</p>
          </div>
        </div>
      </div>

      <style>{`
        .quantum-tab-container {
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
        .quantum-grid {
          display: flex;
          gap: 20px;
          flex: 1;
          overflow: hidden;
        }
        .quantum-meters-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .meter-card {
          background-color: var(--bg-surface);
          padding: 20px;
          display: flex;
          flex-direction: column;
          border-radius: 3px;
        }
        .meter-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
          margin-bottom: 10px;
        }
        .meter-icon {
          color: var(--color-text-muted);
        }
        .meter-value {
          font-size: 28px;
          font-weight: 900;
          margin-bottom: 12px;
          font-family: var(--font-mono);
        }
        .meter-progress-bar {
          height: 8px;
          background-color: var(--bg-surface-active);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        .bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        .meter-desc {
          font-size: 11px;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        
        .quantum-specs-col {
          flex: 0 0 350px;
          background-color: var(--bg-surface);
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: 3px;
        }
        .specs-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 20px;
          color: var(--accent-primary);
        }
        .specs-icon {
          color: var(--accent-primary);
        }
        .spec-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 12px 0;
          border-bottom: 1px dashed var(--bg-surface-active);
          font-weight: 500;
        }
        .spec-row:last-child {
          border-bottom: none;
        }
        .spec-val {
          font-family: var(--font-mono);
          font-weight: bold;
        }
        .border-top-divider {
          border-top: var(--border-default);
          margin-top: 10px;
        }
        .pqc-alert-box {
          margin-top: auto;
          background-color: var(--quantum-bg);
          border: 1px solid var(--quantum-color);
          border-left: 4px solid var(--quantum-color);
          padding: 12px;
          border-radius: 2px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: var(--quantum-color);
        }
        .pqc-alert-box p {
          margin: 0;
          font-size: 10px;
          line-height: 1.4;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
