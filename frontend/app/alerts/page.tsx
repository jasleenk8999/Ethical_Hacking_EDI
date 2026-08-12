"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, RefreshCw, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { ingestAlert } from "@/lib/api";

const SAMPLE_JSON = {
  id: "ALT-001",
  type: "Brute Force Attack",
  severity: "HIGH",
  source_ip: "192.168.10.45",
  target_asset: "FIN-SERVER-01",
  timestamp: "2026-08-11T10:30:00Z",
  description: "Multiple failed authentication attempts detected within 5-minute window.",
  user: "admin",
};

const SCHEMA_FIELDS = [
  { field: "alert_id",       type: "string", note: "Auto-generated if not provided" },
  { field: "type",           type: "string", note: "Alert category" },
  { field: "severity",       type: "enum",   note: "LOW | MEDIUM | HIGH | CRITICAL" },
  { field: "source_ip",      type: "string", note: "Originating IP address" },
  { field: "destination_ip", type: "string", note: "Target IP (optional)" },
  { field: "target_asset",   type: "string", note: "Affected asset hostname" },
  { field: "timestamp",      type: "ISO8601",note: "UTC preferred" },
  { field: "description",    type: "string", note: "Human-readable summary" },
  { field: "user",           type: "string", note: "Associated user account" },
];

export default function AlertIngestionPage() {
  const router = useRouter();
  const [jsonText, setJsonText]       = useState(JSON.stringify(SAMPLE_JSON, null, 2));
  const [ingesting, setIngesting]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [successResult, setSuccessResult] = useState<any>(null);

  const handleIngest = async () => {
    setErrorMsg("");
    setSuccessResult(null);
    try {
      setIngesting(true);
      const parsed = JSON.parse(jsonText);
      const res = await ingestAlert(parsed);
      setSuccessResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid JSON payload or ingestion error.");
    } finally {
      setIngesting(false);
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) setJsonText(event.target.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateSample = () => {
    const randomId = `ALT-${Math.floor(100 + Math.random() * 900)}`;
    setJsonText(
      JSON.stringify(
        {
          id: randomId,
          type: "Suspicious PowerShell Execution",
          severity: "HIGH",
          source_ip: `192.168.10.${Math.floor(Math.random() * 200)}`,
          target_asset: "SEC-AUTH-DC01",
          timestamp: new Date().toISOString(),
          description: "Base64 encoded script execution detected by EDR telemetry.",
          user: "sysadmin_svc",
        },
        null,
        2
      )
    );
  };

  return (
    <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Alert Ingestion
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Submit a raw SOC alert payload. CAIRA will normalize it into the standard schema and register it for investigation.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        {/* Left — editor + action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>JSON Payload</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={handleGenerateSample}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                  background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)",
                  transition: "color 0.12s",
                }}
              >
                <RefreshCw style={{ width: 11, height: 11 }} /> Generate Sample
              </button>
              <label
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                  background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)",
                }}
              >
                <Upload style={{ width: 11, height: 11 }} /> Upload File
                <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={14}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 4,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontFamily: "monospace",
              fontSize: 12,
              outline: "none",
              resize: "vertical",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--accent-blue)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
            placeholder="Paste raw SOC alert JSON here..."
          />

          {/* Error */}
          {errorMsg && (
            <div
              style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "10px 12px", borderRadius: 4,
                background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171", fontSize: 12,
              }}
            >
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleIngest}
            disabled={ingesting}
            style={{
              padding: "9px 18px",
              borderRadius: 4,
              background: ingesting ? "#0f1d38" : "var(--accent-blue-dim)",
              border: "1px solid var(--accent-blue)",
              color: ingesting ? "var(--text-muted)" : "var(--accent-blue)",
              fontSize: 12,
              fontWeight: 600,
              cursor: ingesting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "background 0.15s",
              alignSelf: "flex-start",
            }}
          >
            {ingesting ? "Normalizing & Registering…" : "Normalize & Ingest Alert"}
          </button>

          {/* Success */}
          {successResult && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 4,
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CheckCircle2 style={{ width: 14, height: 14, color: "#34d399" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>Alert registered successfully</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                <span style={{ color: "var(--text-muted)" }}>ID: </span>
                <span style={{ fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>{successResult.alert_id}</span>
                {"  "}
                <span style={{ color: "var(--text-muted)" }}>Status: </span>
                <span style={{ color: "#34d399" }}>{successResult.status}</span>
              </div>
              <button
                onClick={() => router.push(`/investigate/${successResult.alert_id}`)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 4,
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                  color: "#34d399", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                Start Investigation <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            </div>
          )}
        </div>

        {/* Right — schema reference */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Normalization Schema
            </span>
          </div>
          <div style={{ padding: "4px 0" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 14px 4px", lineHeight: 1.5, margin: 0 }}>
              Payloads are normalized into CAIRA's standard schema before storage.
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <tbody>
                {SCHEMA_FIELDS.map((f, i) => (
                  <tr
                    key={f.field}
                    className="data-row"
                    style={{ borderTop: i > 0 ? "1px solid var(--bg-surface)" : "none" }}
                  >
                    <td style={{ padding: "6px 14px", fontFamily: "monospace", color: "var(--accent-blue)", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {f.field}
                    </td>
                    <td style={{ padding: "6px 6px", color: "var(--text-muted)", fontSize: 10, whiteSpace: "nowrap" }}>
                      {f.type}
                    </td>
                    <td style={{ padding: "6px 14px 6px 0", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {f.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
