import { useState, useEffect, useRef } from "react";

export type FlagType =
  | "HMAC_SIGNATURE_MISMATCH"
  | "PII_TOKEN_LEAK_RISK"
  | "MITRE_TACTIC_SPIKE"
  | "AES_ENVELOPE_CORRUPT"
  | "QUANTUM_REPLAY_ATTACK"
  | "DB_ACID_ROLLBACK_VIOLATION"
  | "UNAUTHORIZED_ZERO_TRUST_AUTH"
  | "VELOCITY_SPIKE"
  | "MULE_NODE_AGGREGATION"
  | "NORMAL";

export interface AuthDetails {
  tokenStatus: "VALID" | "REVOKED" | "EXPIRED" | "TAMPERED";
  mfaChallenge: "PASSED" | "FAILED" | "BYPASSED";
  zeroTrustScore: number;
  authDecision: "ALLOW" | "QUARANTINE" | "BLOCK";
}

export interface DbStatus {
  acidTxId: string;
  tableState: "COMMITTED" | "ISOLATED_QUARANTINE" | "PENDING_ROLLBACK" | "MUTATION_BLOCKED";
  rollbackTriggered: boolean;
  latencyMs: number;
}

export interface CryptoLogs {
  piiTokenizer: {
    rawPiiSample: string;
    blindHmacIndex: string;
    aesEncryptedToken: string;
    status: "SECURE" | "LEAK_RISK";
  };
  hmacSigner: {
    receivedSig: string;
    calculatedSig: string;
    algorithm: string;
    isValid: boolean;
  };
  aesEnvelope: {
    kekId: string;
    iv: string;
    tag: string;
    envelopeStatus: "VERIFIED" | "CORRUPTED";
  };
}

export interface TxRecord {
  id: string;
  timestamp: string;
  rail: string;
  network: string;
  amount: number;
  risk: number;
  escrow: "CLEAR" | "PENDING" | "ISOLATED" | "RATE_LIMITED" | "AUTO_FROZEN" | "MULE_SUSPENDED";
  vpa: string;
  ip: string;
  velocity: number;
  flagged: boolean;
  flagReason?: string;
  flagType: FlagType;
  mitreTactics: string[];
  authDetails: AuthDetails;
  dbStatus: DbStatus;
  cryptoLogs: CryptoLogs;
  auditId: string;
  wormMerkleProof: string;
  manualAuditStatus: "PENDING" | "QUARANTINED" | "SESSION_REVOKED" | "SAR_FILED" | "ROLLED_BACK" | "OVERRIDDEN";
  manualAuditActionLog: string[];
  shap: {
    ip_anomaly: number;
    auth_discrepancy: number;
    velocity_impact: number;
    quantum_channel_instability: number;
    entropy_drain: number;
    pqc_decryption_anomalies: number;
  };
}

export interface EventQueueItem {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  targetVpa: string;
  status: "QUEUED" | "PROCESSING" | "CRYPTO_VERIFIED" | "AUDIT_LOGGED" | "REPORTED";
  severity: "LOW" | "HIGH" | "CRITICAL";
  txId?: string;
  details: string;
}

export interface AuditLog {
  timestamp: string;
  role: "ANALYST" | "ADMIN";
  action: string;
  status: "SUCCESS" | "DENIED" | "BLOCKED" | "AUTO_FREEZE" | "CRITICAL";
  prevHash: string;
  currHash: string;
  txId?: string;
}

export interface CertInIncident {
  id: string;
  vpa: string;
  rail: string;
  amount: number;
  detectionTime: string;
  slaDeadline: string;
  severity: "LOW" | "HIGH" | "CRITICAL";
  source: string;
  status: string;
  channel: "INTERNAL_SOC" | "EXTERNAL_REGULATORY" | "DUAL_DISPATCH";
}

const RAILS = ["UPI", "NEFT", "RTGS", "Visa", "Mastercard", "PayPal"];
const DOMESTIC_NETS = ["NPCI", "RBI-RTGS"];
const CROSS_NETS = ["VISA-NET", "MCTR-NET", "SWIFT-CROSS"];

export function checkAdminPassword(password: string): boolean {
  return password === "adminpassword";
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useSugrivaEngine() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminAccounts, setAdminAccounts] = useState<Record<string, { password: string; signature: string }>>({
    "admin": { password: "adminpassword", signature: "SUGRIVA-PQC-SECURE-SDK-v2.0" }
  });
  
  const registerAdminAccount = (vpa: string, pass: string, sig: string) => {
    setAdminAccounts(prev => ({
      ...prev,
      [vpa]: { password: pass, signature: sig }
    }));
  };

  const [records, setRecords] = useState<TxRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [incidents, setIncidents] = useState<CertInIncident[]>([]);
  const [eventQueue, setEventQueue] = useState<EventQueueItem[]>([]);
  
  // Presentation Environment State
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [presentationStep, setPresentationStep] = useState<number>(1);
  const [selectedDemoTxId, setSelectedDemoTxId] = useState<string | null>(null);

  const [role, setRole] = useState<"ANALYST" | "ADMIN">("ANALYST");
  const [threshold, setThreshold] = useState<number>(0.75);
  const [circuitBreaker, setCircuitBreaker] = useState<"CLOSED" | "OPEN">("CLOSED");
  
  // Quantum Anomaly parameters
  const [qkdCoherence, setQkdCoherence] = useState<number>(99.4);
  const [trngEntropy, setTrngEntropy] = useState<number>(100.0);
  const [pqcFailures, setPqcFailures] = useState<number>(0);
  
  // Active quarantine states
  const quarantinedVpas = useRef<Map<string, number>>(new Map());
  const rateLimitTimestamps = useRef<Map<string, number[]>>(new Map());
  const blockedRateVpas = useRef<Map<string, number>>(new Map());
  const lastAuditHash = useRef<string>("0".repeat(64));

  // Write audit entry with cryptographic SHA-256 chain linkage
  const writeAudit = async (action: string, status: AuditLog["status"] = "SUCCESS", txId?: string) => {
    const ts = new Date().toISOString().replace("T", " ").substring(0, 23);
    const rawPayload = `${ts} | ROLE:${role} | ACTION:${action} | STATUS:${status} | TX:${txId || "GLOBAL"} | prev:${lastAuditHash.current}`;
    const currHash = await sha256(rawPayload);
    
    const entry: AuditLog = {
      timestamp: ts,
      role,
      action,
      status,
      prevHash: lastAuditHash.current,
      currHash,
      txId
    };
    
    lastAuditHash.current = currHash;
    setAuditLogs(prev => [entry, ...prev].slice(0, 500));
    return currHash;
  };

  // Verify Immutable WORM Audit Chain
  const verifyWormChain = async (): Promise<{ isTamperFree: boolean; nodeCount: number; merkleRoot: string }> => {
    let prev = "0".repeat(64);
    let tampered = false;

    // Verify reverse chronological chain in memory
    for (let i = auditLogs.length - 1; i >= 0; i--) {
      const log = auditLogs[i];
      if (log.prevHash !== prev) {
        tampered = true;
        break;
      }
      const rawPayload = `${log.timestamp} | ROLE:${log.role} | ACTION:${log.action} | STATUS:${log.status} | TX:${log.txId || "GLOBAL"} | prev:${log.prevHash}`;
      const calc = await sha256(rawPayload);
      if (calc !== log.currHash) {
        tampered = true;
        break;
      }
      prev = log.currHash;
    }

    const merkleRoot = await sha256(auditLogs.map(l => l.currHash).join(":"));
    return {
      isTamperFree: !tampered,
      nodeCount: auditLogs.length,
      merkleRoot: merkleRoot.substring(0, 32)
    };
  };

  // Add item to persistent Event Queue
  const pushEventQueue = (
    eventType: string,
    source: string,
    targetVpa: string,
    severity: EventQueueItem["severity"],
    details: string,
    txId?: string
  ) => {
    const item: EventQueueItem = {
      id: `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`,
      timestamp: new Date().toLocaleTimeString(),
      eventType,
      source,
      targetVpa,
      status: "QUEUED",
      severity,
      details,
      txId
    };

    setEventQueue(prev => [item, ...prev].slice(0, 100));

    // Auto-advance event processing queue status simulation
    setTimeout(() => {
      setEventQueue(prev =>
        prev.map(evt => (evt.id === item.id ? { ...evt, status: "PROCESSING" } : evt))
      );
    }, 400);

    setTimeout(() => {
      setEventQueue(prev =>
        prev.map(evt => (evt.id === item.id ? { ...evt, status: "CRYPTO_VERIFIED" } : evt))
      );
    }, 900);

    setTimeout(() => {
      setEventQueue(prev =>
        prev.map(evt => (evt.id === item.id ? { ...evt, status: severity === "LOW" ? "CRYPTO_VERIFIED" : "AUDIT_LOGGED" } : evt))
      );
    }, 1500);
  };

  // Dispatch Operational Internal Report
  const dispatchOperationalReport = async (txId: string) => {
    const targetTx = records.find(r => r.id === txId);
    if (!targetTx) return;

    await writeAudit(`Internal SOC Operational Alert Dispatched: PagerDuty/Slack Incident created for TX ${txId} (${targetTx.vpa})`, "CRITICAL", txId);
    pushEventQueue("SOC_DISPATCH", "Internal Ops Router", targetTx.vpa, "HIGH", `Internal SOC notification sent for ${txId}`, txId);

    setIncidents(prev => {
      const exists = prev.find(i => i.id.includes(txId) || i.vpa === targetTx.vpa);
      if (exists) {
        return prev.map(i => i.id === exists.id ? { ...i, status: "INTERNAL_SOC_DISPATCHED", channel: "INTERNAL_SOC" } : i);
      }
      return [{
        id: `SOC-${txId}`,
        vpa: targetTx.vpa,
        rail: targetTx.rail,
        amount: targetTx.amount,
        detectionTime: new Date().toISOString(),
        slaDeadline: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        severity: "HIGH",
        source: "Internal SOC Operational Trigger",
        status: "INTERNAL_SOC_DISPATCHED",
        channel: "INTERNAL_SOC"
      }, ...prev];
    });
  };

  // Dispatch External Regulatory Report (FinCEN SAR / RBI Cyber Notification)
  const dispatchRegulatoryReport = async (txId: string) => {
    const targetTx = records.find(r => r.id === txId);
    if (!targetTx) return;

    await writeAudit(`Statutory Regulatory Reporting Dispatched: FinCEN SAR & RBI Mandatory Incident File generated for TX ${txId}`, "CRITICAL", txId);
    pushEventQueue("REGULATORY_REPORT_FILED", "FIU Compliance Gateway", targetTx.vpa, "CRITICAL", `External Regulatory Report filed for ${txId}`, txId);

    setIncidents(prev => {
      const exists = prev.find(i => i.vpa === targetTx.vpa);
      if (exists) {
        return prev.map(i => i.id === exists.id ? { ...i, status: "REGULATORY_SAR_FILED", channel: "DUAL_DISPATCH" } : i);
      }
      return [{
        id: `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        vpa: targetTx.vpa,
        rail: targetTx.rail,
        amount: targetTx.amount,
        detectionTime: new Date().toISOString(),
        slaDeadline: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        severity: "CRITICAL",
        source: "Automated Regulatory Enforcement Engine",
        status: "REGULATORY_SAR_FILED",
        channel: "EXTERNAL_REGULATORY"
      }, ...prev];
    });
  };

  // Manual Audit Actions Handler
  const executeManualAudit = async (
    txId: string,
    action: "QUARANTINE" | "REVOKE_SESSION" | "FILE_SAR" | "ROLLBACK_DB" | "OVERRIDE"
  ) => {
    const targetTx = records.find(r => r.id === txId);
    if (!targetTx) return;

    let newStatus: TxRecord["manualAuditStatus"] = "PENDING";
    let auditMsg = "";

    switch (action) {
      case "QUARANTINE":
        newStatus = "QUARANTINED";
        quarantinedVpas.current.set(targetTx.vpa, Date.now() + 3600000); // 1 Hour
        auditMsg = `Manual Audit Action: Account & VPA ${targetTx.vpa} isolated into Quarantine Sandbox for 60m`;
        break;
      case "REVOKE_SESSION":
        newStatus = "SESSION_REVOKED";
        auditMsg = `Manual Audit Action: Invalidated HMAC keypair & revoked JWT sessions for ${targetTx.vpa}`;
        break;
      case "FILE_SAR":
        newStatus = "SAR_FILED";
        auditMsg = `Manual Audit Action: Analyst submitted Regulatory FinCEN SAR & RBI Escalation for ${txId}`;
        await dispatchRegulatoryReport(txId);
        await dispatchOperationalReport(txId);
        break;
      case "ROLLBACK_DB":
        newStatus = "ROLLED_BACK";
        auditMsg = `Manual Audit Action: Triggered database ACID transaction rollback for ${targetTx.dbStatus.acidTxId}`;
        break;
      case "OVERRIDE":
        newStatus = "OVERRIDDEN";
        quarantinedVpas.current.delete(targetTx.vpa);
        blockedRateVpas.current.delete(targetTx.vpa);
        auditMsg = `Manual Audit Action: Security Analyst overridden and approved false-positive flag for ${txId}`;
        break;
    }

    setRecords(prev =>
      prev.map(r => {
        if (r.id === txId) {
          return {
            ...r,
            manualAuditStatus: newStatus,
            manualAuditActionLog: [...r.manualAuditActionLog, auditMsg],
            escrow: action === "OVERRIDE" ? "CLEAR" : action === "QUARANTINE" ? "ISOLATED" : r.escrow,
            dbStatus: action === "ROLLBACK_DB" ? { ...r.dbStatus, rollbackTriggered: true, tableState: "PENDING_ROLLBACK" } : r.dbStatus
          };
        }
        return r;
      })
    );

    await writeAudit(auditMsg, action === "OVERRIDE" ? "SUCCESS" : "CRITICAL", txId);
    pushEventQueue("MANUAL_AUDIT_ACTION", `Analyst (${role})`, targetTx.vpa, action === "OVERRIDE" ? "LOW" : "HIGH", auditMsg, txId);
  };

  // Perform unfreeze override
  const triggerUnfreeze = async (vpa: string): Promise<boolean> => {
    let unfrozen = false;
    if (quarantinedVpas.current.has(vpa)) {
      quarantinedVpas.current.delete(vpa);
      unfrozen = true;
    }
    if (blockedRateVpas.current.has(vpa)) {
      blockedRateVpas.current.delete(vpa);
      unfrozen = true;
    }
    if (unfrozen) {
      await writeAudit(`VPA override: Manual security quarantine bypass unblocked ${vpa}`, "SUCCESS");
      pushEventQueue("VPA_UNBLOCK_OVERRIDE", "Analyst Override", vpa, "LOW", `Manual unblock override for VPA ${vpa}`);
    }
    return unfrozen;
  };

  // Log new Incident to CERT-In SLA tracker
  const logIncident = async (vpa: string, rail: string, amount: number, severity: CertInIncident["severity"], source: string) => {
    const id = `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const deadline = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const newInc: CertInIncident = {
      id,
      vpa,
      rail,
      amount,
      detectionTime: now.toISOString(),
      slaDeadline: deadline.toISOString(),
      severity,
      source,
      status: "PENDING_REPORT",
      channel: "DUAL_DISPATCH"
    };

    setIncidents(prev => [newInc, ...prev]);
    await writeAudit(`CERT-In Incident Logged: ${id} on VPA: ${vpa}`, severity === "CRITICAL" ? "CRITICAL" : "SUCCESS");
    pushEventQueue("CERT_INCIDENT_LOGGED", source, vpa, severity, `Incident ${id} logged with 6-hr SLA deadline`);
  };

  // Command Execution Handler for presentation mode or quick tools
  const executeCommand = (cmdStr: string): { success: boolean; message: string } => {
    const clean = cmdStr.trim().toLowerCase();
    if (clean === "presentation" || clean === "/demo" || clean === "presentation_mode_on" || clean === "demo") {
      setIsPresentationMode(true);
      setPresentationStep(1);
      
      // Auto-select first flagged record or generate one
      const flagged = records.find(r => r.flagged);
      if (flagged) {
        setSelectedDemoTxId(flagged.id);
      }
      return { success: true, message: "Presentation Environment Enabled. Step 1: Telemetry & Anomaly Ingestion." };
    }
    
    if (clean === "presentation_mode_off" || clean === "exit") {
      setIsPresentationMode(false);
      return { success: true, message: "Presentation Environment Disabled. Returned to main monitoring." };
    }

    if (clean.startsWith("flag ")) {
      const targetId = clean.replace("flag ", "").trim().toUpperCase();
      const match = records.find(r => r.id === targetId || r.vpa.toLowerCase().includes(targetId.toLowerCase()));
      if (match) {
        setSelectedDemoTxId(match.id);
        setIsPresentationMode(true);
        setPresentationStep(1);
        return { success: true, message: `Selected transaction ${match.id} (${match.vpa}) for Presentation Mode.` };
      }
      return { success: false, message: `Transaction matching '${targetId}' not found.` };
    }

    if (clean === "verify worm" || clean === "audit verify") {
      verifyWormChain().then(res => {
        writeAudit(`Manual WORM Chain Integrity Verification executed. Result: ${res.isTamperFree ? "PASSED (0 Tampering)" : "FAILED"}`, "SUCCESS");
      });
      return { success: true, message: "Initiated cryptographic Merkle proof WORM chain verification." };
    }

    return { success: false, message: `Unknown command '${cmdStr}'. Available: 'presentation', '/demo', 'verify worm', 'flag <txId>'.` };
  };

  // Check rate limit (sliding window: max 3 per 5 seconds)
  const verifyRateLimit = async (vpa: string): Promise<boolean> => {
    const now = Date.now();
    if (blockedRateVpas.current.has(vpa)) {
      const unblockTime = blockedRateVpas.current.get(vpa)!;
      if (now < unblockTime) return false;
      blockedRateVpas.current.delete(vpa);
    }

    const stamps = rateLimitTimestamps.current.get(vpa) || [];
    const recent = stamps.filter(t => now - t < 5000);
    
    if (recent.length >= 3) {
      blockedRateVpas.current.set(vpa, now + 10000);
      await writeAudit(`Rate Limit Flooding Detected: Blocking VPA ${vpa} for 10s`, "BLOCKED");
      await logIncident(vpa, "DDoS/Flood", 0, "CRITICAL", "Rate Limit Filter");
      pushEventQueue("RATE_LIMIT_EXCEEDED", "Rate Limiter", vpa, "HIGH", "Velocity flood 3+ tx/5s blocked for 10s");
      return false;
    }

    recent.push(now);
    rateLimitTimestamps.current.set(vpa, recent);
    return true;
  };

  // Ingest/generate a transaction with comprehensive specs
  const processTransaction = async (
    customVpa?: string,
    customRail?: string,
    customAmount?: number,
    customIp?: string,
    customFailedAuth: boolean = false,
    forcedFlagType?: FlagType,
    forcedFlagReason?: string
  ) => {
    const now = Date.now();
    const isMuleRandomTick = Math.random() > 0.93;
    const defaultVpa = isMuleRandomTick 
      ? `mule_transit_${Math.floor(10 + Math.random() * 89)}@escrow`
      : `user_${Math.floor(1000 + Math.random() * 9000)}@bank`;
      
    const vpa = customVpa || defaultVpa;
    const rail = customRail || RAILS[Math.floor(Math.random() * RAILS.length)];
    const amount = customAmount !== undefined ? customAmount : parseFloat((Math.random() * 120000).toFixed(2));
    const ip = customIp || `192.168.${Math.floor(Math.random() * 4)}.${Math.floor(1 + Math.random() * 254)}`;
    const txId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 899)}`;
    
    // 1. Check Circuit Breaker fail-closed state
    if (circuitBreaker === "OPEN") {
      const rec: TxRecord = {
        id: txId,
        timestamp: new Date().toLocaleTimeString(),
        rail,
        network: "BLOCKED",
        amount,
        risk: 1.00,
        escrow: "RATE_LIMITED",
        vpa,
        ip,
        velocity: 1,
        flagged: true,
        flagReason: "Circuit breaker OPEN: Fail-closed emergency system isolation",
        flagType: "DB_ACID_ROLLBACK_VIOLATION",
        mitreTactics: ["TA0040: Impact", "T1499: Endpoint Denial of Service"],
        authDetails: { tokenStatus: "REVOKED", mfaChallenge: "FAILED", zeroTrustScore: 0.12, authDecision: "BLOCK" },
        dbStatus: { acidTxId: `ACID-BLK-${txId}`, tableState: "MUTATION_BLOCKED", rollbackTriggered: true, latencyMs: 1.2 },
        cryptoLogs: {
          piiTokenizer: { rawPiiSample: `${vpa}:XXXX-9999`, blindHmacIndex: "BLIND-IDX-REVOKED", aesEncryptedToken: "ENC-TOKEN-BLOCKED", status: "LEAK_RISK" },
          hmacSigner: { receivedSig: "0xBAD_CIRCUIT", calculatedSig: "0xEXPECTED", algorithm: "HMAC-SHA256", isValid: false },
          aesEnvelope: { kekId: "KEK-MASTER-01", iv: "0x00000000", tag: "0xBAD", envelopeStatus: "CORRUPTED" }
        },
        auditId: `AUD-${txId}`,
        wormMerkleProof: `MRK-PROOF-${Math.floor(100000 + Math.random() * 899999)}`,
        manualAuditStatus: "PENDING",
        manualAuditActionLog: [],
        shap: { ip_anomaly: 0.5, auth_discrepancy: 0.5, velocity_impact: 0.5, quantum_channel_instability: 0.5, entropy_drain: 0.5, pqc_decryption_anomalies: 0.5 }
      };
      setRecords(prev => [rec, ...prev].slice(0, 100));
      return rec;
    }

    // 2. Check quarantine freeze
    if (quarantinedVpas.current.has(vpa)) {
      const expiry = quarantinedVpas.current.get(vpa)!;
      if (now < expiry) {
        const rec: TxRecord = {
          id: txId,
          timestamp: new Date().toLocaleTimeString(),
          rail,
          network: "BLOCKED",
          amount,
          risk: 1.0000,
          escrow: "AUTO_FROZEN",
          vpa,
          ip,
          velocity: 1,
          flagged: true,
          flagReason: "Quarantine Active: VPA address currently auto-frozen due to prior threat detection",
          flagType: "UNAUTHORIZED_ZERO_TRUST_AUTH",
          mitreTactics: ["TA0006: Credential Access", "T1078: Valid Accounts"],
          authDetails: { tokenStatus: "EXPIRED", mfaChallenge: "FAILED", zeroTrustScore: 0.05, authDecision: "QUARANTINE" },
          dbStatus: { acidTxId: `ACID-FRZ-${txId}`, tableState: "ISOLATED_QUARANTINE", rollbackTriggered: false, latencyMs: 2.1 },
          cryptoLogs: {
            piiTokenizer: { rawPiiSample: `${vpa}:4532-XXXX-8821`, blindHmacIndex: "8f9b2c3a", aesEncryptedToken: "enc_gcm_token_quarantined", status: "SECURE" },
            hmacSigner: { receivedSig: "0x8F9A...", calculatedSig: "0x8F9A...", algorithm: "HMAC-SHA256", isValid: true },
            aesEnvelope: { kekId: "KEK-HSM-NODE-4", iv: "0xa1b2c3d4", tag: "0x99ff", envelopeStatus: "VERIFIED" }
          },
          auditId: `AUD-${txId}`,
          wormMerkleProof: `MRK-PROOF-${Math.floor(100000 + Math.random() * 899999)}`,
          manualAuditStatus: "QUARANTINED",
          manualAuditActionLog: ["System Auto-Freeze active"],
          shap: { ip_anomaly: 0, auth_discrepancy: 0, velocity_impact: 0, quantum_channel_instability: 0, entropy_drain: 0, pqc_decryption_anomalies: 0 }
        };
        setRecords(prev => [rec, ...prev].slice(0, 100));
        return rec;
      } else {
        quarantinedVpas.current.delete(vpa);
      }
    }

    // 3. Verify Rate Limit
    const rateCheck = await verifyRateLimit(vpa);
    if (!rateCheck) {
      const rec: TxRecord = {
        id: txId,
        timestamp: new Date().toLocaleTimeString(),
        rail,
        network: "BLOCKED",
        amount,
        risk: 0.9999,
        escrow: "RATE_LIMITED",
        vpa,
        ip,
        velocity: 4,
        flagged: true,
        flagReason: "Velocity Spike: Exceeded maximum 3 transactions per 5 seconds threshold",
        flagType: "VELOCITY_SPIKE",
        mitreTactics: ["TA0040: Impact", "T1499: Endpoint Denial of Service"],
        authDetails: { tokenStatus: "VALID", mfaChallenge: "BYPASSED", zeroTrustScore: 0.35, authDecision: "BLOCK" },
        dbStatus: { acidTxId: `ACID-RATE-${txId}`, tableState: "MUTATION_BLOCKED", rollbackTriggered: false, latencyMs: 0.8 },
        cryptoLogs: {
          piiTokenizer: { rawPiiSample: `${vpa}:1020-XXXX-0012`, blindHmacIndex: "4c7e8a91", aesEncryptedToken: "enc_gcm_token_ratelimit", status: "SECURE" },
          hmacSigner: { receivedSig: "0x77AA...", calculatedSig: "0x77AA...", algorithm: "HMAC-SHA256", isValid: true },
          aesEnvelope: { kekId: "KEK-HSM-NODE-2", iv: "0x12345678", tag: "0xaaaa", envelopeStatus: "VERIFIED" }
        },
        auditId: `AUD-${txId}`,
        wormMerkleProof: `MRK-PROOF-${Math.floor(100000 + Math.random() * 899999)}`,
        manualAuditStatus: "PENDING",
        manualAuditActionLog: [],
        shap: { ip_anomaly: 0.3, auth_discrepancy: 0.5, velocity_impact: 0.4, quantum_channel_instability: 0.2, entropy_drain: 0.1, pqc_decryption_anomalies: 0.2 }
      };
      setRecords(prev => [rec, ...prev].slice(0, 100));
      return rec;
    }

    // 4. Calculate Risk & Dynamic Flagging Parameters
    const cross = ["Visa", "Mastercard", "PayPal"].includes(rail) && Math.random() > 0.6;
    const network = cross ? CROSS_NETS[Math.floor(Math.random() * CROSS_NETS.length)] : DOMESTIC_NETS[Math.floor(Math.random() * DOMESTIC_NETS.length)];
    
    const ip_w = parseFloat((0.15 + Math.random() * 0.05).toFixed(4));
    const auth_w = customFailedAuth ? parseFloat((0.55 + Math.random() * 0.05).toFixed(4)) : parseFloat((0.05 + Math.random() * 0.03).toFixed(4));
    const amt_w = parseFloat(Math.min(0.3, amount / 500000).toFixed(4));
    const vel_w = parseFloat((Math.random() * 0.15).toFixed(4));
    
    const qkd_w = parseFloat(Math.max(0, (99.0 - qkdCoherence) * 0.1).toFixed(4));
    const entropy_w = parseFloat(Math.max(0, (100.0 - trngEntropy) * 0.005).toFixed(4));
    const pqc_w = parseFloat(Math.min(0.4, pqcFailures * 0.15).toFixed(4));

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const rawSum = 0.1 + ip_w + auth_w + amt_w + vel_w + qkd_w + entropy_w + pqc_w;
    const score = forcedFlagType ? 0.92 : parseFloat(sigmoid(rawSum - 1.2).toFixed(6));

    let escrow: TxRecord["escrow"] = "CLEAR";
    let flagged = score >= threshold || customFailedAuth || isMuleRandomTick || forcedFlagType !== undefined;
    
    let flagType: FlagType = forcedFlagType || "NORMAL";
    let flagReason = forcedFlagReason || "";
    let mitreTactics: string[] = [];

    if (vpa.includes("mule") || isMuleRandomTick) {
      escrow = "MULE_SUSPENDED";
      flagged = true;
      flagType = "MULE_NODE_AGGREGATION";
      flagReason = "Mule Aggregation: Multi-sender rapid fund aggregation pattern detected on node";
      mitreTactics = ["TA0008: Lateral Movement", "T1005: Data from Local System"];
      quarantinedVpas.current.set(vpa, now + 300000);
      await writeAudit(`GNN Topology Alert: Multi-sender aggregation patterns correlated to Mule Node ${vpa}. Suspended.`, "CRITICAL", txId);
      await logIncident(vpa, rail, amount, "CRITICAL", "Mule Node Correlation");
      pushEventQueue("MULE_NODE_DETECTED", "GNN Topology Enclave", vpa, "CRITICAL", flagReason, txId);
    } else if (forcedFlagType) {
      escrow = "ISOLATED";
      quarantinedVpas.current.set(vpa, now + 300000);
    } else if (score >= threshold) {
      escrow = "ISOLATED";
      quarantinedVpas.current.set(vpa, now + 300000);
      
      // Determine specific flag type based on highest weight
      if (customFailedAuth) {
        flagType = "UNAUTHORIZED_ZERO_TRUST_AUTH";
        flagReason = "Auth Discrepancy: Invalid JWT signature token & MFA challenge failure";
        mitreTactics = ["TA0006: Credential Access", "T1078: Valid Accounts"];
      } else if (pqc_w > 0.2 || qkd_w > 0.2) {
        flagType = "QUANTUM_REPLAY_ATTACK";
        flagReason = "Quantum Guard: Photon coherence loss & post-quantum key decryption anomaly";
        mitreTactics = ["TA0006: Credential Access", "T1587: Develop Capabilities"];
      } else if (ip_w > 0.18) {
        flagType = "HMAC_SIGNATURE_MISMATCH";
        flagReason = "HMAC Mismatch: Digest calculated `0x8f...` does not match request header signature `0x3a...` (Payload Tampered)";
        mitreTactics = ["TA0001: Initial Access", "T1557: Adversary-in-the-Middle"];
      } else {
        flagType = "PII_TOKEN_LEAK_RISK";
        flagReason = "PII Leak Risk: Cleartext PAN exposure detected in metadata payload before AES-GCM envelope key wrap";
        mitreTactics = ["TA0008: Lateral Movement", "T1005: Data from Local System"];
      }
      
      await writeAudit(`Critical Threat Flagged (${score.toFixed(4)}): VPA ${vpa} quarantine-frozen for 300s`, "AUTO_FREEZE", txId);
      pushEventQueue("THREAT_AUTO_FREEZE", "GNN Defense Mesh", vpa, "HIGH", flagReason, txId);
    } else if (score >= 0.50) {
      escrow = "PENDING";
    }

    // Cryptographic log generation
    const calculatedHmac = await sha256(`${vpa}:${amount}:${now}`);
    const receivedHmac = flagType === "HMAC_SIGNATURE_MISMATCH" ? `0xCORRUPT_${calculatedHmac.substring(0, 16)}` : `0x${calculatedHmac.substring(0, 16)}`;

    const cryptoLogs: CryptoLogs = {
      piiTokenizer: {
        rawPiiSample: `${vpa.substring(0, 4)}***@${rail.toLowerCase()}.net [PAN: 4532-XXXX-XXXX-${Math.floor(1000 + Math.random() * 8999)}]`,
        blindHmacIndex: calculatedHmac.substring(0, 16),
        aesEncryptedToken: `token_gcm_2026_${Math.random().toString(36).substring(2, 10)}`,
        status: flagType === "PII_TOKEN_LEAK_RISK" ? "LEAK_RISK" : "SECURE"
      },
      hmacSigner: {
        receivedSig: receivedHmac,
        calculatedSig: `0x${calculatedHmac.substring(0, 16)}`,
        algorithm: "HMAC-SHA256-PQC-DILITHIUM3",
        isValid: flagType !== "HMAC_SIGNATURE_MISMATCH"
      },
      aesEnvelope: {
        kekId: `KEK-RSA4096-KEM-NODE-${Math.floor(1 + Math.random() * 4)}`,
        iv: `0x${Math.random().toString(16).substring(2, 10)}`,
        tag: `0x${Math.random().toString(16).substring(2, 8)}`,
        envelopeStatus: flagType === "AES_ENVELOPE_CORRUPT" ? "CORRUPTED" : "VERIFIED"
      }
    };

    const authDetails: AuthDetails = {
      tokenStatus: customFailedAuth || flagType === "UNAUTHORIZED_ZERO_TRUST_AUTH" ? "TAMPERED" : "VALID",
      mfaChallenge: customFailedAuth ? "FAILED" : score > 0.5 ? "BYPASSED" : "PASSED",
      zeroTrustScore: parseFloat((1.0 - score).toFixed(2)),
      authDecision: score >= 0.75 ? "BLOCK" : score >= 0.5 ? "QUARANTINE" : "ALLOW"
    };

    const dbStatus: DbStatus = {
      acidTxId: `ACID-${txId}`,
      tableState: escrow === "ISOLATED" || escrow === "MULE_SUSPENDED" ? "ISOLATED_QUARANTINE" : "COMMITTED",
      rollbackTriggered: flagType === "DB_ACID_ROLLBACK_VIOLATION",
      latencyMs: parseFloat((1.2 + Math.random() * 3.5).toFixed(2))
    };

    const auditId = await writeAudit(`Tx Processed: ${txId} (${vpa}) | Risk:${score.toFixed(4)} | Flag:${flagType}`, flagged ? "CRITICAL" : "SUCCESS", txId);
    const wormMerkleProof = await sha256(`${auditId}:${txId}:${lastAuditHash.current}`);

    const rec: TxRecord = {
      id: txId,
      timestamp: new Date().toLocaleTimeString(),
      rail,
      network,
      amount,
      risk: score,
      escrow,
      vpa,
      ip,
      velocity: Math.floor(1 + Math.random() * 3),
      flagged,
      flagReason: flagReason || (flagged ? `High anomaly score ${score.toFixed(4)}` : "Normal transaction telemetry"),
      flagType,
      mitreTactics: mitreTactics.length > 0 ? mitreTactics : ["TA0001: Initial Access"],
      authDetails,
      dbStatus,
      cryptoLogs,
      auditId,
      wormMerkleProof: wormMerkleProof.substring(0, 32),
      manualAuditStatus: "PENDING",
      manualAuditActionLog: [],
      shap: {
        ip_anomaly: ip_w,
        auth_discrepancy: auth_w,
        velocity_impact: vel_w,
        quantum_channel_instability: qkd_w,
        entropy_drain: entropy_w,
        pqc_decryption_anomalies: pqc_w
      }
    };

    setRecords(prev => [rec, ...prev].slice(0, 100));
    return rec;
  };

  // Simulators: Attacks
  const triggerStuffing = async () => {
    const target = `attacker_${Math.floor(1000 + Math.random() * 9000)}@bank`;
    const ip = "198.51.100.42";
    await writeAudit(`Simulating credential stuffing exploit sweep against VPA: ${target}`, "SUCCESS");
    for (let i = 0; i < 3; i++) {
      await processTransaction(target, "UPI", 150, ip, true);
    }
    const finalTx = await processTransaction(
      target,
      "Visa",
      920000.0,
      ip,
      true,
      "UNAUTHORIZED_ZERO_TRUST_AUTH",
      "Credential Stuffing: Failed 4 authentication tokens from IP 198.51.100.42"
    );
    await logIncident(target, "Visa", 920000.0, "HIGH", "Credential Stuffing Simulator");
    setSelectedDemoTxId(finalTx.id);
    setIsPresentationMode(true);
    setPresentationStep(1);
  };

  const triggerLiquidation = async () => {
    const target = "gsec_vault@corp";
    await writeAudit(`Simulating Corporate G-Sec liquidation exploit sweep against: ${target}`, "CRITICAL");
    const finalTx = await processTransaction(
      target,
      "RTGS",
      6400000.0,
      "203.0.113.88",
      false,
      "HMAC_SIGNATURE_MISMATCH",
      "HMAC Mismatch: Header payload digest calculated 0x9b2a... does not match signature header 0x88ff..."
    );
    await logIncident(target, "RTGS", 6400000.0, "CRITICAL", "Asset Liquidation Sweep");
    setSelectedDemoTxId(finalTx.id);
    setIsPresentationMode(true);
    setPresentationStep(1);
  };

  const triggerFlood = async () => {
    const target = `flood_${Math.floor(1000 + Math.random() * 9000)}@bank`;
    await writeAudit(`Simulating high-frequency velocity transaction flood against: ${target}`, "SUCCESS");
    for (let i = 0; i < 4; i++) {
      await processTransaction(target, "UPI", 10.0, "192.168.1.99", false);
    }
  };

  const triggerQuantumExploit = async () => {
    await writeAudit("Simulating Quantum attack indicators (photon coherence breach & entropy drop)", "CRITICAL");
    setQkdCoherence(91.2);
    setTrngEntropy(14.5);
    setPqcFailures(4);
    
    const target = "demat_vault@treasury";
    const finalTx = await processTransaction(
      target,
      "RTGS",
      12500000.0,
      "198.51.100.99",
      false,
      "QUANTUM_REPLAY_ATTACK",
      "Quantum Guard: QKD photon coherence breach (91.2%) & TRNG entropy drop (14.5%)"
    );
    await logIncident(target, "RTGS", 12500000.0, "CRITICAL", "Quantum Signature Spoofing Attempt");
    setSelectedDemoTxId(finalTx.id);
    setIsPresentationMode(true);
    setPresentationStep(1);
  };

  // Main tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      setQkdCoherence(c => Math.max(95.0, Math.min(99.9, c + (Math.random() - 0.5) * 0.1)));
      setTrngEntropy(e => Math.max(80.0, Math.min(100.0, e + (Math.random() - 0.5) * 0.5)));
      
      processTransaction();
    }, 1200);
    return () => clearInterval(interval);
  }, [qkdCoherence, trngEntropy, pqcFailures, threshold, circuitBreaker]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    adminAccounts,
    registerAdminAccount,
    records,
    auditLogs,
    incidents,
    eventQueue,
    isPresentationMode,
    setIsPresentationMode,
    presentationStep,
    setPresentationStep,
    selectedDemoTxId,
    setSelectedDemoTxId,
    role,
    setRole,
    threshold,
    setThreshold,
    circuitBreaker,
    setCircuitBreaker,
    qkdCoherence,
    trngEntropy,
    pqcFailures,
    setQkdCoherence,
    setTrngEntropy,
    setPqcFailures,
    processTransaction,
    triggerUnfreeze,
    triggerStuffing,
    triggerLiquidation,
    triggerFlood,
    triggerQuantumExploit,
    writeAudit,
    verifyWormChain,
    dispatchOperationalReport,
    dispatchRegulatoryReport,
    executeManualAudit,
    executeCommand
  };
}

export type SugrivaEngineType = ReturnType<typeof useSugrivaEngine>;
export type useSugrivaEngineType = typeof useSugrivaEngine;
