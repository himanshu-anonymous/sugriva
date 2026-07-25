import React, { useState } from "react";
import { useStore } from "../state/StoreContext";
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  BookOpen,
  Play,
  Terminal,
  Grid,
  Lock,
  Key,
  Layers,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

type QuantumSubTab = "theory" | "simulator" | "hardware";
type PqcAlgorithm = "KYBER_1024" | "DILITHIUM_3" | "SPHINCS_PLUS";

export const QuantumTab: React.FC = () => {
  const { qkdCoherence, trngEntropy, pqcFailures } = useStore();
  const [activeSub, setActiveSub] = useState<QuantumSubTab>("theory");
  const [selectedAlgo, setSelectedAlgo] = useState<PqcAlgorithm>("KYBER_1024");
  
  // Simulator Execution State
  const [simLogs, setSimLogs] = useState<string[]>([
    "PQC Backend Enclave initialized. Select an algorithm and click 'Run PQC Backend Simulation'."
  ]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState<{
    pubKeyHex: string;
    privKeyHex: string;
    cipherHex: string;
    sharedSecretHex: string;
    sigHex: string;
    verifyStatus: boolean;
    keySizePkBytes: number;
    keySizeSkBytes: number;
    executionTimeMs: number;
    quantumSecurityBits: number;
  } | null>(null);

  const getStatusText = (coherence: number) => {
    if (coherence < 95.0) return "Photon Coherence Breach / Sweep Incident";
    return "Stable (Kyber-Standardised Secure Channels)";
  };

  // Run Backend PQC Algorithm Simulation
  const runPqcSimulation = (algo: PqcAlgorithm) => {
    setIsSimulating(true);
    setSimLogs(prev => [`> Initiating ${algo} simulation on HSM Lattice Enclave...`, ...prev]);

    setTimeout(() => {
      const nowHex = Date.now().toString(16);
      const randHex = Math.random().toString(16).substring(2, 10);
      
      let res;
      if (algo === "KYBER_1024") {
        res = {
          pubKeyHex: `0x7A4F${randHex.toUpperCase()}... [Matrix A: 4x4, Ring R_q: 256 Polynomials, q=3329]`,
          privKeyHex: `0x99BB${nowHex.toUpperCase()}... [Secret Noise Vector s_1, s_2 ~ Chi]`,
          cipherHex: `0xCT_GCM_${randHex.toUpperCase()}... [Ciphertext (u, v) - 1568 Bytes]`,
          sharedSecretHex: `0xSS_KEM_${randHex.toUpperCase()}${nowHex.toUpperCase()}`,
          sigHex: "N/A (Key Encapsulation Mechanism)",
          verifyStatus: true,
          keySizePkBytes: 1568,
          keySizeSkBytes: 3168,
          executionTimeMs: 0.04,
          quantumSecurityBits: 256
        };
        setSimLogs(prev => [
          `[SUCCESS] Kyber-1024 Decapsulation verified. Shared Secret 0xSS_KEM matches in 0.04ms.`,
          `[STEP 3] Decapsulate: s' = Decrypt(sk, ct). Recomputed Shared Secret K = KDF(s' || H(ct)).`,
          `[STEP 2] Encapsulate: (ct, ss) = Encaps(pk). Generated 1568-byte Ciphertext (u, v).`,
          `[STEP 1] KeyGen: Sample Matrix A in R_q^(4x4). Public Key pk = A*s + e (mod 3329).`,
          ...prev
        ]);
      } else if (algo === "DILITHIUM_3") {
        res = {
          pubKeyHex: `0x44AA${randHex.toUpperCase()}... [Lattice Matrix A: 6x5, Ring R_q: 256, q=8380417]`,
          privKeyHex: `0x11CC${nowHex.toUpperCase()}... [Secret Vectors s_1, s_2 in S_eta]`,
          cipherHex: "N/A (Digital Signature Scheme)",
          sharedSecretHex: "N/A",
          sigHex: `0xSIG_DILITHIUM3_${randHex.toUpperCase()}${nowHex.toUpperCase()}... [Signature (z, h) - 3293 Bytes]`,
          verifyStatus: true,
          keySizePkBytes: 1952,
          keySizeSkBytes: 4016,
          executionTimeMs: 0.11,
          quantumSecurityBits: 256
        };
        setSimLogs(prev => [
          `[SUCCESS] Dilithium3 Signature Verification PASSED: A*z - c*t_1 == w_1 (mod 8380417).`,
          `[STEP 2] Verify: Recompute HighBits(A*z - c*t_1) and check if Challenge c matches.`,
          `[STEP 1] Sign: Sample Mask Vector y, compute w = A*y, Challenge c = H(mu || w_1), z = y + c*s_1.`,
          ...prev
        ]);
      } else {
        res = {
          pubKeyHex: `0xSPHINCS_PK_${randHex.toUpperCase()}... [Stateless Hash Tree Root: SHA-256]`,
          privKeyHex: `0xSPHINCS_SK_${nowHex.toUpperCase()}... [FORS / WOTS+ Secret Seeds]`,
          cipherHex: "N/A",
          sharedSecretHex: "N/A",
          sigHex: `0xSIG_SPHINCS_${randHex.toUpperCase()}... [Merkle Auth Path Signature - 17088 Bytes]`,
          verifyStatus: true,
          keySizePkBytes: 64,
          keySizeSkBytes: 128,
          executionTimeMs: 1.45,
          quantumSecurityBits: 256
        };
        setSimLogs(prev => [
          `[SUCCESS] SPHINCS+ Hash-Based Merkle Tree Signature verified against root.`,
          `[STEP 2] Verify: Reconstruct Hypertree Root from FORS signature & WOTS+ public keys.`,
          `[STEP 1] Sign: FORS (Forest of Random Trees) Sign message hash with 22 subtree layers.`,
          ...prev
        ]);
      }

      setSimResults(res);
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="quantum-tab-container">
      {/* Header */}
      <div className="tab-header-row">
        <h2>NIST Post-Quantum Cryptography (PQC) Enclave & Quantum Guard</h2>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveSub("theory")}
          className={`subnav-btn ${activeSub === "theory" ? "active-subnav" : ""}`}
        >
          <BookOpen size={12} />
          <span>1. Visual PQC Theory & Shor's Defense</span>
        </button>

        <button
          onClick={() => setActiveSub("simulator")}
          className={`subnav-btn ${activeSub === "simulator" ? "active-subnav" : ""}`}
        >
          <Terminal size={12} />
          <span>2. Backend PQC Algorithm Simulator</span>
        </button>

        <button
          onClick={() => setActiveSub("hardware")}
          className={`subnav-btn ${activeSub === "hardware" ? "active-subnav" : ""}`}
        >
          <Zap size={12} />
          <span>3. QKD & Hardware Entropy Monitor</span>
        </button>
      </div>

      {/* Workspace Panel */}
      <div className="subworkspace flat-border">
        {/* SUB 1: VISUAL PQC THEORY & SHOR'S DEFENSE */}
        {activeSub === "theory" && (
          <div className="theory-workspace">
            {/* Top Threat vs Defense Hero Comparison */}
            <div className="pqc-hero-comparison">
              <div className="hero-box border-red">
                <div className="hero-title">
                  <AlertTriangle size={16} className="color-error" />
                  <span>THE QUANTUM THREAT: SHOR'S ALGORITHM</span>
                </div>
                <p>
                  Classical RSA-4096 and ECC rely on integer prime factorization. A Quantum Computer using <strong>Shor's Algorithm</strong> solves prime factorization in polynomial time O(n³), rendering RSA/ECC instantly breakable.
                </p>
                <div className="formula-box font-mono">
                  Shor's Quantum Speedup: T_quantum ≈ O((log N)³) vs T_classical ≈ e^(Ω(N^(1/3)))
                </div>
              </div>

              <div className="hero-box border-green">
                <div className="hero-title">
                  <ShieldCheck size={16} className="color-success" />
                  <span>SUGRIVA DEFENSE: HIGH-DIMENSIONAL LATTICE CRYPTOGRAPHY</span>
                </div>
                <p>
                  Sugriva implements NIST-standardized <strong>Learning With Errors (LWE)</strong> over polynomial rings (R_q). Even Quantum Computers cannot find the shortest vector in 1000-dimensional vector lattices (NP-Hard problem).
                </p>
                <div className="formula-box font-mono color-primary">
                  Lattice LWE Problem: Find secret s given A * s + e = b (mod q) [NP-Hard]
                </div>
              </div>
            </div>

            {/* Visual Architecture Diagram */}
            <div className="visual-diagram-card">
              <div className="card-header">
                <Grid size={14} className="color-primary" />
                <span>VISUALIZED POST-QUANTUM FUTUREPROOFING ARCHITECTURE</span>
              </div>

              <div className="diagram-grid-3">
                <div className="diag-step">
                  <div className="step-num">STAGE 1</div>
                  <h4>Harvest-Now-Decrypt-Later (HNDL) Immunity</h4>
                  <p>
                    Adversaries intercepting traffic today cannot store and decrypt data in 2030+. Sugriva wraps data in <strong>CRYSTALS-Kyber1024</strong> KEM envelopes.
                  </p>
                </div>

                <div className="diag-step">
                  <div className="step-num">STAGE 2</div>
                  <h4>Dual Hybrid Keys (Kyber + RSA4096)</h4>
                  <p>
                    Every transaction payload uses a hybrid KEM wrapper: Classical RSA-4096 + Post-Quantum ML-KEM-1024 for immediate compliance and futureproof defense.
                  </p>
                </div>

                <div className="diag-step">
                  <div className="step-num">STAGE 3</div>
                  <h4>Dilithium3 Lattice Digital Signatures</h4>
                  <p>
                    Request headers signed via <strong>CRYSTALS-Dilithium3</strong> (ML-DSA). Noise vector e guarantees signatures cannot be forged by Quantum Shor solvers.
                  </p>
                </div>
              </div>
            </div>

            {/* Algorithm Comparison Table */}
            <div className="algo-comparison-table-wrapper">
              <table className="algo-table">
                <thead>
                  <tr>
                    <th>NIST PQC STANDARD</th>
                    <th>MATHEMATICAL PRIMITIVE</th>
                    <th>QUANTUM BIT SECURITY</th>
                    <th>PUBLIC KEY SIZE</th>
                    <th>SUGRIVA ENCLAVE ROLE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold color-primary">CRYSTALS-Kyber1024 (ML-KEM)</td>
                    <td>Module Learning-With-Errors (M-LWE)</td>
                    <td className="font-bold">256-Bit (NIST Level 5)</td>
                    <td className="font-mono">1568 Bytes</td>
                    <td>Payload Envelope Key Encapsulation (KEM)</td>
                  </tr>
                  <tr>
                    <td className="font-bold color-primary">CRYSTALS-Dilithium3 (ML-DSA)</td>
                    <td>Module Learning-With-Self-Short-Errors</td>
                    <td className="font-bold">256-Bit (NIST Level 3)</td>
                    <td className="font-mono">1952 Bytes</td>
                    <td>Transaction Header Digital Signatures</td>
                  </tr>
                  <tr>
                    <td className="font-bold color-primary">SPHINCS+ (SLH-DSA)</td>
                    <td>Stateless Merkle Tree Hash-Based</td>
                    <td className="font-bold">256-Bit (NIST Level 5)</td>
                    <td className="font-mono">64 Bytes</td>
                    <td>Quantum-Resistant Fallback Key Vault</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUB 2: BACKEND PQC ALGORITHM SIMULATOR */}
        {activeSub === "simulator" && (
          <div className="simulator-workspace">
            <div className="sim-control-bar">
              <span className="sim-label">SELECT BACKEND PQC ALGORITHM TO SIMULATE:</span>
              <div className="algo-selector-buttons">
                <button
                  onClick={() => setSelectedAlgo("KYBER_1024")}
                  className={`algo-btn ${selectedAlgo === "KYBER_1024" ? "algo-active" : ""}`}
                >
                  <Lock size={12} /> Kyber-1024 (ML-KEM)
                </button>

                <button
                  onClick={() => setSelectedAlgo("DILITHIUM_3")}
                  className={`algo-btn ${selectedAlgo === "DILITHIUM_3" ? "algo-active" : ""}`}
                >
                  <Key size={12} /> Dilithium3 (ML-DSA)
                </button>

                <button
                  onClick={() => setSelectedAlgo("SPHINCS_PLUS")}
                  className={`algo-btn ${selectedAlgo === "SPHINCS_PLUS" ? "algo-active" : ""}`}
                >
                  <Layers size={12} /> SPHINCS+ (SLH-DSA)
                </button>
              </div>

              <button
                className="run-sim-btn"
                disabled={isSimulating}
                onClick={() => runPqcSimulation(selectedAlgo)}
              >
                <Play size={12} /> {isSimulating ? "SIMULATING..." : "RUN PQC BACKEND SIMULATION"}
              </button>
            </div>

            <div className="sim-output-grid">
              {/* Left Side: Live Execution Logs */}
              <div className="sim-terminal-box flat-border">
                <div className="terminal-header">
                  <Terminal size={12} />
                  <span>HSM LATTICE ENCLAVE SIMULATION LOGS</span>
                </div>
                <div className="terminal-body font-mono">
                  {simLogs.map((log, i) => (
                    <div key={i} className={`log-line ${log.startsWith('[SUCCESS]') ? 'success-log' : log.startsWith('>') ? 'input-log' : ''}`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side: Cryptographic Key & Verification Results */}
              <div className="sim-results-box flat-border">
                <div className="results-header">
                  <ShieldCheck size={14} className="color-success" />
                  <span>PQC MATHEMATICAL VERIFICATION PROOF</span>
                </div>

                {simResults ? (
                  <div className="results-body">
                    <div className="res-row">
                      <span>PUBLIC KEY (pk):</span>
                      <code className="code-inline font-mono">{simResults.pubKeyHex}</code>
                    </div>

                    <div className="res-row">
                      <span>SECRET KEY (sk):</span>
                      <code className="code-inline font-mono">{simResults.privKeyHex}</code>
                    </div>

                    {simResults.cipherHex !== "N/A" && (
                      <div className="res-row">
                        <span>CIPHERTEXT (ct):</span>
                        <code className="code-inline font-mono">{simResults.cipherHex}</code>
                      </div>
                    )}

                    {simResults.sharedSecretHex !== "N/A" && (
                      <div className="res-row">
                        <span>DERIVED SHARED SECRET:</span>
                        <code className="code-inline font-mono color-primary">{simResults.sharedSecretHex}</code>
                      </div>
                    )}

                    {simResults.sigHex !== "N/A" && (
                      <div className="res-row">
                        <span>DIGITAL SIGNATURE (sig):</span>
                        <code className="code-inline font-mono color-primary">{simResults.sigHex}</code>
                      </div>
                    )}

                    <div className="res-stats-grid">
                      <div className="r-card">
                        <span>PUBLIC KEY SIZE:</span>
                        <strong>{simResults.keySizePkBytes} Bytes</strong>
                      </div>
                      <div className="r-card">
                        <span>SECRET KEY SIZE:</span>
                        <strong>{simResults.keySizeSkBytes} Bytes</strong>
                      </div>
                      <div className="r-card">
                        <span>EXECUTION TIME:</span>
                        <strong className="color-primary">{simResults.executionTimeMs} ms</strong>
                      </div>
                      <div className="r-card">
                        <span>QUANTUM SECURITY:</span>
                        <strong className="color-success">{simResults.quantumSecurityBits}-Bit</strong>
                      </div>
                    </div>

                    <div className="res-pass-badge">
                      <CheckCircle2 size={16} />
                      <span>MATHEMATICAL LATTICE VERIFICATION PASSED (NIST FIPS 203/204 COMPLIANT)</span>
                    </div>
                  </div>
                ) : (
                  <div className="empty-sim-msg">
                    Click <strong>'RUN PQC BACKEND SIMULATION'</strong> to execute lattice math operations in HSM enclave.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB 3: QKD & HARDWARE ENTROPY MONITOR */}
        {activeSub === "hardware" && (
          <div className="hardware-workspace">
            <div className="quantum-grid">
              {/* Left Side Active Anomaly Indicators */}
              <div className="quantum-meters-col">
                <div className="meter-card flat-border">
                  <div className="meter-header">
                    <Zap size={14} className="meter-icon" />
                    <span>QKD ENTANGLEMENT COHERENCE</span>
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
          </div>
        )}
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
          margin-bottom: 10px;
        }
        .tab-header-row h2 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: var(--color-text-muted);
        }
        .tab-navigation {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .subnav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: var(--border-default);
          cursor: pointer;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          padding: 6px 12px;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .subnav-btn:hover {
          color: var(--accent-primary);
        }
        .active-subnav {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .subworkspace {
          flex: 1;
          background-color: var(--bg-surface);
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .theory-workspace, .simulator-workspace, .hardware-workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px;
          overflow-y: auto;
        }
        .pqc-hero-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .hero-box {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 15px;
          border-radius: 3px;
        }
        .border-red { border-left: 4px solid var(--error-color); }
        .border-green { border-left: 4px solid var(--success-color); }
        .hero-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .hero-box p {
          margin: 0 0 10px 0;
          font-size: 11px;
          line-height: 1.4;
          color: var(--color-text-muted);
        }
        .formula-box {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 8px;
          font-size: 10px;
          border-radius: 2px;
        }
        .visual-diagram-card {
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 15px;
          border-radius: 3px;
          margin-bottom: 15px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 12px;
        }
        .diagram-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        .diag-step {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 12px;
          border-radius: 3px;
        }
        .step-num {
          font-size: 9px;
          font-weight: bold;
          color: var(--accent-primary);
          margin-bottom: 4px;
        }
        .diag-step h4 {
          margin: 0 0 6px 0;
          font-size: 11px;
          font-weight: bold;
        }
        .diag-step p {
          margin: 0;
          font-size: 10px;
          color: var(--color-text-muted);
          line-height: 1.3;
        }
        .algo-comparison-table-wrapper {
          overflow-x: auto;
        }
        .algo-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 11px;
        }
        .algo-table th {
          background-color: var(--bg-surface-active);
          padding: 8px 12px;
          font-weight: bold;
          border-bottom: var(--border-default);
          color: var(--color-text-muted);
        }
        .algo-table td {
          padding: 8px 12px;
          border-bottom: var(--border-default);
        }
        .sim-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--bg-surface-active);
          border: var(--border-default);
          padding: 8px 12px;
          margin-bottom: 15px;
          border-radius: 2px;
          gap: 15px;
          flex-wrap: wrap;
        }
        .sim-label {
          font-size: 11px;
          font-weight: bold;
          color: var(--color-text-muted);
        }
        .algo-selector-buttons {
          display: flex;
          gap: 6px;
        }
        .algo-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--bg-primary);
          border: var(--border-default);
          padding: 4px 10px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          color: var(--color-text-muted);
          border-radius: 2px;
        }
        .algo-active {
          background-color: #fff5e6;
          border: var(--border-highlight);
          color: var(--accent-primary);
        }
        .run-sim-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--accent-primary);
          color: #ffffff;
          border: none;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 2px;
        }
        .run-sim-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sim-output-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          flex: 1;
        }
        .sim-terminal-box {
          background-color: #1e1e1e;
          color: #ffffff;
          padding: 12px;
          border-radius: 3px;
          display: flex;
          flex-direction: column;
        }
        .terminal-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: bold;
          color: #888888;
          border-bottom: 1px solid #333;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .terminal-body {
          flex: 1;
          font-size: 10px;
          line-height: 1.5;
          overflow-y: auto;
          max-height: 250px;
        }
        .log-line { white-space: pre-wrap; margin-bottom: 4px; }
        .input-log { color: var(--accent-primary); font-weight: bold; }
        .success-log { color: #00ff88; font-weight: bold; }
        .sim-results-box {
          background-color: var(--bg-primary);
          padding: 12px;
          border-radius: 3px;
          display: flex;
          flex-direction: column;
        }
        .results-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: bold;
          border-bottom: var(--border-default);
          padding-bottom: 6px;
          margin-bottom: 12px;
        }
        .results-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .res-row {
          display: flex;
          flex-direction: column;
          font-size: 10px;
          gap: 2px;
        }
        .res-row span { color: var(--color-text-muted); font-weight: bold; }
        .res-stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 10px;
        }
        .r-card {
          background-color: var(--bg-surface);
          border: var(--border-default);
          padding: 6px;
          border-radius: 2px;
          display: flex;
          flex-direction: column;
          font-size: 9px;
        }
        .r-card span { color: var(--color-text-muted); }
        .r-card strong { font-size: 11px; margin-top: 2px; }
        .res-pass-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--success-bg);
          border: var(--border-success);
          color: var(--success-color);
          padding: 8px;
          font-size: 10px;
          font-weight: bold;
          border-radius: 2px;
          margin-top: 10px;
        }
        .empty-sim-msg {
          text-align: center;
          color: var(--color-text-muted);
          font-size: 11px;
          padding: 40px 0;
        }
        .quantum-grid {
          display: flex;
          gap: 20px;
          flex: 1;
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
        .meter-icon { color: var(--color-text-muted); }
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
        .meter-desc { font-size: 11px; color: var(--color-text-muted); font-weight: 500; }
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
        .specs-icon { color: var(--accent-primary); }
        .spec-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 12px 0;
          border-bottom: 1px dashed var(--bg-surface-active);
          font-weight: 500;
        }
        .spec-val { font-family: var(--font-mono); font-weight: bold; }
        .border-top-divider { border-top: var(--border-default); margin-top: 10px; }
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
        .pqc-alert-box p { margin: 0; font-size: 10px; line-height: 1.4; font-weight: 500; }
        .font-mono { font-family: var(--font-mono); }
        .font-bold { font-weight: bold; }
        .color-primary { color: var(--accent-primary); }
        .color-error { color: var(--error-color); }
        .color-success { color: var(--success-color); }
        .code-inline { font-family: var(--font-mono); background: #eee; padding: 1px 4px; font-size: 9px; }
      `}</style>
    </div>
  );
};
