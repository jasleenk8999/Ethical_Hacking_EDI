"use client";

import { useState } from "react";
import TrustBadge from "@/components/TrustBadge";
import EvidenceGraph from "@/components/EvidenceGraph";

const ALL_EVIDENCE = [
  {
    id: "EVD-101", alert_id: "ALT-001",
    tool_name: "Threat Intelligence", evidence_type: "Global Reputation Feed",
    trust_tier: "VERIFIED" as const, trust_weight: 1.0, evidence_score: 0.95,
    content: "Source IP 192.168.10.45 listed in threat intelligence feed (Reputation: Malicious, Score 92/100).",
  },
  {
    id: "EVD-102", alert_id: "ALT-001",
    tool_name: "Log Lookup", evidence_type: "SIEM Audit Telemetry",
    trust_tier: "CORROBORATED" as const, trust_weight: 0.6, evidence_score: 0.82,
    content: "27 consecutive failed SSH logins detected within a 5-minute window on FIN-SERVER-01.",
  },
  {
    id: "EVD-103", alert_id: "ALT-001",
    tool_name: "Asset Criticality", evidence_type: "CMDB Impact Record",
    trust_tier: "CORROBORATED" as const, trust_weight: 0.6, evidence_score: 0.90,
    content: "Asset FIN-SERVER-01 belongs to Finance Dept. Business impact: Very High.",
  },
  {
    id: "EVD-104", alert_id: "ALT-004",
    tool_name: "Threat Intelligence", evidence_type: "Signature Match",
    trust_tier: "VERIFIED" as const, trust_weight: 1.0, evidence_score: 0.98,
    content: "Win32/CobaltStrike.Gen signature verified in endpoint memory space.",
  },
  {
    id: "EVD-105", alert_id: "ALT-004",
    tool_name: "External Feed", evidence_type: "Unverified User Report",
    trust_tier: "UNTRUSTED" as const, trust_weight: 0.2, evidence_score: 0.40,
    content: "Single third-party forum post alleging compromised API endpoint — unverified.",
  },
];

const FILTER_OPTIONS = [
  { key: "ALL",          label: "All" },
  { key: "VERIFIED",     label: "Verified" },
  { key: "CORROBORATED", label: "Corroborated" },
  { key: "UNTRUSTED",    label: "Untrusted" },
];

const TIER_COUNTS = {
  VERIFIED:     ALL_EVIDENCE.filter(e => e.trust_tier === "VERIFIED").length,
  CORROBORATED: ALL_EVIDENCE.filter(e => e.trust_tier === "CORROBORATED").length,
  UNTRUSTED:    ALL_EVIDENCE.filter(e => e.trust_tier === "UNTRUSTED").length,
};

export default function EvidenceExplorerPage() {
  const [filterTier, setFilterTier] = useState("ALL");
  const [expanded, setExpanded]     = useState<string | null>(null);

  const filtered = filterTier === "ALL"
    ? ALL_EVIDENCE
    : ALL_EVIDENCE.filter(e => e.trust_tier === filterTier);

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Evidence Explorer
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          All collected evidence items with trust tier annotations and source lineage.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 0, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        {[
          { label: "Total",       value: ALL_EVIDENCE.length, color: "var(--text-secondary)" },
          { label: "Verified",    value: TIER_COUNTS.VERIFIED,     color: "#34d399" },
          { label: "Corroborated",value: TIER_COUNTS.CORROBORATED,  color: "var(--accent-blue)" },
          { label: "Untrusted",   value: TIER_COUNTS.UNTRUSTED,     color: "#fbbf24" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1, padding: "12px 16px", textAlign: "center",
              borderRight: i < 3 ? "1px solid var(--border-subtle)" : "none",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filter + table */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Evidence Items — {filtered.length} shown
          </span>
          <div style={{ display: "flex", gap: 1, border: "1px solid var(--border-subtle)", borderRadius: 3, overflow: "hidden" }}>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilterTier(opt.key)}
                style={{
                  padding: "4px 10px", fontSize: 11, cursor: "pointer", border: "none",
                  background: filterTier === opt.key ? "var(--accent-blue-dim)" : "transparent",
                  color: filterTier === opt.key ? "var(--accent-blue)" : "var(--text-muted)",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["ID", "Source", "Evidence Type", "Alert", "Score", "Trust Tier", "Weight", ""].map(h => (
                <th
                  key={h}
                  style={{
                    padding: "7px 14px", textAlign: "left",
                    fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <>
                <tr
                  key={item.id}
                  className="data-row"
                  style={{
                    borderBottom: expanded === item.id ? "none" : "1px solid var(--bg-surface)",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                >
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                    {item.id}
                  </td>
                  <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-primary)" }}>
                    {item.tool_name}
                  </td>
                  <td style={{ padding: "9px 14px", color: "var(--text-muted)", fontSize: 11 }}>
                    {item.evidence_type}
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                    {item.alert_id}
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontWeight: 700, color: "var(--text-secondary)" }}>
                    {item.evidence_score.toFixed(2)}
                  </td>
                  <td style={{ padding: "9px 14px" }}>
                    <TrustBadge tier={item.trust_tier} weight={item.trust_weight} />
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 11 }}>
                    {item.trust_weight.toFixed(1)}
                  </td>
                  <td style={{ padding: "9px 14px", color: "var(--text-muted)", fontSize: 11 }}>
                    {expanded === item.id ? "▲" : "▼"}
                  </td>
                </tr>
                {expanded === item.id && (
                  <tr key={`${item.id}-detail`}>
                    <td
                      colSpan={8}
                      style={{
                        padding: "0 14px 12px 14px",
                        borderBottom: "1px solid var(--bg-surface)",
                        background: "var(--bg-elevated)",
                      }}
                    >
                      <div style={{ padding: "10px 12px", background: "var(--bg-surface)", borderRadius: 4, border: "1px solid var(--border-subtle)" }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                          Evidence Content
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                          {item.content}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  No evidence items match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Evidence lineage graph */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Evidence Lineage Graph
          </span>
        </div>
        <div style={{ padding: 16 }}>
          <EvidenceGraph />
        </div>
      </div>
    </div>
  );
}
