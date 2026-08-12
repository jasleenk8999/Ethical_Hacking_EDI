"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Play, Lock, AlertTriangle, CheckCircle2, ShieldCheck, Layers, Terminal } from "lucide-react";
import { fetchAlertDetail, runInvestigation, simulateContainment, escalateIncident } from "@/lib/api";
import TrustBadge from "@/components/TrustBadge";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import EvidenceGraph from "@/components/EvidenceGraph";
import ActionSimulationModal from "@/components/ActionSimulationModal";

// ─── Pipeline steps ───────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  "Alert Ingested", "Normalized", "Investigation Started",
  "Evidence Collection", "Trust Assignment", "Evidence Aggregation",
  "Confidence Calculation", "Decision", "Action", "Audit Logged"
];

// ─── Severity badge styles ────────────────────────────────────────────────────
function severityStyle(sev: string): { color: string; bg: string; border: string } {
  if (sev === "CRITICAL") return { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" };
  if (sev === "HIGH")     return { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)"  };
  return                         { color: "var(--accent-blue)", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.3)"  };
}

// ─── Classification style ─────────────────────────────────────────────────────
function classStyle(cls: string): string {
  if (cls === "MALICIOUS") return "#f87171";
  if (cls === "UNCERTAIN") return "#fbbf24";
  if (cls === "BENIGN")    return "#34d399";
  return "var(--text-muted)";
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

// ─── Evidence tool card ───────────────────────────────────────────────────────
function EvidenceToolCard({
  title, latency, description, finding, tier, weight
}: {
  title: string; latency: string; description: string; finding: string;
  tier: "VERIFIED" | "CORROBORATED" | "UNTRUSTED"; weight: number;
}) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>{latency}</span>
      </div>
      {/* Body */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>{description}</p>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "7px 10px", lineHeight: 1.55 }}>
          {finding}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Trust Level</span>
          <TrustBadge tier={tier} weight={weight} />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function IncidentInvestigationPage() {
  const params = useParams();
  const alertId = params.id as string;

  const [alert, setAlert] = useState<any>(null);
  const [investigationData, setInvestigationData] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetails, setModalDetails] = useState<any>(null);

  useEffect(() => {
    if (alertId) {
      fetchAlertDetail(alertId)
        .then((data) => setAlert(data))
        .catch((err) => console.error("Error loading alert:", err));
    }
  }, [alertId]);

  const handleStartInvestigation = async () => {
    setIsRunning(true);
    setActiveStepIndex(0);
    for (let i = 1; i <= PIPELINE_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 250));
      setActiveStepIndex(i - 1);
    }
    try {
      const res = await runInvestigation(alertId);
      setInvestigationData(res);
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
      if (res.decision?.action?.includes("SIMULATED")) {
        setModalDetails({
          target_host: updatedAlert.target_asset,
          blocked_ip: updatedAlert.source_ip,
          containment_type: res.decision.action,
          safety_banner: "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED",
        });
        setModalOpen(true);
      }
    } catch (err) {
      console.error("Investigation failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleManualContainment = async () => {
    try {
      const res = await simulateContainment(alertId);
      setModalDetails({
        target_host: alert.target_asset,
        blocked_ip: alert.source_ip,
        containment_type: "Host Isolation & IP Block",
        safety_banner: res.safety_banner,
      });
      setModalOpen(true);
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
    } catch (err) {
      console.error("Simulated containment error:", err);
    }
  };

  const handleManualEscalation = async () => {
    try {
      await escalateIncident(alertId);
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
    } catch (err) {
      console.error("Escalation error:", err);
    }
  };

  if (!alert) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-muted)", fontSize: 12 }}>
        Loading incident telemetry for {alertId}…
      </div>
    );
  }

  const decision = investigationData?.decision || {
    confidence: alert.status === "CONTAINED (SIMULATED)" ? 0.84 : 0.0,
    classification: alert.status === "CONTAINED (SIMULATED)" ? "MALICIOUS" : alert.status === "ESCALATED" ? "UNCERTAIN" : "PENDING",
    action: alert.status === "CONTAINED (SIMULATED)" ? "SIMULATED HOST ISOLATION" : alert.status === "ESCALATED" ? "ESCALATE TO HUMAN ANALYST" : "AWAITING INVESTIGATION",
    decision_reason: "Evidence-gated pipeline awaiting execution or completed.",
  };

  const sev = severityStyle(alert.severity);

  return (
    <div style={{ maxWidth: 1100, display: "flex", flexDirection: "column", gap: 20 }}>
      <ActionSimulationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionDetails={modalDetails}
      />

      {/* ── Incident header ── */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "16px 20px" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "var(--accent-blue)" }}>
                {alert.alert_id}
              </span>
              <span
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3,
                  background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color,
                }}
              >
                {alert.severity}
              </span>
              <span
                style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 3,
                  background: "var(--border-subtle)", border: "1px solid var(--border-default)", color: "var(--text-muted)",
                }}
              >
                {alert.status}
              </span>
            </div>
            <h1 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>{alert.type}</h1>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{alert.description}</p>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={handleStartInvestigation}
              disabled={isRunning}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Play style={{ width: 11, height: 11 }} />
              {isRunning ? "Running…" : "Start Investigation"}
            </button>
            <button
              onClick={handleManualContainment}
              className="btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, borderColor: "rgba(248,113,113,0.3)", color: "#f87171" }}
            >
              <Lock style={{ width: 11, height: 11 }} />
              Sim Contain
            </button>
            <button
              onClick={handleManualEscalation}
              className="btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, borderColor: "rgba(251,191,36,0.3)", color: "#fbbf24" }}
            >
              <AlertTriangle style={{ width: 11, height: 11 }} />
              Escalate
            </button>
          </div>
        </div>

        {/* Metadata strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
          {[
            { label: "Source IP", value: alert.source_ip, mono: true },
            { label: "Target Asset", value: alert.target_asset, mono: true },
            { label: "User Context", value: alert.user, mono: false },
            { label: "Timestamp", value: alert.timestamp?.substring(0, 19), mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: mono ? "monospace" : undefined }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Investigation pipeline ── */}
      <Divider label="Evidence-Gated Investigation Pipeline" />
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 4, fontSize: 10 }}>
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = activeStepIndex >= idx || Boolean(investigationData);
            const isActive = activeStepIndex === idx && isRunning;
            return (
              <div
                key={step}
                style={{
                  padding: "8px 6px",
                  borderRadius: 4,
                  textAlign: "center",
                  border: isDone
                    ? "1px solid rgba(52,211,153,0.25)"
                    : isActive
                    ? "1px solid rgba(251,191,36,0.4)"
                    : "1px solid var(--border-subtle)",
                  background: isDone
                    ? "rgba(52,211,153,0.06)"
                    : isActive
                    ? "rgba(251,191,36,0.06)"
                    : "var(--bg-elevated)",
                  transition: "background 0.2s, border-color 0.2s",
                }}
              >
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 3, fontFamily: "monospace" }}>
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: isDone ? "#34d399" : isActive ? "#fbbf24" : "var(--text-muted)", lineHeight: 1.3 }}>
                  {step}
                </div>
                {isDone && (
                  <CheckCircle2 style={{ width: 10, height: 10, color: "#34d399", margin: "3px auto 0" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Evidence tools ── */}
      <Divider label="Investigative Tools & Evidence" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <EvidenceToolCard
          title="Tool 1 — Log Lookup"
          latency="28.5 ms"
          description={`Searched SIEM archives for IP ${alert.source_ip} on host ${alert.target_asset}.`}
          finding="Detected 27 consecutive failed SSH authentication attempts within 5 minutes."
          tier="CORROBORATED"
          weight={0.6}
        />
        <EvidenceToolCard
          title="Tool 2 — Threat Intelligence"
          latency="34.2 ms"
          description={`Queried global threat intelligence database for ${alert.source_ip}.`}
          finding="Reputation: Malicious (Score 92/100) | Known Campaign: Credential Stuffing & APT-41."
          tier="VERIFIED"
          weight={1.0}
        />
        <EvidenceToolCard
          title="Tool 3 — Asset Criticality"
          latency="18.7 ms"
          description={`Retrieved CMDB asset metadata for ${alert.target_asset}.`}
          finding="Department: Finance & Billing | Criticality: Critical | Impact: Very High (PCI-DSS)."
          tier="CORROBORATED"
          weight={0.6}
        />
      </div>

      {/* ── Confidence & decision ── */}
      <Divider label="Calibrated Confidence & Decision" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <ConfidenceGauge confidence={decision.confidence} classification={decision.classification} />

        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Structured Decision Rationale
            </span>
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 2, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399", fontWeight: 600 }}>
              SIMULATION MODE
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Classification</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: classStyle(decision.classification) }}>
                  {decision.classification}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Action</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#d1dae8" }}>
                  {decision.action}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "8px 12px", lineHeight: 1.6 }}>
              {decision.decision_reason}
            </div>
          </div>
        </div>
      </div>

      {/* ── Evidence graph ── */}
      <EvidenceGraph
        alertId={alert.alert_id}
        alertType={alert.type}
        confidence={decision.confidence}
        decision={decision}
      />
    </div>
  );
}
