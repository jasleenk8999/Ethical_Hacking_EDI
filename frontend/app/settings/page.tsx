"use client";

import React from "react";
import { Lock, Cpu, ShieldCheck, Database, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Page header */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
          System Settings & Model Configuration
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Configured agent framework, active LLM model runtime, and system safeguards
        </p>
      </div>

      {/* Configured Model Status */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Active AI Agent & LLM Configuration
          </span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 3, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", fontWeight: 600 }}>
            LIVE RUNTIME
          </span>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Cpu style={{ width: 18, height: 18, color: "var(--accent-blue)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                Model: claude-3-5-sonnet-20240620
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                LangGraph State Machine agent initialized with Anthropic API key (`ANTHROPIC_API_KEY`). Deterministic temperature=0.0.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <Database style={{ width: 18, height: 18, color: "#34d399", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                Backend Persistence: SQLite / SQLAlchemy
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Integrated database backing with `log_entries`, `threat_intel_records`, `asset_records`, and `audit_trails`.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
            <ShieldCheck style={{ width: 18, height: 18, color: "#fbbf24", flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
                Trust Engine & Cryptographic Audit
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Evidence trust weighting (Verified=1.0, Corroborated=0.6, Untrusted=0.2) paired with SHA-256 tamper-evident hash-chain audit logging.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety lock notice */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(251,191,36,0.2)",
          borderLeft: "3px solid #d97706",
          borderRadius: 5,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Lock style={{ width: 14, height: 14, color: "#d97706", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 2, letterSpacing: "0.03em" }}>
            Simulation Mode Safety Lock — Active & Enforced
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            All containment commands are routed to isolated simulation logs to prevent unauthorized production disruption.
          </div>
        </div>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 3,
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.25)",
            color: "#fbbf24",
            flexShrink: 0,
          }}
        >
          ENFORCED
        </span>
      </div>
    </div>
  );
}
