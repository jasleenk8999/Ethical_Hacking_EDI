"use client";

interface TrustBadgeProps {
  tier: "VERIFIED" | "CORROBORATED" | "UNTRUSTED" | string;
  weight?: number;
  showIcon?: boolean; // kept for API compatibility, ignored in new design
}

const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; defaultWeight: number }> = {
  VERIFIED:     { color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.2)",  label: "Verified",     defaultWeight: 1.0 },
  CORROBORATED: { color: "var(--accent-blue)", bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.2)",  label: "Corroborated", defaultWeight: 0.6 },
  UNTRUSTED:    { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  label: "Untrusted",    defaultWeight: 0.2 },
};

export default function TrustBadge({ tier, weight, showIcon = true }: TrustBadgeProps) {
  const key = tier?.toUpperCase() || "CORROBORATED";
  const cfg = TIER_CONFIG[key] ?? TIER_CONFIG.CORROBORATED;
  const displayWeight = weight !== undefined ? weight : cfg.defaultWeight;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 3,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
      <span style={{ color: cfg.color, opacity: 0.55, fontSize: 9 }}>
        ·{displayWeight.toFixed(1)}
      </span>
    </span>
  );
}
