"use client";

import React, { useEffect, useState } from "react";
import TrustBadge from "@/components/TrustBadge";
import EvidenceGraph from "@/components/EvidenceGraph";
import { fetchAllEvidence } from "@/lib/api";

const FILTER_OPTIONS = [
  { key: "ALL",          label: "All" },
  { key: "VERIFIED",     label: "Verified" },
  { key: "CORROBORATED", label: "Corroborated" },
  { key: "UNTRUSTED",    label: "Untrusted" },
];

export default function EvidenceExplorerPage() {
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filterTier, setFilterTier]     = useState("ALL");
  const [expanded, setExpanded]         = useState<string | null>(null);

  useEffect(() => {
    fetchAllEvidence()
      .then((data) => {
        setEvidenceList(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch evidence:", err);
        setLoading(false);
      });
  }, []);

  const tierCounts = {
    VERIFIED:     evidenceList.filter(e => e.trust_tier === "VERIFIED").length,
    CORROBORATED: evidenceList.filter(e => e.trust_tier === "CORROBORATED").length,
    UNTRUSTED:    evidenceList.filter(e => e.trust_tier === "UNTRUSTED").length,
  };

  const filtered = filterTier === "ALL"
    ? evidenceList
    : evidenceList.filter(e => e.trust_tier === filterTier);

  return (
    <div style={{ maxWidth: 1000, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Evidence Explorer
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          All collected evidence items with trust tier annotations and source lineage from live database.
        </p>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: 0, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        {[
          { label: "Total",       value: evidenceList.length, color: "var(--text-secondary)" },
          { label: "Verified",    value: tierCounts.VERIFIED,     color: "#34d399" },
          { label: "Corroborated",value: tierCounts.CORROBORATED,  color: "var(--accent-blue)" },
          { label: "Untrusted",   value: tierCounts.UNTRUSTED,     color: "#fbbf24" },
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
            Evidence Items — {loading ? "Loading..." : `${filtered.length} shown`}
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
            {loading && (
              <tr>
                <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  Loading evidence records...
                </td>
              </tr>
            )}

            {!loading && filtered.map((item) => (
              <React.Fragment key={item.id || item.evidence_id}>
                <tr
                  className="data-row"
                  style={{
                    borderBottom: expanded === (item.id || item.evidence_id) ? "none" : "1px solid var(--bg-surface)",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(expanded === (item.id || item.evidence_id) ? null : (item.id || item.evidence_id))}
                >
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>
                    {item.evidence_id || item.id}
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
                    {(item.evidence_score ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "9px 14px" }}>
                    <TrustBadge tier={item.trust_tier} weight={item.trust_weight} />
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", color: "var(--text-muted)", fontSize: 11 }}>
                    {(item.trust_weight ?? 0.2).toFixed(1)}
                  </td>
                  <td style={{ padding: "9px 14px", color: "var(--text-muted)", fontSize: 11 }}>
                    {expanded === (item.id || item.evidence_id) ? "▲" : "▼"}
                  </td>
                </tr>
                {expanded === (item.id || item.evidence_id) && (
                  <tr>
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
                        {item.reason && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontStyle: "italic" }}>
                            Trust rationale: {item.reason}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  No evidence items found. Ingest an alert and run an investigation to gather evidence.
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
          <EvidenceGraph evidenceItems={evidenceList} />
        </div>
      </div>
    </div>
  );
}
