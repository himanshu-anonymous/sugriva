import { useState, useEffect, useRef } from "react";

export interface TxRecord {
  timestamp: string;
  rail: string;
  network: string;
  amount: number;
  risk: number;
  escrow: "CLEAR" | "PENDING" | "ISOLATED" | "RATE_LIMITED" | "AUTO_FROZEN" | "MULE_SUSPENDED";
  vpa: string;
  ip: string;
  velocity: number;
  shap: {
    ip_anomaly: number;
    auth_discrepancy: number;
    velocity_impact: number;
    quantum_channel_instability: number;
    entropy_drain: number;
    pqc_decryption_anomalies: number;
  };
}

export interface AuditLog {
  timestamp: string;
  role: "ANALYST" | "ADMIN";
  action: string;
  status: "SUCCESS" | "DENIED" | "BLOCKED" | "AUTO_FREEZE" | "CRITICAL";
  prevHash: string;
  currHash: string;
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
}

const RAILS = ["UPI", "NEFT", "RTGS", "Visa", "Mastercard", "PayPal"];
const DOMESTIC_NETS = ["NPCI", "RBI-RTGS"];
const CROSS_NETS = ["VISA-NET", "MCTR-NET", "SWIFT-CROSS"];

// Helper function to mock PBKDF2 Master Login
export function checkAdminPassword(password: string): boolean {
  return password === "adminpassword";
}

// Simple SHA-256 Mock using standard browser crypto (or custom fallback)
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function useSugrivaEngine() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [records, setRecords] = useState<TxRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [incidents, setIncidents] = useState<CertInIncident[]>([]);
  
  const [role, setRole] = useState<"ANALYST" | "ADMIN">("ANALYST");
  const [threshold, setThreshold] = useState<number>(0.75);
  const [circuitBreaker, setCircuitBreaker] = useState<"CLOSED" | "OPEN">("CLOSED");
  
  // Quantum Anomaly parameters
  const [qkdCoherence, setQkdCoherence] = useState<number>(99.4);
  const [trngEntropy, setTrngEntropy] = useState<number>(100.0);
  const [pqcFailures, setPqcFailures] = useState<number>(0);
  
  // Active quarantine states
  const quarantinedVpas = useRef<Map<string, number>>(new Map()); // VPA -> Expiry epoch ms
  const rateLimitTimestamps = useRef<Map<string, number[]>>(new Map()); // VPA -> timestamps
  const blockedRateVpas = useRef<Map<string, number>>(new Map()); // VPA -> Unblock epoch ms
  const lastAuditHash = useRef<string>("0".repeat(64));

  // Write audit entry with cryptographic SHA-256 chain linkage
  const writeAudit = async (action: string, status: AuditLog["status"] = "SUCCESS") => {
    const ts = new Date().toISOString().replace("T", " ").substring(0, 23);
    const rawPayload = `${ts} | ROLE:${role} | ACTION:${action} | STATUS:${status} | prev:${lastAuditHash.current}`;
    const currHash = await sha256(rawPayload);
    
    const entry: AuditLog = {
      timestamp: ts,
      role,
      action,
      status,
      prevHash: lastAuditHash.current,
      currHash
    };
    
    lastAuditHash.current = currHash;
    setAuditLogs(prev => [entry, ...prev].slice(0, 500));
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
    }
    return unfrozen;
  };

  // Log new Incident to CERT-In SLA tracker
  const logIncident = async (vpa: string, rail: string, amount: number, severity: CertInIncident["severity"], source: string) => {
    const id = `CERT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const deadline = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 Hours SLA

    const newInc: CertInIncident = {
      id,
      vpa,
      rail,
      amount,
      detectionTime: now.toISOString(),
      slaDeadline: deadline.toISOString(),
      severity,
      source,
      status: "PENDING_REPORT"
    };

    setIncidents(prev => [newInc, ...prev]);
    await writeAudit(`CERT-In Incident Logged: ${id} on VPA: ${vpa}`, severity === "CRITICAL" ? "CRITICAL" : "SUCCESS");
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
      blockedRateVpas.current.set(vpa, now + 10000); // Block for 10s
      await writeAudit(`Rate Limit Flooding Detected: Blocking VPA ${vpa} for 10s`, "BLOCKED");
      await logIncident(vpa, "DDoS/Flood", 0, "CRITICAL", "Rate Limit Filter");
      return false;
    }

    recent.push(now);
    rateLimitTimestamps.current.set(vpa, recent);
    return true;
  };

  // Ingest/generate a transaction
  const processTransaction = async (
    customVpa?: string,
    customRail?: string,
    customAmount?: number,
    customIp?: string,
    customFailedAuth: boolean = false
  ) => {
    const now = Date.now();
    const isMuleRandomTick = Math.random() > 0.94;
    const defaultVpa = isMuleRandomTick 
      ? `mule_transit_${Math.floor(10 + Math.random() * 89)}@escrow`
      : `user_${Math.floor(1000 + Math.random() * 9000)}@bank`;
      
    const vpa = customVpa || defaultVpa;
    const rail = customRail || RAILS[Math.floor(Math.random() * RAILS.length)];
    const amount = customAmount !== undefined ? customAmount : parseFloat((Math.random() * 120000).toFixed(2));
    const ip = customIp || `192.168.${Math.floor(Math.random() * 4)}.${Math.floor(1 + Math.random() * 254)}`;
    
    // 1. Check Circuit Breaker fail-closed state
    if (circuitBreaker === "OPEN") {
      const rec: TxRecord = {
        timestamp: new Date().toLocaleTimeString(),
        rail,
        network: "BLOCKED",
        amount,
        risk: 1.00,
        escrow: "RATE_LIMITED",
        vpa,
        ip,
        velocity: 1,
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
          timestamp: new Date().toLocaleTimeString(),
          rail,
          network: "BLOCKED",
          amount,
          risk: 1.0000,
          escrow: "AUTO_FROZEN",
          vpa,
          ip,
          velocity: 1,
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
        timestamp: new Date().toLocaleTimeString(),
        rail,
        network: "BLOCKED",
        amount,
        risk: 0.9999,
        escrow: "RATE_LIMITED",
        vpa,
        ip,
        velocity: 4,
        shap: { ip_anomaly: 0.3, auth_discrepancy: 0.5, velocity_impact: 0.4, quantum_channel_instability: 0.2, entropy_drain: 0.1, pqc_decryption_anomalies: 0.2 }
      };
      setRecords(prev => [rec, ...prev].slice(0, 100));
      return rec;
    }

    // 4. Run active GNN risk logic
    const cross = ["Visa", "Mastercard", "PayPal"].includes(rail) && Math.random() > 0.6;
    const network = cross ? CROSS_NETS[Math.floor(Math.random() * CROSS_NETS.length)] : DOMESTIC_NETS[Math.floor(Math.random() * DOMESTIC_NETS.length)];
    
    // Dynamic weights
    const ip_w = parseFloat((0.15 + Math.random() * 0.05).toFixed(4));
    const auth_w = customFailedAuth ? parseFloat((0.55 + Math.random() * 0.05).toFixed(4)) : parseFloat((0.05 + Math.random() * 0.03).toFixed(4));
    const amt_w = parseFloat(Math.min(0.3, amount / 500000).toFixed(4));
    const vel_w = parseFloat((Math.random() * 0.15).toFixed(4));
    
    // Quantum channel instability scaling
    const qkd_w = parseFloat(Math.max(0, (99.0 - qkdCoherence) * 0.1).toFixed(4));
    const entropy_w = parseFloat(Math.max(0, (100.0 - trngEntropy) * 0.005).toFixed(4));
    const pqc_w = parseFloat(Math.min(0.4, pqcFailures * 0.15).toFixed(4));

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
    const rawSum = 0.1 + ip_w + auth_w + amt_w + vel_w + qkd_w + entropy_w + pqc_w;
    const score = parseFloat(sigmoid(rawSum).toFixed(6));

    let escrow: TxRecord["escrow"] = "CLEAR";
    if (vpa.includes("mule")) {
      escrow = "MULE_SUSPENDED";
      quarantinedVpas.current.set(vpa, now + 300000); // Freeze mule
      await writeAudit(`GNN Topology Alert: Multi-sender aggregation patterns correlated to Mule Node ${vpa}. Suspended.`, "CRITICAL");
      await logIncident(vpa, rail, amount, "CRITICAL", "Mule Node Correlation");
    } else if (score >= threshold) {
      escrow = "ISOLATED";
      // AUTO-FREEZE VPA for 5 Minutes (300,000ms)
      quarantinedVpas.current.set(vpa, now + 300000);
      await writeAudit(`Critical Threat Flagged (${score.toFixed(4)}): VPA ${vpa} quarantine-frozen for 300s`, "AUTO_FREEZE");
    } else if (score >= 0.50) {
      escrow = "PENDING";
    }

    const rec: TxRecord = {
      timestamp: new Date().toLocaleTimeString(),
      rail,
      network,
      amount,
      risk: score,
      escrow,
      vpa,
      ip,
      velocity: Math.floor(1 + Math.random() * 3),
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
    for (let i = 0; i < 4; i++) {
      await processTransaction(target, "UPI", 150, ip, true);
    }
    await processTransaction(target, "Visa", 920000.0, ip, false);
    await logIncident(target, "Visa", 920000.0, "HIGH", "Credential Stuffing Simulator");
  };

  const triggerLiquidation = async () => {
    const target = "gsec_vault@corp";
    await writeAudit(`Simulating Corporate G-Sec liquidation exploit sweep against: ${target}`, "CRITICAL");
    await processTransaction(target, "RTGS", 6400000.0, "203.0.113.88", false);
    await logIncident(target, "RTGS", 6400000.0, "CRITICAL", "Asset Liquidation Sweep");
  };

  const triggerFlood = async () => {
    const target = `flood_${Math.floor(1000 + Math.random() * 9000)}@bank`;
    await writeAudit(`Simulating high-frequency velocity transaction flood against: ${target}`, "SUCCESS");
    for (let i = 0; i < 5; i++) {
      await processTransaction(target, "UPI", 10.0, "192.168.1.99", false);
    }
  };

  const triggerQuantumExploit = async () => {
    await writeAudit("Simulating Quantum attack indicators (photon coherence breach & entropy drop)", "CRITICAL");
    setQkdCoherence(91.2);
    setTrngEntropy(14.5);
    setPqcFailures(4);
    
    const target = "demat_vault@treasury";
    await processTransaction(target, "RTGS", 12500000.0, "198.51.100.99", false);
    await logIncident(target, "RTGS", 12500000.0, "CRITICAL", "Quantum Signature Spoofing Attempt");
  };

  // Main tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Minor quantum noise
      setQkdCoherence(c => Math.max(95.0, Math.min(99.9, c + (Math.random() - 0.5) * 0.1)));
      setTrngEntropy(e => Math.max(80.0, Math.min(100.0, e + (Math.random() - 0.5) * 0.5)));
      
      processTransaction();
    }, 1000);
    return () => clearInterval(interval);
  }, [qkdCoherence, trngEntropy, pqcFailures, threshold, circuitBreaker]);

  return {
    isAuthenticated,
    setIsAuthenticated,
    records,
    auditLogs,
    incidents,
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
    writeAudit
  };
}
export type SugrivaEngineType = ReturnType<typeof useSugrivaEngine>;
export type useSugrivaEngineType = typeof useSugrivaEngine;
