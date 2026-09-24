const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const FALLBACK_ALERTS = [
  {
    alert_id: "ALT-001",
    type: "Brute Force Attack",
    severity: "HIGH",
    source_ip: "192.168.10.45",
    destination_ip: "10.0.1.5",
    target_asset: "FIN-SERVER-01",
    user: "admin",
    description: "Multiple failed SSH authentication attempts detected within 5-minute window.",
    status: "INGESTED",
    timestamp: "2026-08-11T10:30:00Z",
  },
  {
    alert_id: "ALT-002",
    type: "Phishing Attempt",
    severity: "MEDIUM",
    source_ip: "192.168.10.99",
    destination_ip: "10.0.2.14",
    target_asset: "WORKSTATION-08",
    user: "j.smith",
    description: "Inbound email containing spoofed domain login link flagged by mail gateway.",
    status: "INGESTED",
    timestamp: "2026-08-11T10:35:00Z",
  },
  {
    alert_id: "ALT-003",
    type: "Suspicious PowerShell Execution",
    severity: "HIGH",
    source_ip: "192.168.10.15",
    destination_ip: "10.0.0.1",
    target_asset: "SEC-AUTH-DC01",
    user: "sysadmin_svc",
    description: "Base64 encoded PowerShell script executed with elevated privileges.",
    status: "INGESTED",
    timestamp: "2026-08-11T10:40:00Z",
  },
];

export async function fetchMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch metrics");
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch metrics, backend may be offline:`, err);
    return null;
  }
}

export async function fetchAlerts(statusFilter?: string, severityFilter?: string) {
  let url = `${API_BASE}/alerts`;
  const params = new URLSearchParams();
  if (statusFilter) params.append("status_filter", statusFilter);
  if (severityFilter) params.append("severity_filter", severityFilter);
  if (params.toString()) url += `?${params.toString()}`;
  
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch alerts");
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch alerts from ${url}, using fallback sample alerts:`, err);
    return FALLBACK_ALERTS;
  }
}

export async function fetchAlertDetail(alertId: string) {
  try {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch alert detail");
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch alert detail for ${alertId}, using fallback:`, err);
    return FALLBACK_ALERTS.find(a => a.alert_id === alertId) || FALLBACK_ALERTS[0];
  }
}

export async function ingestAlert(payload: any) {
  const res = await fetch(`${API_BASE}/alerts/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to ingest alert: ${detail}`);
  }
  return res.json();
}

export async function runInvestigation(alertId: string, scoringMethod: string = "WEIGHTED_TRUST") {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoring_method: scoringMethod })
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to run investigation: ${detail}`);
  }
  return res.json();
}

export async function simulateContainment(alertId: string) {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/simulate-containment`, {
    method: "POST"
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to simulate containment: ${detail}`);
  }
  return res.json();
}

export async function escalateIncident(alertId: string) {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/escalate`, {
    method: "POST"
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to escalate incident: ${detail}`);
  }
  return res.json();
}

export async function fetchEvidence(alertId: string) {
  try {
    const res = await fetch(`${API_BASE}/evidence/${alertId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch evidence");
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch evidence for ${alertId}, using fallback:`, err);
    return [
      {
        id: "ev-01",
        tool_name: "Threat Intel Query",
        evidence_type: "IP Reputation",
        trust_tier: "VERIFIED" as const,
        trust_weight: 1.0,
        evidence_score: 0.95,
        content: "Source IP 192.168.10.45 flagged in threat intelligence feeds as active brute-force node.",
      },
      {
        id: "ev-02",
        tool_name: "SIEM Log Lookup",
        evidence_type: "Auth Logs",
        trust_tier: "CORROBORATED" as const,
        trust_weight: 0.6,
        evidence_score: 0.85,
        content: "27 failed SSH login attempts recorded on FIN-SERVER-01 within 5 minutes.",
      },
      {
        id: "ev-03",
        tool_name: "Asset Registry",
        evidence_type: "CMDB Impact",
        trust_tier: "VERIFIED" as const,
        trust_weight: 1.0,
        evidence_score: 0.90,
        content: "FIN-SERVER-01 is Tier-1 production financial transaction processing server.",
      },
    ];
  }
}

export async function fetchAllEvidence() {
  try {
    const res = await fetch(`${API_BASE}/evidence`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch all evidence, backend may be offline:`, err);
    return [];
  }
}

export async function fetchAllDecisions() {
  try {
    const res = await fetch(`${API_BASE}/decisions`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch decisions, backend may be offline:`, err);
    return [];
  }
}

export async function fetchIncidentAudit(alertId: string) {
  try {
    const res = await fetch(`${API_BASE}/incidents/${alertId}/audit`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch audit for ${alertId}, backend may be offline:`, err);
    return [];
  }
}

export async function fetchAllAuditTrails() {
  try {
    const res = await fetch(`${API_BASE}/audit/all`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch audit trails, backend may be offline:`, err);
    return [];
  }
}

export async function verifyAuditChain() {
  try {
    const res = await fetch(`${API_BASE}/audit/verify`, { method: "POST" });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to verify audit chain: ${detail}`);
    }
    return res.json();
  } catch (err) {
    console.warn(`[API] Failed to verify audit chain, backend may be offline:`, err);
    throw err;
  }
}

export async function fetchEvaluationResults() {
  try {
    const res = await fetch(`${API_BASE}/evaluation/results`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch evaluation results, backend may be offline:`, err);
    return null;
  }
}

export async function runEvaluationHarness(agentVersion: string = "CAIRA-v1.0") {
  const res = await fetch(`${API_BASE}/evaluation/run?agent_version=${agentVersion}`, {
    method: "POST"
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to run evaluation harness: ${detail}`);
  }
  return res.json();
}

export async function fetchScenarios() {
  try {
    const res = await fetch(`${API_BASE}/scenarios`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch scenarios, backend may be offline:`, err);
    return [];
  }
}

export async function createScenario(payload: any) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to create scenario: ${detail}`);
  }
  return res.json();
}

export async function fetchDatabaseSchema() {
  try {
    const res = await fetch(`${API_BASE}/schema`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] Failed to fetch schema, backend may be offline:`, err);
    return null;
  }
}

export function getReportDownloadUrl(reportType: string) {
  return `${API_BASE}/reports/${reportType}`;
}
