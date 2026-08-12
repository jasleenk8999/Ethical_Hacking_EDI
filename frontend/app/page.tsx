"use client";

import Link from "next/link";
import { AlertOctagon, ExternalLink, ChevronRight, Shield, Hash, BarChart3, Lock } from "lucide-react";

const PIPELINE_STEPS = [
  {
    id: "01",
    label: "Ingestion",
    sub: "Alert Normalizer · Context Window · Schema Parsing",
    color: "var(--accent-blue)",
  },
  {
    id: "02",
    label: "Evidence Loop",
    sub: "Log Lookup · Threat Intel · Asset Criticality",
    color: "var(--accent-blue)",
  },
  {
    id: "03",
    label: "Trust Scoring",
    sub: "Verified=1.0 · Corroborated=0.6 · Untrusted=0.2",
    color: "#a78bfa",
  },
  {
    id: "04",
    label: "Decision",
    sub: "Threshold Engine · Simulated Containment / Escalation",
    color: "#fbbf24",
  },
  {
    id: "05",
    label: "Audit Chain",
    sub: "SHA-256 Hash Chain · Tamper Verification",
    color: "#34d399",
  },
];

const CAPABILITIES = [
  {
    icon: Shield,
    title: "Evidence-Gated Decisions",
    body: "Each piece of evidence is annotated with a trust tier before contributing to the final confidence score. The agent cannot act without threshold-sufficient corroboration.",
    accent: "var(--accent-blue)",
  },
  {
    icon: BarChart3,
    title: "Confidence Calibration",
    body: "Weighted trust aggregation against deterministic thresholds — ≥0.75 triggers containment, 0.40–0.74 triggers escalation, <0.40 marks benign. No fuzzy black-box outputs.",
    accent: "#a78bfa",
  },
  {
    icon: Hash,
    title: "Tamper-Evident Auditing",
    body: "Every reasoning step, tool invocation, and decision is persisted as a node in a SHA-256 cryptographic hash chain. Integrity can be verified at any time.",
    accent: "#34d399",
  },
  {
    icon: Lock,
    title: "Simulation Safety",
    body: "All containment actions — host isolation, IP blocking, session revocation — are strictly simulated. No real infrastructure is modified under any circumstances.",
    accent: "#fbbf24",
  },
];

export default function LandingPage() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "32px 0",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: 24,
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontFamily: "monospace",
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 3,
              padding: "3px 8px",
              marginBottom: 12,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", display: "inline-block" }} className="status-live" />
            Academic Research Prototype · SOC / DFIR
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            CAIRA
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-muted)",
              marginTop: 6,
              fontWeight: 400,
              letterSpacing: "0.01em",
            }}
          >
            Confidence-aware Adaptive Incident Response Agent
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 12,
              maxWidth: 520,
              lineHeight: 1.65,
            }}
          >
            An AI-powered SOC platform that investigates simulated security alerts using
            multiple evidence sources, assigns calibrated trust levels to evidence, and
            maintains a tamper-evident audit trail for every decision made.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, paddingTop: 28 }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 4,
              background: "var(--accent-blue-dim)",
              border: "1px solid var(--accent-blue)",
              color: "var(--accent-blue)",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Open Dashboard <ChevronRight style={{ width: 13, height: 13 }} />
          </Link>
          <Link
            href="/investigate/ALT-001"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 4,
              background: "transparent",
              border: "1px solid var(--border-default)",
              color: "var(--text-muted)",
              fontSize: 12,
              fontWeight: 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Run Demo Investigation <ExternalLink style={{ width: 12, height: 12 }} />
          </Link>
        </div>
      </div>

      {/* ── PIPELINE DIAGRAM ── */}
      <div className="panel">
        <div className="panel-header">
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
            INVESTIGATION PIPELINE
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
            End-to-end · Evidence-Gated
          </span>
        </div>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "stretch", gap: 0 }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div
              key={step.id}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Connector line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    right: 0,
                    width: "50%",
                    height: 1,
                    background: "var(--border-subtle)",
                    zIndex: 0,
                  }}
                />
              )}
              {i > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 20,
                    left: 0,
                    width: "50%",
                    height: 1,
                    background: "var(--border-subtle)",
                    zIndex: 0,
                  }}
                />
              )}
              {/* Node */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 6,
                  background: `${step.color}18`,
                  border: `1px solid ${step.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: step.color,
                  position: "relative",
                  zIndex: 1,
                  marginBottom: 10,
                }}
              >
                {step.id}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  lineHeight: 1.5,
                  fontFamily: "monospace",
                  padding: "0 4px",
                }}
              >
                {step.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CAPABILITIES GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.title}
              className="panel"
              style={{ padding: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: `${cap.accent}14`,
                    border: `1px solid ${cap.accent}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon style={{ width: 14, height: 14, color: cap.accent }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#d1dae8" }}>
                  {cap.title}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.65, margin: 0 }}>
                {cap.body}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── THRESHOLD TABLE ── */}
      <div className="panel">
        <div className="panel-header">
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "monospace", letterSpacing: "0.04em" }}>
            DECISION THRESHOLDS
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Confidence Band", "Classification", "Action", "Description"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 16px",
                    textAlign: "left",
                    fontSize: 10,
                    fontFamily: "monospace",
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
            {[
              {
                band: "≥ 0.75",
                cls: "MALICIOUS",
                clsStyle: "cls-malicious",
                action: "Simulated Containment",
                desc: "Host isolation, IP block, session revoke (simulated)",
              },
              {
                band: "0.40 – 0.74",
                cls: "UNCERTAIN",
                clsStyle: "cls-uncertain",
                action: "Analyst Escalation",
                desc: "Handoff to Tier-2 analyst with evidence brief",
              },
              {
                band: "< 0.40",
                cls: "BENIGN",
                clsStyle: "cls-benign",
                action: "Monitor Only",
                desc: "Alert logged, no containment action initiated",
              },
            ].map((row) => (
              <tr key={row.band} className="data-row" style={{ borderBottom: "1px solid #1a1e28" }}>
                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>
                  {row.band}
                </td>
                <td style={{ padding: "10px 16px" }}>
                  <span className={`${row.clsStyle}`} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, fontFamily: "monospace", fontWeight: 600 }}>
                    {row.cls}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                  {row.action}
                </td>
                <td style={{ padding: "10px 16px", fontSize: 11, color: "var(--text-muted)" }}>
                  {row.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
