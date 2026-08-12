"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Method = "WEIGHTED_TRUST" | "UNWEIGHTED_AVERAGE";

interface EvidenceItem {
  tool_name: string;
  evidence_type: string;
  trust_tier: "VERIFIED" | "CORROBORATED" | "UNTRUSTED";
  trust_weight: number;
  evidence_score: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    tool_name: "Threat Intelligence",
    evidence_type: "Global Reputation Feed",
    trust_tier: "VERIFIED",
    trust_weight: 1.0,
    evidence_score: 0.95,
  },
  {
    tool_name: "Log Lookup",
    evidence_type: "SIEM Audit Telemetry",
    trust_tier: "CORROBORATED",
    trust_weight: 0.6,
    evidence_score: 0.82,
  },
  {
    tool_name: "Asset Criticality",
    evidence_type: "CMDB Impact Record",
    trust_tier: "CORROBORATED",
    trust_weight: 0.6,
    evidence_score: 0.90,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Tier styles (flat, no glow) ─────────────────────────────────────────────
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

const URGENCY_STYLES: Record<string, { color: string }> = {
  "Immediate":     { color: "#f87171" },
  "Within 1 hour": { color: "#fbbf24" },
  "Routine":       { color: "#34d399" },
};

// ─── Evidence explanation text ────────────────────────────────────────────────
function getEvidenceExplanation(item: EvidenceItem): string {
  if (item.tool_name === "Threat Intelligence") {
    return `Threat intelligence strongly supports the malicious classification. The source IP carries a high reputation score (${(item.evidence_score * 100).toFixed(0)}/100) from a verified external feed, making this the most authoritative signal in the investigation.`;
  }
  if (item.tool_name === "Log Lookup") {
    return `SIEM log data provides corroborating evidence of anomalous activity. The authentication failure pattern is consistent with an automated credential attack, though log sources carry a reduced trust weight (0.6) as they can be altered by a sophisticated actor.`;
  }
  if (item.tool_name === "Asset Criticality") {
    return `The target asset is classified as high business impact in the CMDB. While asset criticality does not directly prove malicious intent, it elevates the priority of this incident and increases the consequence of a misclassification.`;
  }
  return `Evidence from ${item.tool_name} contributed a score of ${item.evidence_score.toFixed(2)} with a trust weight of ${item.trust_weight.toFixed(1)}.`;
}

// ─── Section divider ─────────────────────────────────────────────────────────
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AgentReasoningPage() {
  const [method, setMethod] = useState<Method>("WEIGHTED_TRUST");
  const [calcOpen, setCalcOpen] = useState(false);

  // ── Calculations (unchanged logic) ─────────────────────────────────────────
  const totalWeighted = EVIDENCE_ITEMS.reduce(
    (acc, item) => acc + item.evidence_score * item.trust_weight,
    0
  );
  const totalWeight = EVIDENCE_ITEMS.reduce((acc, item) => acc + item.trust_weight, 0);
  const unweightedAvg =
    EVIDENCE_ITEMS.reduce((acc, item) => acc + item.evidence_score, 0) / EVIDENCE_ITEMS.length;
  const finalScore =
    method === "WEIGHTED_TRUST" ? totalWeighted / totalWeight : unweightedAvg;

  // ── Derived values ──────────────────────────────────────────────────────────
  const confidencePct = Math.round(finalScore * 100);
  const confidenceLevel = getConfidenceLevel(finalScore);
  const classification = getClassification(finalScore);
  const recommendation = getRecommendedAction(classification);
  const clsStyle = CLS_STYLES[classification];
  const confLevelColor = CONF_LEVEL_STYLES[confidenceLevel].color;

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            Agent Reasoning & Calibrated Confidence
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Incident ALT-001 · Brute Force Attack · FIN-SERVER-01
          </p>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. INVESTIGATION RESULT — primary focus                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
        {/* Confidence dial (numeric, not a SVG arc — stays readable) */}
        <div style={{ textAlign: "center", paddingRight: 20, borderRight: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: confLevelColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
            {confidencePct}%
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Confidence
          </div>
          <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: confLevelColor, letterSpacing: "0.06em" }}>
            {confidenceLevel}
          </div>
        </div>

        {/* Classification */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Classification
          </div>
          <span
            style={{
              display: "inline-block",
              fontSize: 13,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 3,
              background: clsStyle.bg,
              border: `1px solid ${clsStyle.border}`,
              color: clsStyle.color,
              letterSpacing: "0.05em",
            }}
          >
            {classification}
          </span>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
            Scoring method: {method === "WEIGHTED_TRUST" ? "Weighted Trust" : "Unweighted Average"}
          </div>
        </div>

        {/* Recommended action */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Recommended Action
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#d1dae8" }}>
            {recommendation.action}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {recommendation.reason}
          </div>
        </div>

        {/* Urgency + score */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Urgency
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: URGENCY_STYLES[recommendation.urgency].color }}>
            {recommendation.urgency}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Raw score</div>
            <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
              {finalScore.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. EVIDENCE TABLE — secondary                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Divider label="Evidence Supporting the Decision" />

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
              {["Evidence Source", "Type", "Score", "Trust Tier", "Weight", "Weighted Contribution"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 14px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVIDENCE_ITEMS.map((item, idx) => {
              const ts = TIER_STYLES[item.trust_tier];
              const contribution = item.evidence_score * item.trust_weight;
              const contributionPct = ((contribution / totalWeighted) * 100).toFixed(1);
              return (
                <tr
                  key={idx}
                  className="data-row"
                  style={{ borderBottom: idx < EVIDENCE_ITEMS.length - 1 ? "1px solid var(--bg-surface)" : "none" }}
                >
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.tool_name}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 11 }}>
                    {item.evidence_type}
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>
                    {item.evidence_score.toFixed(2)}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: ts.bg,
                        border: `1px solid ${ts.border}`,
                        color: ts.color,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ts.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 11 }}>
                    {item.trust_weight.toFixed(1)}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)", fontSize: 11 }}>
                        {contribution.toFixed(4)}
                      </span>
                      {/* Proportional bar */}
                      <div style={{ flex: 1, height: 3, background: "var(--border-subtle)", borderRadius: 2, minWidth: 60 }}>
                        <div
                          style={{
                            width: `${contributionPct}%`,
                            height: "100%",
                            background: ts.color,
                            borderRadius: 2,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {contributionPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary row */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "8px 14px",
            display: "flex",
            gap: 32,
            background: "var(--bg-elevated)",
            fontSize: 11,
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted)" }}>Σ(Score × Weight) </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>{totalWeighted.toFixed(4)}</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Σ(Weight) </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>{totalWeight.toFixed(1)}</span>
          </div>
          <div>
            <span style={{ color: "var(--text-muted)" }}>Final score </span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>{finalScore.toFixed(4)}</span>
          </div>
          <div style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
            Method: <span style={{ color: "var(--accent-blue)" }}>{method === "WEIGHTED_TRUST" ? "Weighted Trust" : "Unweighted Average"}</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. WHY CAIRA REACHED THIS DECISION                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Divider label="Why CAIRA Reached This Decision" />

      <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        {EVIDENCE_ITEMS.map((item, idx) => {
          const ts = TIER_STYLES[item.trust_tier];
          return (
            <div
              key={idx}
              style={{
                padding: "13px 16px",
                borderBottom: idx < EVIDENCE_ITEMS.length - 1 ? "1px solid #1a1e28" : "none",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              {/* Left accent bar */}
              <div style={{ width: 3, borderRadius: 2, background: ts.color, flexShrink: 0, alignSelf: "stretch", minHeight: 16 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{item.tool_name}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: 2,
                      background: ts.bg,
                      border: `1px solid ${ts.border}`,
                      color: ts.color,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {ts.label.toUpperCase()}
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                    score {item.evidence_score.toFixed(2)} · weight {item.trust_weight.toFixed(1)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {getEvidenceExplanation(item)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Aggregate explanation */}
        <div
          style={{
            padding: "12px 16px",
            background: "var(--bg-elevated)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 12,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Aggregate: </span>
          {classification === "MALICIOUS"
            ? `The combined weighted confidence of ${confidencePct}% exceeds the MALICIOUS threshold (≥75%). All three evidence sources are directionally consistent. The threat intelligence signal carries the highest weight and is the primary driver of the classification.`
            : classification === "UNCERTAIN"
            ? `Combined confidence of ${confidencePct}% falls in the uncertain band (40–74%). Evidence is present but insufficient for automated containment. Analyst review is required.`
            : `Combined confidence of ${confidencePct}% is below the action threshold. Available evidence does not warrant containment.`}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. CALCULATION DETAILS — collapsible                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        <button
          onClick={() => setCalcOpen((v) => !v)}
          style={{
            width: "100%",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          <span>Calculation Details</span>
          {calcOpen
            ? <ChevronUp style={{ width: 14, height: 14 }} />
            : <ChevronDown style={{ width: 14, height: 14 }} />}
        </button>

        {calcOpen && (
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px" }}>
            {/* Formula */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Aggregation Formula
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 4,
                  padding: "10px 14px",
                }}
              >
                {method === "WEIGHTED_TRUST"
                  ? "Confidence = Σ(Evidence Score × Trust Weight) / Σ(Trust Weight)"
                  : "Confidence = Σ(Evidence Score) / N"}
              </div>
            </div>

            {/* Step breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Numerator", sublabel: method === "WEIGHTED_TRUST" ? "Σ(score × weight)" : "Σ(scores)", value: method === "WEIGHTED_TRUST" ? totalWeighted.toFixed(4) : EVIDENCE_ITEMS.reduce((a, i) => a + i.evidence_score, 0).toFixed(4) },
                { label: "Denominator", sublabel: method === "WEIGHTED_TRUST" ? "Σ(weights)" : "N (count)", value: method === "WEIGHTED_TRUST" ? totalWeight.toFixed(1) : EVIDENCE_ITEMS.length.toString() },
                { label: "Raw Score", sublabel: "Numerator ÷ Denominator", value: finalScore.toFixed(6) },
                { label: "Final Confidence", sublabel: "As percentage", value: `${confidencePct}%` },
              ].map((stat) => (
                <div key={stat.label} style={{ padding: "10px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "var(--text-secondary)" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{stat.sublabel}</div>
                </div>
              ))}
            </div>

            {/* Per-item calculation */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Per-Item Breakdown
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)", lineHeight: 2 }}>
                {EVIDENCE_ITEMS.map((item, i) => (
                  <div key={i}>
                    <span style={{ color: "var(--text-muted)" }}>{item.tool_name.padEnd(24)}</span>
                    <span>{item.evidence_score.toFixed(2)} × {item.trust_weight.toFixed(1)} = </span>
                    <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{(item.evidence_score * item.trust_weight).toFixed(4)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, borderTop: "1px solid var(--border-subtle)", paddingTop: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>{"Total".padEnd(24)}</span>
                  <span>{totalWeighted.toFixed(4)} ÷ {totalWeight.toFixed(1)} = </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{finalScore.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. RECOMMENDED RESPONSE                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Divider label="Recommended Response" />

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 5,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Action
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: clsStyle.color }}>
            {recommendation.action}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 480 }}>
            {recommendation.reason}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Severity</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#fbbf24", fontFamily: "monospace" }}>HIGH</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Confidence</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: confLevelColor, fontFamily: "monospace" }}>{confidencePct}%</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>Urgency</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: URGENCY_STYLES[recommendation.urgency].color }}>{recommendation.urgency}</span>
            </div>
          </div>

          <Link
            href="/decisions"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 14px",
              borderRadius: 4,
              background: "var(--accent-blue-dim)",
              border: "1px solid var(--accent-blue)",
              color: "var(--accent-blue)",
              fontSize: 11,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Proceed to Decision Center <ArrowRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
