"use client";

import { useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { createScenario } from "@/lib/api";

// ─── Field row ────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ScenariosPage() {
  const [name, setName] = useState("Custom Adversarial Injection");
  const [alertType, setAlertType] = useState("Conflicting Telemetry");
  const [severity, setSeverity] = useState("HIGH");
  const [sourceIp, setSourceIp] = useState("192.168.10.99");
  const [targetAsset, setTargetAsset] = useState("FIN-SERVER-01");
  const [expectedResult, setExpectedResult] = useState("UNCERTAIN");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setSuccess(false);
    try {
      await createScenario({
        name,
        category: "User Custom",
        alert_type: alertType,
        severity,
        source_ip: sourceIp,
        target_asset: targetAsset,
        expected_result: expectedResult,
        description: `Custom test scenario evaluating ${alertType} against ${targetAsset}.`,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Scenario creation failed:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
          Adversarial Scenario Generator
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Create edge-case and adversarial test scenarios for the evaluation harness
        </p>
      </div>

      {/* ── Form panel ── */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Scenario Parameters
          </span>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Scenario Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </Field>
            <Field label="Alert Type">
              <input
                type="text"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </Field>
            <Field label="Severity">
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </Field>
            <Field label="Expected Classification">
              <select
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box" }}
              >
                <option value="MALICIOUS">MALICIOUS</option>
                <option value="UNCERTAIN">UNCERTAIN</option>
                <option value="BENIGN">BENIGN</option>
              </select>
            </Field>
            <Field label="Source IP">
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </Field>
            <Field label="Target Asset">
              <input
                type="text"
                value={targetAsset}
                onChange={(e) => setTargetAsset(e.target.value)}
                className="field"
                style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace" }}
              />
            </Field>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Plus style={{ width: 12, height: 12 }} />
              {creating ? "Generating…" : "Generate Test Scenario"}
            </button>

            {success && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#34d399" }}>
                <CheckCircle2 style={{ width: 13, height: 13 }} />
                Scenario added to evaluation benchmark suite
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
