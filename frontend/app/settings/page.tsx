"use client";

import { useState } from "react";
import { Save, CheckCircle2, Lock } from "lucide-react";

export default function SettingsPage() {
  const [provider, setProvider] = useState("Deterministic Mock Reasoning Engine");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const PROVIDERS = [
    {
      value: "Deterministic Mock Reasoning Engine",
      label: "Deterministic Mock Reasoning Engine",
      description: "Default offline research engine. Fully functional out-of-the-box, no API key required.",
    },
    {
      value: "OpenAI gpt-4o / Local LLM Adapter",
      label: "OpenAI / Anthropic / Ollama Local LLM Adapter",
      description: "Modular adapter structure for connecting external LLM APIs.",
    },
  ];

  return (
    <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page header ── */}
      <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)" }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
          System Settings &amp; Model Configuration
        </h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Agent reasoning engine, LLM integrations, and safety locks
        </p>
      </div>

      {/* ── Reasoning engine provider ── */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 5 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Reasoning Engine Provider
          </span>
        </div>
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {PROVIDERS.map((p) => {
            const isSelected = provider === p.value;
            return (
              <label
                key={p.value}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 4,
                  border: isSelected ? "1px solid rgba(59,130,246,0.35)" : "1px solid var(--border-subtle)",
                  background: isSelected ? "rgba(59,130,246,0.06)" : "var(--bg-elevated)",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <input
                  type="radio"
                  name="provider"
                  value={p.value}
                  checked={isSelected}
                  onChange={(e) => setProvider(e.target.value)}
                  style={{ marginTop: 2, accentColor: "var(--accent-blue)", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? "var(--accent-blue)" : "var(--text-primary)", marginBottom: 3 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {p.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {provider.includes("OpenAI") && (
          <div style={{ padding: "0 16px 14px" }}>
            <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              API Key (Optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="field"
              style={{ width: "100%", boxSizing: "border-box", fontFamily: "monospace" }}
            />
          </div>
        )}
      </div>

      {/* ── Safety lock notice ── */}
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
        <Lock style={{ width: 13, height: 13, color: "#d97706", flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", marginBottom: 2, letterSpacing: "0.03em" }}>
            Simulation Mode Safety Lock — Active
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            All containment actions are strictly simulated. No real infrastructure is modified.
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

      {/* ── Save button ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Save style={{ width: 12, height: 12 }} />
          Save System Settings
        </button>
        {saved && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#34d399" }}>
            <CheckCircle2 style={{ width: 13, height: 13 }} />
            Settings updated successfully
          </div>
        )}
      </div>
    </div>
  );
}
