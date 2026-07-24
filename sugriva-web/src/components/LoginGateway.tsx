import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UploadCloud, AlertCircle, CheckCircle, ArrowRight, Download, UserPlus, LogIn } from "lucide-react";

export const LoginGateway: React.FC = () => {
  const { setIsAuthenticated, setRole, writeAudit, adminAccounts, registerAdminAccount } = useStore();
  const [gatewayMode, setGatewayMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"credentials" | "otp" | "sdk">("credentials");

  // --- LOGIN STATES ---
  const [vpaId, setVpaId] = useState("");
  const [password, setPassword] = useState("");
  const [credError, setCredError] = useState("");

  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showOtpHint, setShowOtpHint] = useState(false);

  const [dragOver, setDragOver] = useState(false);
  const [sdkError, setSdkError] = useState("");
  const [sdkSuccessMsg, setSdkSuccessMsg] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  // --- SIGNUP STATES ---
  const [regVpa, setRegVpa] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regHardwareToken, setRegHardwareToken] = useState("");
  const [regComplianceLevel, setRegComplianceLevel] = useState("Tier-1 Audit");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  
  // Custom Dynamic SDK download state
  const [sdkDownloadUrl, setSdkDownloadUrl] = useState<string | null>(null);
  const [sdkDownloadName, setSdkDownloadName] = useState("");

  // Password Complexity Evaluator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "#ccc" };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1: return { score, label: "Weak (Length too short)", color: "#ff3b30" };
      case 2: return { score, label: "Medium (Add number/symbol)", color: "#ffcc00" };
      case 3: return { score, label: "Strong (Highly Secure)", color: "#34c759" };
      case 4: return { score, label: "Quantum Resistant", color: "#009933" };
      default: return { score: 0, label: "Weak", color: "#ff3b30" };
    }
  };

  const strength = getPasswordStrength(regPassword);

  // Trigger random OTP generation on moving to OTP step
  useEffect(() => {
    if (step === "otp" && gatewayMode === "login") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpInput("");
      setOtpError("");
      writeAudit(`Multi-factor authorization triggered for '${vpaId}'. OTP generated.`, "SUCCESS");
      
      const timer = setTimeout(() => setShowOtpHint(true), 800);
      return () => clearTimeout(timer);
    }
  }, [step, gatewayMode]);

  // Handle Login Credential check
  const handleCredSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError("");

    if (!vpaId || !password) {
      setCredError("VPA identity and administrative password are required.");
      return;
    }

    const matchedAccount = adminAccounts[vpaId.trim().toLowerCase()];
    if (matchedAccount && matchedAccount.password === password) {
      setStep("otp");
    } else {
      setCredError("Authentication failed. Invalid VPA ID or administrative password.");
      writeAudit(`Failed login attempt: Credentials mismatch for VPA '${vpaId}'`, "DENIED");
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (otpInput === generatedOtp) {
      setStep("sdk");
      writeAudit(`MFA verification successful for VPA '${vpaId}'. Proceeding to SDK integrity check.`, "SUCCESS");
    } else {
      setOtpError("Invalid security verification code. Please check the code.");
      writeAudit(`MFA verification check failed for VPA '${vpaId}'`, "DENIED");
    }
  };

  // Handle uploaded SDK Key validation
  const processSdkFile = (file: File) => {
    setSdkError("");
    setSdkSuccessMsg("");
    setUploadedFileName(file.name);

    if (!file.name.endsWith(".json")) {
      setSdkError("Invalid file type. The gateway requires a valid JSON license file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Check if standard static key
        const isDefaultStaticSdk = 
          parsed.sdk_identifier === "SUGRIVA-PQC-SECURE-SDK-v2.0" && 
          parsed.license_signature && 
          !parsed.owner_vpa;

        const fileVpa = parsed.owner_vpa?.trim().toLowerCase() || "admin";
        const matched = adminAccounts[fileVpa];

        const isSignatureMatch = isDefaultStaticSdk || (
          matched && parsed.signature === matched.signature
        );

        if (
          parsed.sdk_identifier === "SUGRIVA-PQC-SECURE-SDK-v2.0" && 
          parsed.status === "VERIFIED_COMPLIANT" &&
          isSignatureMatch
        ) {
          setSdkSuccessMsg("Verification SDK Package fully parsed. Hardware signatures match.");
          writeAudit(`Local validation SDK signatures matching registered signature for VPA '${fileVpa}'.`, "SUCCESS");
          
          setRole("ADMIN");
          setTimeout(() => {
            setIsAuthenticated(true);
          }, 1000);
        } else {
          setSdkError("Invalid signature signature headers. The SDK license is broken, mismatched or spoofed.");
          writeAudit(`Local validation SDK signature mismatch for VPA '${fileVpa}'. Access Denied.`, "DENIED");
        }
      } catch (err) {
        setSdkError("Failed to parse package payload. Ensure file structure is correct JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSdkFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSdkFile(e.target.files[0]);
    }
  };

  // Handle Signup Registration
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    setSdkDownloadUrl(null);

    const cleanVpa = regVpa.trim().toLowerCase();

    if (!cleanVpa || !regPassword || !regHardwareToken) {
      setRegError("All security fields are required to establish trust verification.");
      return;
    }

    if (adminAccounts[cleanVpa]) {
      setRegError("VPA ID already registered in the central audit registry.");
      return;
    }

    if (strength.score < 3) {
      setRegError("Password security strength does not meet compliance requirements. Add numbers/symbols.");
      return;
    }

    // Dynamic Signature generation
    const randSignature = `SUGRIVA-PQC-SIG-${Math.floor(10000000 + Math.random() * 89999999)}-${regHardwareToken.toUpperCase()}`;

    // Update state registry in central mock store
    registerAdminAccount(cleanVpa, regPassword, randSignature);
    writeAudit(`Registered new administrative node: VPA '${cleanVpa}' with Hardware ID '${regHardwareToken}'`, "SUCCESS");

    // Dynamic generation of personalized SDK JSON file download URL
    const sdkPayload = {
      sdk_identifier: "SUGRIVA-PQC-SECURE-SDK-v2.0",
      owner_vpa: cleanVpa,
      hardware_token_id: regHardwareToken,
      compliance_tier: regComplianceLevel,
      signature: randSignature,
      status: "VERIFIED_COMPLIANT",
      creation_epoch: Date.now(),
      issuer: "Sugriva Dynamic Key Registration Node"
    };

    const blob = new Blob([JSON.stringify(sdkPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    setSdkDownloadUrl(url);
    setSdkDownloadName(`sugriva_sdk_${cleanVpa}.json`);
    setRegSuccess("Administrative profile compiled successfully!");
  };

  return (
    <div className="login-gateway-overlay">
      <style>{`
        .login-gateway-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #fcfcfc;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .login-card {
          width: 480px;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);
          padding: 36px;
          border-radius: 4px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-logo {
          font-family: 'Quattrocento', serif;
          font-size: 30px;
          font-weight: 700;
          letter-spacing: 6px;
          color: var(--accent-primary, #ff6600);
          margin-bottom: 6px;
        }

        .login-subtitle {
          font-size: 13px;
          color: #666666;
          font-weight: 500;
        }

        .step-indicator-bar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 24px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 12px;
        }

        .step-dot {
          font-size: 11px;
          font-weight: 700;
          color: #aaaaaa;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .step-dot.active {
          color: var(--accent-primary, #ff6600);
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #444444;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #dcdcdc;
          background-color: #fafafa;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          border-color: var(--accent-primary, #ff6600);
          background-color: #ffffff;
        }

        .login-btn {
          width: 100%;
          padding: 14px;
          background-color: var(--accent-primary, #ff6600);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-btn:hover {
          opacity: 0.9;
        }

        .error-message {
          margin-top: 14px;
          background-color: #ffebe6;
          border: 1px solid #ff3b30;
          color: #ff3b30;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .success-message {
          margin-top: 14px;
          background-color: #e6ffe6;
          border: 1px solid #009933;
          color: #009933;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .otp-hint {
          background-color: #e6f7ff;
          border: 1px solid #1890ff;
          color: #1890ff;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .copy-badge {
          background-color: #1890ff;
          color: #ffffff;
          padding: 2px 6px;
          font-size: 10px;
          font-family: monospace;
          cursor: pointer;
          border-radius: 2px;
        }

        .drag-box {
          border: 2px dashed #cccccc;
          background-color: #fcfcfc;
          padding: 30px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }

        .drag-box.dragover {
          border-color: var(--accent-primary, #ff6600);
          background-color: #fffaf5;
        }

        .drag-title {
          font-size: 14px;
          font-weight: 700;
          color: #333333;
          margin: 10px 0 4px 0;
        }

        .drag-desc {
          font-size: 11px;
          color: #666666;
          margin-bottom: 12px;
        }

        .file-upload-input {
          display: none;
        }

        .download-sdk-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--accent-primary, #ff6600);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 700;
          text-decoration: underline;
          padding: 0;
          margin-top: 6px;
        }

        .download-sdk-btn:hover {
          color: #cc5200;
        }

        .mode-toggle-link {
          display: block;
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666666;
          cursor: pointer;
          font-weight: 600;
        }

        .mode-toggle-link span {
          color: var(--accent-primary, #ff6600);
          text-decoration: underline;
        }

        .password-strength-bar {
          height: 4px;
          background-color: #e0e0e0;
          margin-top: 6px;
          border-radius: 2px;
          overflow: hidden;
        }

        .password-strength-fill {
          height: 100%;
          transition: width 0.3s ease, background-color 0.3s ease;
        }

        .password-strength-text {
          font-size: 11px;
          font-weight: 600;
          margin-top: 4px;
          display: block;
        }

        .sdk-download-box {
          background-color: #e6ffe6;
          border: 1px solid #009933;
          padding: 16px;
          margin-bottom: 20px;
          text-align: center;
        }
      `}</style>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">SUGRIVA</div>
          <div className="login-subtitle">Secured Threat Containment Platform</div>
        </div>

        {gatewayMode === "login" ? (
          <>
            <div className="step-indicator-bar">
              <span className={`step-dot ${step === "credentials" ? "active" : ""}`}>1. Credentials</span>
              <span className={`step-dot ${step === "otp" ? "active" : ""}`}>2. OTP Code</span>
              <span className={`step-dot ${step === "sdk" ? "active" : ""}`}>3. SDK Package</span>
            </div>

            <AnimatePresence mode="wait">
              {step === "credentials" && (
                <motion.form 
                  key="credentials"
                  onSubmit={handleCredSubmit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="form-group">
                    <label className="form-label">Administrator ID</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. admin" 
                      value={vpaId}
                      onChange={(e) => setVpaId(e.target.value)}
                      autoComplete="username"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Secure Access Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="e.g. adminpassword"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>

                  <button type="submit" className="login-btn">
                    Authorize Credentials <ArrowRight size={14} />
                  </button>

                  {credError && (
                    <div className="error-message">
                      <AlertCircle size={14} />
                      <span>{credError}</span>
                    </div>
                  )}

                  <div className="mode-toggle-link" onClick={() => setGatewayMode("signup")}>
                    Request new administrative profile? <span>Sign Up</span>
                  </div>
                </motion.form>
              )}

              {step === "otp" && (
                <motion.form 
                  key="otp"
                  onSubmit={handleOtpSubmit}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  {showOtpHint && (
                    <div className="otp-hint">
                      <span>🔒 Code: <strong>{generatedOtp}</strong></span>
                      <span className="copy-badge" onClick={() => setOtpInput(generatedOtp)}>Autofill code</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">MFA Security Code (OTP)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Enter 6-digit code" 
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <button type="submit" className="login-btn">
                    Verify Secure Code <ShieldCheck size={14} />
                  </button>

                  {otpError && (
                    <div className="error-message">
                      <AlertCircle size={14} />
                      <span>{otpError}</span>
                    </div>
                  )}
                </motion.form>
              )}

              {step === "sdk" && (
                <motion.div 
                  key="sdk"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div 
                    className={`drag-box ${dragOver ? "dragover" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById("file-upload-input")?.click()}
                  >
                    <UploadCloud size={32} style={{ color: dragOver ? "var(--accent-primary)" : "#888888" }} />
                    <div className="drag-title">Upload Verification SDK License</div>
                    <div className="drag-desc">Drag & drop your downloaded sugriva_sdk_[id].json file here</div>
                    {uploadedFileName && <span className="flat-badge">{uploadedFileName}</span>}
                    <input 
                      type="file" 
                      id="file-upload-input" 
                      className="file-upload-input" 
                      accept=".json"
                      onChange={handleFileSelect} 
                    />
                  </div>

                  <div style={{ textRendering: "optimizeLegibility", textAlign: "center" }}>
                    <a 
                      href="/sugriva_sdk.json" 
                      download="sugriva_sdk.json"
                      className="download-sdk-btn"
                    >
                      <Download size={12} /> Download Standard Admin SDK License File
                    </a>
                  </div>

                  {sdkError && (
                    <div className="error-message">
                      <AlertCircle size={14} />
                      <span>{sdkError}</span>
                    </div>
                  )}

                  {sdkSuccessMsg && (
                    <div className="success-message">
                      <CheckCircle size={14} />
                      <span>{sdkSuccessMsg}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <motion.form 
            key="signup"
            onSubmit={handleSignupSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="step-indicator-bar" style={{ justifyContent: "center" }}>
              <span className="step-dot active"><UserPlus size={11} style={{ verticalAlign: "middle", marginRight: "4px" }} /> Administrative Registration</span>
            </div>

            {regSuccess ? (
              <div className="sdk-download-box">
                <CheckCircle size={28} style={{ color: "#009933", marginBottom: "8px" }} />
                <h4 style={{ margin: "0 0 6px 0", color: "#009933" }}>Registration Ready</h4>
                <p style={{ fontSize: "12px", color: "#444444", margin: "0 0 16px 0" }}>
                  Your secure local SDK license signature is compiled. Download this package key and upload it in Step 3 of the login process.
                </p>
                {sdkDownloadUrl && (
                  <a 
                    href={sdkDownloadUrl} 
                    download={sdkDownloadName}
                    className="login-btn"
                    style={{ textDecoration: "none" }}
                    onClick={() => {
                      setTimeout(() => {
                        setRegSuccess("");
                        setGatewayMode("login");
                        setStep("credentials");
                      }, 1500);
                    }}
                  >
                    Download sugriva_sdk_{regVpa}.json <Download size={14} />
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">New Administrator VPA ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. sec_officer" 
                    value={regVpa}
                    onChange={(e) => setRegVpa(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Administrative Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Minimum 8 characters" 
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <div className="password-strength-bar">
                    <div 
                      className="password-strength-fill" 
                      style={{ 
                        width: `${(strength.score / 4) * 100}%`,
                        backgroundColor: strength.color 
                      }}
                    />
                  </div>
                  <span className="password-strength-text" style={{ color: strength.color }}>
                    Strength: {strength.label}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Secure Yubikey / HSM Hardware Token ID</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. hsm-slot-9a" 
                    value={regHardwareToken}
                    onChange={(e) => setRegHardwareToken(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">RBI Regulatory Compliance Clearance Tier</label>
                  <select 
                    className="form-input" 
                    value={regComplianceLevel}
                    onChange={(e) => setRegComplianceLevel(e.target.value)}
                    style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                  >
                    <option>Tier-1 Audit</option>
                    <option>Tier-2 Compliance</option>
                    <option>System Superuser</option>
                  </select>
                </div>

                <button type="submit" className="login-btn">
                  Compile Trust Profile <LogIn size={14} />
                </button>

                {regError && (
                  <div className="error-message">
                    <AlertCircle size={14} />
                    <span>{regError}</span>
                  </div>
                )}
              </>
            )}

            <div className="mode-toggle-link" onClick={() => setGatewayMode("login")}>
              Already registered administrative profile? <span>Log In</span>
            </div>
          </motion.form>
        )}
        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 600 }}>
          © 2026 Himanshu Patil. All Rights Reserved. | Developer: Himanshu Patil
        </div>
      </div>
    </div>
  );
};
