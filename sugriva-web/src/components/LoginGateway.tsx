import React, { useState, useEffect } from "react";
import { useStore } from "../state/StoreContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, UploadCloud, AlertCircle, CheckCircle, ArrowRight, Download } from "lucide-react";

export const LoginGateway: React.FC = () => {
  const { setIsAuthenticated, setRole, writeAudit } = useStore();
  const [step, setStep] = useState<"credentials" | "otp" | "sdk">("credentials");
  
  // Credentials Step State
  const [vpaId, setVpaId] = useState("");
  const [password, setPassword] = useState("");
  const [credError, setCredError] = useState("");

  // OTP Step State
  const [otpInput, setOtpInput] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [showOtpHint, setShowOtpHint] = useState(false);

  // SDK Step State
  const [dragOver, setDragOver] = useState(false);
  const [sdkError, setSdkError] = useState("");
  const [sdkSuccessMsg, setSdkSuccessMsg] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Trigger random OTP generation on moving to OTP step
  useEffect(() => {
    if (step === "otp") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpInput("");
      setOtpError("");
      // Automatically prompt log in audits
      writeAudit(`Multi-factor authorization triggered. OTP token generated.`, "SUCCESS");
      
      // Auto display hint after 1 second for seamless hackathon testing
      const timer = setTimeout(() => setShowOtpHint(true), 800);
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Handle Credentials submission
  const handleCredSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCredError("");

    if (!vpaId || !password) {
      setCredError("VPA identity and administrative password are required.");
      return;
    }

    if (vpaId === "admin" && password === "adminpassword") {
      setStep("otp");
    } else {
      setCredError("Invalid credentials. Try using 'admin' & 'adminpassword'.");
      writeAudit(`Unauthorized login attempt: Invalid credentials for VPA '${vpaId}'`, "DENIED");
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");

    if (otpInput === generatedOtp) {
      setStep("sdk");
      writeAudit("MFA verification successful. Proceeding to SDK integrity gate.", "SUCCESS");
    } else {
      setOtpError("Invalid security verification code. Please check the code.");
      writeAudit("MFA verification check failed: Invalid OTP key code entry", "DENIED");
    }
  };

  // Process uploaded SDK key file
  const processSdkFile = (file: File) => {
    setSdkError("");
    setSdkSuccessMsg("");
    setUploadedFileName(file.name);

    if (!file.name.endsWith(".json")) {
      setSdkError("Invalid package type. Security system requires a valid JSON license file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        if (parsed.sdk_identifier === "SUGRIVA-PQC-SECURE-SDK-v2.0" && parsed.status === "VERIFIED_COMPLIANT") {
          setSdkSuccessMsg("Verification SDK Package fully parsed. Hardware signatures match.");
          writeAudit("Local validation SDK signatures validated successfully. Node status compliant.", "SUCCESS");
          
          // Elevate role to admin and authorize session!
          setRole("ADMIN");
          setTimeout(() => {
            setIsAuthenticated(true);
          }, 1000);
        } else {
          setSdkError("Invalid signature signature headers. The SDK license is broken or spoofed.");
          writeAudit("Local validation SDK signature mismatch: validation failed", "DENIED");
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
          width: 440px;
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
          font-family: 'Orbitron', sans-serif;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 4px;
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
      `}</style>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">SUGRIVA</div>
          <div className="login-subtitle">Secured Threat Containment Platform</div>
        </div>

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
                <div className="drag-desc">Drag & drop sugriva_sdk.json here, or browse local file</div>
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
                  <Download size={12} /> Download Mock Verification SDK License Key File
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
      </div>
    </div>
  );
};
