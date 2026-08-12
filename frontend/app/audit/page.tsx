"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { fetchAllAuditTrails, verifyAuditChain } from "@/lib/api";

// ─── Section divider ─────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 10px" }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AuditTrailPage() {
  const [auditRecords, setAuditRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    fetchAllAuditTrails()
      .then((data) => { setAuditRecords(data); setLoading(false); })
      .catch((err) => { console.error("Error fetching audit trails:", err); setLoading(false); });
  }, []);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyAuditChain();
      setVerificationResult(res);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            Tamper-Evident Audit Chain
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            SHA-256 cryptographic event hashing · Integrity verification
          </p>
        </div>

        <button
          onClick={handleVerifyIntegrity}
          disabled={verifying}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {verifying
            ? <RefreshCw style={{ width: 12, height: 12 }} />
            : <ShieldCheck style={{ width: 12, height: 12 }} />
          }
          {verifying ? "Verifying…" : "Verify Audit Integrity"}
        </button>
      </div>

      {/* ── Verification result banner ── */}
      {verificationResult && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 5,
            border: verificationResult.verified
              ? "1px solid rgba(52,211,153,0.3)"
              : "1px solid rgba(248,113,113,0.3)",
            borderLeft: verificationResult.verified
              ? "3px solid #34d399"
              : "3px solid #f87171",
            background: "var(--bg-surface)",
          }}
        >
          {verificationResult.verified
            ? <ShieldCheck style={{ width: 14, height: 14, color: "#34d399", flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: verificationResult.verified ? "#34d399" : "#f87171", marginBottom: 3 }}>
              {verificationResult.status_message}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Verified {verificationResult.total_records} audit blocks. Cryptographic hash linkage intact.
            </div>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
          Loading audit records…
        </div>
      )}

      {/* ── Audit chain table ── */}
      {!loading && auditRecords.length > 0 && (
        <>
          <Divider label={`Audit Chain — ${auditRecords.length} blocks`} />

          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
            {auditRecords.map((record, idx) => (
              <div
                key={record.id}
                style={{
                  borderBottom: idx < auditRecords.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  padding: "14px 16px",
                }}
              >
                {/* Block header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--accent-blue)" }}>
                      Block #{idx + 1}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                      {record.audit_id}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 7px",
                        borderRadius: 2,
                        background: "var(--border-subtle)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {record.event_type}
                    </span>
                  </div>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                    {record.timestamp?.substring(0, 19)}
                  </span>
                </div>

                {/* Hash rows */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "8px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                      Previous SHA-256
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {record.previous_hash}
                    </div>
                  </div>
                  <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "8px 12px" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>
                      Current SHA-256
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, wordBreak: "break-all" }}>
                      {record.current_hash}
                    </div>
                  </div>
                </div>

                {/* Event content */}
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {record.event_content}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && auditRecords.length === 0 && (
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 5,
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 12,
          }}
        >
          No audit records found. Ingest an alert and run an investigation to generate audit events.
        </div>
      )}
    </div>
  );
}
