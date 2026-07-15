import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { Lock, Shuffle, Key } from "lucide-react";
import { sha256 } from "../state/mockEngine";

export const CryptoTab: React.FC = () => {
  const { records } = useStore();
  const [activeTab, setActiveTab] = useState<"tokenise" | "hmac" | "aes">("tokenise");
  
  // States for interactive inputs
  const [tokenInput, setTokenInput] = useState("user_2841@bank");
  const [tokenHash, setTokenHash] = useState("");
  
  const [hmacInput, setHmacInput] = useState("RTGS|user_123|15000.00");
  const [hmacSig, setHmacSig] = useState("");

  const [aesInput, setAesInput] = useState("gsec_vault@corp");
  const [aesCipher, setAesCipher] = useState("");

  // Live rotators
  const [keyRotation, setKeyRotation] = useState("WHEEL_INDEX_A (0x99281a)");

  // Run hashing calculations asynchronously
  useEffect(() => {
    const calc = async () => {
      const hash = await sha256(tokenInput + "SUGRIVA_SALT_2026");
      setTokenHash(hash);
    };
    calc();
  }, [tokenInput]);

  useEffect(() => {
    const calc = async () => {
      const hash = await sha256(hmacInput + "SYSTEM_HMAC_SECRET_2026");
      setHmacSig(hash.substring(0, 32));
    };
    calc();
  }, [hmacInput]);

  useEffect(() => {
    const calc = async () => {
      // Replicate mock AES-256-GCM ciphertext output
      const raw = await sha256(aesInput + "SYSTEM_VAULT_KEY");
      setAesCipher(`AES-GCM[IV:a8f2...]: ${raw.substring(0, 24).toUpperCase()}`);
    };
    calc();
  }, [aesInput]);

  // Minor key rotation simulator tick
  useEffect(() => {
    const interval = setInterval(() => {
      const idxs = ["A", "B", "C", "D"];
      const hex = Math.floor(0x100000 + Math.random() * 0xefffff).toString(16);
      setKeyRotation(`WHEEL_INDEX_${idxs[Math.floor(Math.random() * 4)]} (0x${hex})`);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="crypto-tab-container">
      <div className="tab-header-row">
        <h2>Cryptographic Security Agility Gateway (NIST Standards)</h2>
      </div>

      <div className="crypto-grid">
        {/* Left Side Settings Form */}
        <div className="crypto-controls flat-border">
          <div className="controls-nav">
            <button 
              onClick={() => setActiveTab("tokenise")} 
              className={`nav-btn ${activeTab === "tokenise" ? "active-nav-btn" : ""}`}
            >
              <Shuffle size={12} />
              <span>PII Tokeniser</span>
            </button>
            <button 
              onClick={() => setActiveTab("hmac")} 
              className={`nav-btn ${activeTab === "hmac" ? "active-nav-btn" : ""}`}
            >
              <Key size={12} />
              <span>HMAC Signer</span>
            </button>
            <button 
              onClick={() => setActiveTab("aes")} 
              className={`nav-btn ${activeTab === "aes" ? "active-nav-btn" : ""}`}
            >
              <Lock size={12} />
              <span>AES Envelope</span>
            </button>
          </div>

          <div className="nav-panel-workspace">
            {activeTab === "tokenise" && (
              <div className="crypto-interactive-form">
                <h3>Stateless SHA-256 PII Scrubber</h3>
                <label>Plaintext VPA / Card PAN:</label>
                <input 
                  type="text" 
                  value={tokenInput} 
                  onChange={(e) => setTokenInput(e.target.value)} 
                  className="crypto-field"
                />
                
                <label>Deterministic Sanitised Token Output:</label>
                <div className="cipher-output">{tokenHash || "Computing..."}</div>
              </div>
            )}

            {activeTab === "hmac" && (
              <div className="crypto-interactive-form">
                <h3>SHA-256 HMAC Integrity Engine</h3>
                <label>Message Content Payload:</label>
                <input 
                  type="text" 
                  value={hmacInput} 
                  onChange={(e) => setHmacInput(e.target.value)} 
                  className="crypto-field"
                />
                
                <label>HMAC-SHA256 Message Authentication Code:</label>
                <div className="cipher-output">{hmacSig || "Computing..."}</div>
              </div>
            )}

            {activeTab === "aes" && (
              <div className="crypto-interactive-form">
                <h3>AES-256-GCM Envelope Encryption</h3>
                <label>Sensitive Vault Plaintext:</label>
                <input 
                  type="text" 
                  value={aesInput} 
                  onChange={(e) => setAesInput(e.target.value)} 
                  className="crypto-field"
                />
                
                <label>AES-256-GCM Encrypted Ciphertext Envelope:</label>
                <div className="cipher-output">{aesCipher || "Computing..."}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Logs & Key State */}
        <div className="crypto-key-panel flat-border">
          <div className="vault-header">
            <h3>Active Vault Rotation State</h3>
          </div>
          <div className="vault-indicator">
            <span className="indicator-label">ROTATION INDEX:</span>
            <span className="indicator-val">{keyRotation}</span>
          </div>

          <div className="crypto-logs">
            <h4>Live Cryptographic Processing Logs:</h4>
            <div className="logs-buffer">
              {records.slice(0, 10).map((rec, i) => (
                <div key={rec.timestamp + i} className="log-line">
                  <span className="log-ts">[{rec.timestamp}]</span>
                  <span className="log-msg">
                    Scrubbed PII vpa: {rec.vpa.substring(0, 4)}... encrypted. HMAC generated for rail {rec.rail}.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .crypto-tab-container {
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
        .crypto-grid {
          display: flex;
          gap: 20px;
          flex: 1;
          overflow: hidden;
        }
        .crypto-controls {
          flex: 1;
          background-color: var(--bg-surface);
          display: flex;
          flex-direction: column;
          border-radius: 3px;
        }
        .controls-nav {
          display: flex;
          border-bottom: var(--border-default);
        }
        .nav-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
          color: var(--color-text-muted);
          border-right: var(--border-default);
        }
        .nav-btn:last-child {
          border-right: none;
        }
        .active-nav-btn {
          border-bottom: 2px solid var(--accent-primary);
          color: var(--accent-primary);
          background-color: var(--bg-primary);
        }
        .nav-panel-workspace {
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }
        .crypto-interactive-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .crypto-interactive-form h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: bold;
          color: var(--accent-primary);
        }
        .crypto-interactive-form label {
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .crypto-field {
          height: 38px;
          border: var(--border-default);
          padding: 0 12px;
          outline: none;
          border-radius: 2px;
          font-size: 13px;
        }
        .crypto-field:focus {
          border: var(--border-highlight);
        }
        .cipher-output {
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 12px;
          word-break: break-all;
          min-height: 40px;
          border-radius: 2px;
          color: var(--color-text);
        }
        .crypto-key-panel {
          flex: 0 0 350px;
          background-color: var(--bg-surface);
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: 3px;
        }
        .vault-header h3 {
          margin: 0 0 10px 0;
          font-size: 13px;
          font-weight: bold;
        }
        .vault-indicator {
          background-color: var(--warning-bg);
          border: var(--border-default);
          border-left: 4px solid var(--warning-color);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 20px;
          border-radius: 2px;
        }
        .indicator-label {
          font-size: 9px;
          font-weight: bold;
          color: var(--warning-color);
        }
        .indicator-val {
          font-size: 12px;
          font-weight: bold;
          font-family: var(--font-mono);
          color: var(--color-text);
        }
        .crypto-logs {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .crypto-logs h4 {
          margin: 0 0 8px 0;
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .logs-buffer {
          flex: 1;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .log-line {
          line-height: 1.4;
          color: var(--color-text);
        }
        .log-ts {
          color: var(--color-text-muted);
          margin-right: 6px;
        }
      `}</style>
    </div>
  );
};
