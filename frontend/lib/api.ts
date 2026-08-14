const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function fetchMetrics() {
  const res = await fetch(`${API_BASE}/metrics`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export async function fetchAlerts(statusFilter?: string, severityFilter?: string) {
  let url = `${API_BASE}/alerts`;
  const params = new URLSearchParams();
  if (statusFilter) params.append("status_filter", statusFilter);
  if (severityFilter) params.append("severity_filter", severityFilter);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function fetchAlertDetail(alertId: string) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch alert detail");
  return res.json();
}

export async function ingestAlert(payload: any) {
  const res = await fetch(`${API_BASE}/alerts/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to ingest alert");
  return res.json();
}

export async function runInvestigation(alertId: string, scoringMethod: string = "WEIGHTED_TRUST") {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scoring_method: scoringMethod })
  });
  if (!res.ok) throw new Error("Failed to run investigation");
  return res.json();
}

export async function simulateContainment(alertId: string) {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/simulate-containment`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to simulate containment");
  return res.json();
}

export async function escalateIncident(alertId: string) {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/escalate`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to escalate incident");
  return res.json();
}

export async function fetchEvidence(alertId: string) {
  const res = await fetch(`${API_BASE}/evidence/${alertId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch evidence");
  return res.json();
}

export async function fetchAllEvidence() {
  const res = await fetch(`${API_BASE}/evidence`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch all evidence");
  return res.json();
}

export async function fetchAllDecisions() {
  const res = await fetch(`${API_BASE}/decisions`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch decisions");
  return res.json();
}

export async function fetchIncidentAudit(alertId: string) {
  const res = await fetch(`${API_BASE}/incidents/${alertId}/audit`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch incident audit");
  return res.json();
}

export async function fetchAllAuditTrails() {
  const res = await fetch(`${API_BASE}/audit/all`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch audit trails");
  return res.json();
}

export async function verifyAuditChain() {
  const res = await fetch(`${API_BASE}/audit/verify`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to verify audit chain");
  return res.json();
}

export async function fetchEvaluationResults() {
  const res = await fetch(`${API_BASE}/evaluation/results`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch evaluation results");
  return res.json();
}

export async function runEvaluationHarness(agentVersion: string = "CAIRA-v1.0") {
  const res = await fetch(`${API_BASE}/evaluation/run?agent_version=${agentVersion}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to run evaluation harness");
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch scenarios");
  return res.json();
}

export async function createScenario(payload: any) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to create scenario");
  return res.json();
}

export async function fetchDatabaseSchema() {
  const res = await fetch(`${API_BASE}/schema`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch schema");
  return res.json();
}

export function getReportDownloadUrl(reportType: string) {
  return `${API_BASE}/reports/${reportType}`;
}
