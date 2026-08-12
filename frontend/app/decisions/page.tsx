"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

// ─── Types & constants ────────────────────────────────────────────────────────
interface DecisionRule {
  range: string;
  label: "MALICIOUS" | "UNCERTAIN" | "BENIGN";
  action: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}

const DECISION_RULES: DecisionRule[] = [
  {
    range: "≥ 0.75",
    label: "MALICIOUS",
    action: "Initiate Simulated Containment",
    description: "Confidence exceeds the malicious threshold. Automated containment is triggered in simulation mode. No real infrastructure is modified.",
    color: "#f87171",
    bg: "rgba(248,113,113,0.08)",
    border: "rgba(248,113,113,0.25)",
  },
  {
    range: "0.40 – 0.74",
    label: "UNCERTAIN",
    action: "Escalate to Tier-2 Analyst",
    description: "Confidence falls within the inconclusive band. Evidence is present but insufficient for automated action. Human review is required.",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
  },
  {
    range: "< 0.40",
    label: "BENIGN",
    action: "Log and Monitor",
    description: "Confidence is below the action threshold. Current evidence does not support active containment or escalation.",
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
  },
];

function getDecisionRule(score: number): DecisionRule {
  if (score >= 0.75) return DECISION_RULES[0];
  if (score >= 0.40) return DECISION_RULES[1];
  return DECISION_RULES[2];
}

// ─── Threshold Bar ────────────────────────────────────────────────────────────
function ThresholdBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const rule = getDecisionRule(score);

  return (
    <div>
      {/* Zone labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>
        <span style={{ color: "#34d399" }}>BENIGN &lt;0.40</span>
        <span style={{ color: "#fbbf24" }}>UNCERTAIN 0.40–0.74</span>
        <span style={{ color: "#f87171" }}>MALICIOUS ≥0.75</span>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 8, borderRadius: 2, background: "var(--border-subtle)", overflow: "hidden" }}>
        {/* Zone fills */}
        <div style={{ position: "absolute", left: 0, top: 0, width: "40%", height: "100%", background: "rgba(52,211,153,0.12)" }} />
        <div style={{ position: "absolute", left: "40%", top: 0, width: "35%", height: "100%", background: "rgba(251,191,36,0.12)" }} />
        <div style={{ position: "absolute", left: "75%", top: 0, width: "25%", height: "100%", background: "rgba(248,113,113,0.12)" }} />
        {/* Fill bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pct}%`,
            height: "100%",
            background: rule.color,
            opacity: 0.6,
            transition: "width 0.2s ease",
          }}
        />
        {/* Threshold tick markers */}
        <div style={{ position: "absolute", left: "40%", top: 0, width: 1, height: "100%", background: "var(--bg-surface)" }} />
        <div style={{ position: "absolute", left: "75%", top: 0, width: 1, height: "100%", background: "var(--bg-surface)" }} />
      </div>

      {/* Needle position label */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
        <span>0.00</span>
        <span style={{ color: rule.color, fontWeight: 600, fontFamily: "monospace" }}>
          ▲ {score.toFixed(2)}
        </span>
        <span>1.00</span>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DecisionCenterPage() {
  const [testScore, setTestScore] = useState(0.84);
  const rule = getDecisionRule(testScore);

  return (
    <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            Decision Center &amp; Calibration Engine
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Deterministic thresholds · Controlled action core
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            borderRadius: 3,
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.18)",
          }}
        >
          <Lock style={{ width: 11, height: 11, color: "#d97706" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#d97706" }}>SIMULATION MODE</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. CONFIDENCE SIMULATOR                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SectionLabel label="Confidence Simulator" />

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Drag to simulate a confidence score and observe the triggered decision rule.</span>
          <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: rule.color, letterSpacing: "-0.02em" }}>
            {Math.round(testScore * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0.00"
          max="1.00"
          step="0.01"
          value={testScore}
          onChange={(e) => setTestScore(parseFloat(e.target.value))}
          style={{ width: "100%", cursor: "pointer", accentColor: rule.color }}
        />

        <ThresholdBar score={testScore} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. TRIGGERED DECISION RULE                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SectionLabel label="Triggered Decision Rule" />

      <div
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${rule.border}`,
          borderLeft: `3px solid ${rule.color}`,
          borderRadius: 5,
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "0 24px",
          alignItems: "center",
        }}
      >
        {/* Classification badge */}
        <div style={{ textAlign: "center", paddingRight: 20, borderRight: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Classification
          </div>
          <span
            style={{
              display: "inline-block",
              fontSize: 13,
              fontWeight: 700,
              padding: "3px 12px",
              borderRadius: 3,
              background: rule.bg,
              border: `1px solid ${rule.border}`,
              color: rule.color,
              letterSpacing: "0.05em",
            }}
          >
            {rule.label}
          </span>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
            Range: <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{rule.range}</span>
          </div>
        </div>

        {/* Action + description */}
        <div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Selected Action
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#d1dae8", marginBottom: 6 }}>
            {rule.action}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
            {rule.description}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 3. DECISION THRESHOLD TABLE                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <SectionLabel label="Decision Threshold Reference" />

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
              {["Confidence Range", "Classification", "Triggered Action", "Analyst Required"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DECISION_RULES.map((r, idx) => (
              <tr
                key={r.label}
                className="data-row"
                style={{
                  borderBottom: idx < DECISION_RULES.length - 1 ? "1px solid var(--bg-surface)" : "none",
                  background: rule.label === r.label ? `${r.bg}` : "transparent",
                }}
              >
                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontWeight: 600, color: r.color }}>
                  {r.range}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 3,
                      background: r.bg,
                      border: `1px solid ${r.border}`,
                      color: r.color,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {r.label}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>{r.action}</td>
                <td style={{ padding: "10px 16px", color: r.label === "UNCERTAIN" ? "#fbbf24" : "var(--text-muted)", fontSize: 11 }}>
                  {r.label === "UNCERTAIN" ? "Yes — mandatory" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. SIMULATION SAFEGUARD NOTICE                                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderLeft: "3px solid #d97706",
          borderRadius: 5,
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Lock style={{ width: 14, height: 14, color: "#d97706", flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 4, letterSpacing: "0.03em" }}>
            Simulation Mode — No Real Infrastructure Modified
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
            CAIRA guarantees zero accidental disruption to enterprise production systems by routing all containment commands into isolated simulation logs. No network changes, firewall rules, or access revocations are applied.
          </p>
        </div>
      </div>
    </div>
  );
}
