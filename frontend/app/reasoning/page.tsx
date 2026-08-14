"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { fetchAlerts, fetchEvidence, fetchAlertDetail } from "@/lib/api";

type Method = "WEIGHTED_TRUST" | "UNWEIGHTED_AVERAGE";

interface EvidenceItem {
  id?: string;
  evidence_id?: string;
  tool_name: string;
  evidence_type: string;
  trust_tier: "VERIFIED" | "CORROBORATED" | "UNTRUSTED";
  trust_weight: number;
  evidence_score: number;
  content?: string;
  reason?: string;
}

const TIER_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  VERIFIED:     { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  label: "Verified" },
  CORROBORATED: { color: "var(--accent-blue)", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)",  label: "Corroborated" },
  UNTRUSTED:    { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  label: "Untrusted" },
};

const CLS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  MALICIOUS: { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
  UNCERTAIN: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)" },
  BENIGN:    { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.3)" },
};

const CONF_LEVEL_STYLES: Record<string, { color: string }> = {
  HIGH:   { color: "#f87171" },
  MEDIUM: { color: "#fbbf24" },
  LOW:    { color: "#34d399" },
};

function getConfidenceLevel(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.40) return "MEDIUM";
  return "LOW";
}

function getClassification(score: number): "MALICIOUS" | "UNCERTAIN" | "BENIGN" {
  if (score >= 0.75) return "MALICIOUS";
  if (score >= 0.40) return "UNCERTAIN";
  return "BENIGN";
}

function getRecommendedAction(cls: string) {
  if (cls === "MALICIOUS")
    return { action: "Initiate Simulated Containment", reason: "Confidence exceeds the 0.75 malicious threshold. Multiple high-trust evidence sources corroborate the classification.", urgency: "Immediate" };
  if (cls === "UNCERTAIN")
    return { action: "Escalate to Tier-2 Analyst", reason: "Confidence falls within the inconclusive band (0.40–0.74). Human review is required before any containment action.", urgency: "Within 1 hour" };
  return { action: "Log and Monitor", reason: "Confidence is below the 0.40 threshold. Current evidence does not support active containment.", urgency: "Routine" };
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

export default function AgentReasoningPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string>("");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [method, setMethod] = useState<Method>("WEIGHTED_TRUST");
  const [calcOpen, setCalcOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts()
      .then((data) => {
        setAlerts(data || []);
        if (data && data.length > 0) {
          setSelectedAlertId(data[0].alert_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch alerts:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedAlertId) return;
    setLoading(true);
    Promise.all([
      fetchAlertDetail(selectedAlertId),
      fetchEvidence(selectedAlertId)
    ])
      .then(([alertDetail, evidenceData]) => {
        setSelectedAlert(alertDetail);
        setEvidenceItems(evidenceData || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch alert details:", err);
        setLoading(false);
      });
  }, [selectedAlertId]);

  // Calculations
  const hasEvidence = evidenceItems.length > 0;
  const totalWeighted = evidenceItems.reduce(
    (acc, item) => acc + (item.evidence_score || 0) * (item.trust_weight || 0.2),
    0
  );
  const totalWeight = evidenceItems.reduce((acc, item) => acc + (item.trust_weight || 0.2), 0);
  const unweightedAvg = hasEvidence
    ? evidenceItems.reduce((acc, item) => acc + (item.evidence_score || 0), 0) / evidenceItems.length
    : 0;

  const finalScore = hasEvidence
    ? (method === "WEIGHTED_TRUST" ? (totalWeight > 0 ? totalWeighted / totalWeight : 0) : unweightedAvg)
    : 0;

  const confidencePct = Math.round(finalScore * 100);
  const confidenceLevel = getConfidenceLevel(finalScore);
  const classification = getClassification(finalScore);
  const recommendation = getRecommendedAction(classification);
  const clsStyle = CLS_STYLES[classification];
  const confLevelColor = CONF_LEVEL_STYLES[confidenceLevel].color;

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            Agent Reasoning & Calibrated Confidence
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Select Incident:</span>
            <select
              value={selectedAlertId}
              onChange={(e) => setSelectedAlertId(e.target.value)}
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontFamily: "monospace"
              }}
            >
              {alerts.map((a) => (
                <option key={a.alert_id} value={a.alert_id}>
                  {a.alert_id} — {a.type} ({a.severity})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Method toggle */}
        <div style={{ display: "flex", gap: 1, border: "1px solid var(--border-subtle)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
          {(["WEIGHTED_TRUST", "UNWEIGHTED_AVERAGE"] as Method[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                background: method === m ? "var(--accent-blue-dim)" : "var(--bg-surface)",
                color: method === m ? "var(--accent-blue)" : "var(--text-muted)",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {m === "WEIGHTED_TRUST" ? "Weighted Trust" : "Unweighted Average"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          Loading reasoning data for {selectedAlertId}...
        </div>
      )}

      {!loading && !hasEvidence && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          <AlertCircle style={{ width: 24, height: 24, margin: "0 auto 8px", color: "var(--text-muted)" }} />
          No evidence gathered yet for <strong>{selectedAlertId}</strong>.
          <div style={{ marginTop: 8 }}>
            <Link href={`/investigate/${selectedAlertId}`} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              Run Investigation on /investigate <ArrowRight style={{ width: 12, height: 12 }} />
            </Link>
          </div>
        </div>
      )}

      {!loading && hasEvidence && (
        <>
          {/* 1. INVESTIGATION RESULT */}
          <Divider label="Investigation Result" />

          <div
            style={{
              background: "var(--bg-surface)",
              border: `1px solid ${clsStyle.border}`,
              borderLeft: `3px solid ${clsStyle.color}`,
              borderRadius: 5,
              padding: "16px 20px",
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr 1fr",
              gap: "0 28px",
              alignItems: "center",
            }}
          >
            {/* Confidence score */}
            <div style={{ textAlign: "center", paddingRight: 20, borderRight: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: confLevelColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {confidencePct}%
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Confidence
              </div>
            </div>

            {/* Classification */}
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                Classification
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: clsStyle.color, letterSpacing: "-0.01em" }}>
                {classification}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                {confidenceLevel} confidence band
              </div>
            </div>

            {/* Recommended action */}
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                Recommended Action
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {recommendation.action}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                Urgency: {recommendation.urgency}
              </div>
            </div>

            {/* Link to investigation */}
            <div style={{ justifySelf: "end" }}>
              <Link href={`/investigate/${selectedAlertId}`} className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                View Investigation <ArrowRight style={{ width: 11, height: 11 }} />
              </Link>
            </div>
          </div>

          {/* 2. EVIDENCE BREAKDOWN */}
          <Divider label={`Collected Evidence Items (${evidenceItems.length})`} />

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {evidenceItems.map((item, idx) => {
              const tier = TIER_STYLES[item.trust_tier] || TIER_STYLES.UNTRUSTED;
              return (
                <div
                  key={item.id || item.evidence_id || idx}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 5,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                        {item.tool_name}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        · {item.evidence_type}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Weight:</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                          {(item.trust_weight || 0.2).toFixed(1)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Score:</span>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>
                          {(item.evidence_score || 0).toFixed(2)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 3,
                          background: tier.bg,
                          border: `1px solid ${tier.border}`,
                          color: tier.color,
                        }}
                      >
                        {tier.label}
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {item.content || `Evidence score ${item.evidence_score} derived from real database telemetry.`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 3. MATHEMATICAL DERIVATION */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
            <button
              onClick={() => setCalcOpen(!calcOpen)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "var(--bg-elevated)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justify: "space-between",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span>Mathematical Calculation Step-by-Step ({method === "WEIGHTED_TRUST" ? "Weighted Trust Formula" : "Unweighted Average Formula"})</span>
              {calcOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
            </button>

            {calcOpen && (
              <div style={{ padding: 16, borderTop: "1px solid var(--border-subtle)", fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {method === "WEIGHTED_TRUST" ? (
                  <>
                    <div>Confidence = sum(evidence_score * trust_weight) / sum(trust_weight)</div>
                    <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
                      Numerator = {evidenceItems.map(e => `(${e.evidence_score} * ${e.trust_weight})`).join(" + ")} = {totalWeighted.toFixed(4)}
                    </div>
                    <div style={{ color: "var(--text-muted)" }}>
                      Denominator = {evidenceItems.map(e => `${e.trust_weight}`).join(" + ")} = {totalWeight.toFixed(2)}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: "var(--accent-blue)" }}>
                      Final Calibrated Score = {totalWeighted.toFixed(4)} / {totalWeight.toFixed(2)} = {finalScore.toFixed(4)} ({confidencePct}%)
                    </div>
                  </>
                ) : (
                  <>
                    <div>Confidence = sum(evidence_score) / total_items</div>
                    <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
                      Numerator = {evidenceItems.map(e => `${e.evidence_score}`).join(" + ")} = {evidenceItems.reduce((acc, e) => acc + e.evidence_score, 0).toFixed(4)}
                    </div>
                    <div style={{ color: "var(--text-muted)" }}>
                      Total Items = {evidenceItems.length}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700, color: "var(--accent-blue)" }}>
                      Unweighted Average Score = {unweightedAvg.toFixed(4)} ({Math.round(unweightedAvg * 100)}%)
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
