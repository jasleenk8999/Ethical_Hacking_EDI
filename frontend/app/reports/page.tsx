"use client";

import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { getReportDownloadUrl } from "@/lib/api";

const REPORTS = [
  {
    type: "incident",
    title: "SOC Incident Investigation Report",
    desc: "Export summary of all ingested alerts, tool lookups, confidence scores, classifications, and actions taken.",
    icon: FileText,
  },
  {
    type: "evaluation",
    title: "Adversarial Evaluation Report",
    desc: "Export evaluation benchmark scores, EGAR metrics, false positive rates, TTFC speeds, and baseline agent comparisons.",
    icon: FileSpreadsheet,
  },
  {
    type: "audit",
    title: "SHA-256 Audit Chain Report",
    desc: "Export complete cryptographic hash chain audit records, block IDs, previous hashes, current hashes, and integrity status.",
    icon: FileText,
  },
  {
    type: "scenarios",
    title: "Test Scenario Configuration Report",
    desc: "Export list of predefined and custom adversarial test scenarios with expected classification benchmarks.",
    icon: FileSpreadsheet,
  },
];

export default function ReportsPage() {
  return (
    <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
          Report Generation &amp; Research Exports
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Download formatted incident, audit, and evaluation reports as CSV
        </p>
      </div>

      {/* ── Report list ── */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
        {REPORTS.map((rep, idx) => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.type}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderBottom: idx < REPORTS.length - 1 ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon style={{ width: 15, height: 15, color: "var(--accent-blue)" }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#d1dae8", marginBottom: 3 }}>
                  {rep.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {rep.desc}
                </div>
              </div>

              {/* Download */}
              <a
                href={getReportDownloadUrl(rep.type)}
                download
                className="btn-ghost"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0 }}
              >
                <Download style={{ width: 12, height: 12 }} />
                Download CSV
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
