"use client";

interface ConfidenceGaugeProps {
  confidence: number; // 0.0 to 1.0
  classification?: string;
  showLabels?: boolean;
}

function getStyle(confidence: number) {
  if (confidence >= 0.75) return { color: "#f87171", label: "MALICIOUS" };
  if (confidence >= 0.40) return { color: "#fbbf24", label: "UNCERTAIN" };
  return { color: "#34d399", label: "BENIGN" };
}

export default function ConfidenceGauge({ confidence, classification, showLabels = true }: ConfidenceGaugeProps) {
  const scorePct = Math.max(0, Math.min(100, Math.round(confidence * 100)));
  const { color, label } = getStyle(confidence);
  const displayLabel = classification || label;

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 5, padding: "14px 16px" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Calibrated Confidence
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            {confidence.toFixed(2)}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 3,
              border: `1px solid ${color}40`,
              background: `${color}12`,
              color,
              letterSpacing: "0.04em",
            }}
          >
            {displayLabel}
          </span>
        </div>
      </div>

      {/* Zone labels */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginBottom: 5 }}>
        <span style={{ color: "#34d399" }}>BENIGN</span>
        <span style={{ color: "#fbbf24" }}>UNCERTAIN</span>
        <span style={{ color: "#f87171" }}>MALICIOUS</span>
      </div>

      {/* Track */}
      <div style={{ position: "relative", height: 6, borderRadius: 2, background: "var(--border-subtle)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "40%", height: "100%", background: "rgba(52,211,153,0.1)" }} />
        <div style={{ position: "absolute", left: "40%", top: 0, width: "35%", height: "100%", background: "rgba(251,191,36,0.1)" }} />
        <div style={{ position: "absolute", left: "75%", top: 0, width: "25%", height: "100%", background: "rgba(248,113,113,0.1)" }} />
        {/* Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: `${scorePct}%`,
            height: "100%",
            background: color,
            opacity: 0.55,
            transition: "width 0.2s ease",
          }}
        />
        {/* Threshold dividers */}
        <div style={{ position: "absolute", left: "40%", top: 0, width: 1, height: "100%", background: "var(--bg-surface)" }} />
        <div style={{ position: "absolute", left: "75%", top: 0, width: 1, height: "100%", background: "var(--bg-surface)" }} />
      </div>

      {/* Range labels */}
      {showLabels && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 5 }}>
          <span>0.00 – 0.39</span>
          <span>0.40 – 0.74</span>
          <span>0.75 – 1.00</span>
        </div>
      )}
    </div>
  );
}
