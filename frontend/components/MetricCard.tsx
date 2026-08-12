"use client";

import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "red" | "amber" | "green" | "purple" | "cyan" | "rose" | "emerald" | "indigo";
  badge?: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
}

const COLOR_MAP: Record<string, { accent: string; bg: string; border: string }> = {
  blue:    { accent: "var(--accent-blue)", bg: "rgba(59,130,246,0.07)",   border: "rgba(59,130,246,0.2)" },
  red:     { accent: "#f87171", bg: "rgba(248,113,113,0.07)",  border: "rgba(248,113,113,0.2)" },
  rose:    { accent: "#f87171", bg: "rgba(248,113,113,0.07)",  border: "rgba(248,113,113,0.2)" },
  amber:   { accent: "#fbbf24", bg: "rgba(251,191,36,0.07)",   border: "rgba(251,191,36,0.2)" },
  green:   { accent: "#34d399", bg: "rgba(52,211,153,0.07)",   border: "rgba(52,211,153,0.2)" },
  emerald: { accent: "#34d399", bg: "rgba(52,211,153,0.07)",   border: "rgba(52,211,153,0.2)" },
  purple:  { accent: "#a78bfa", bg: "rgba(167,139,250,0.07)",  border: "rgba(167,139,250,0.2)" },
  cyan:    { accent: "#22d3ee", bg: "rgba(34,211,238,0.07)",   border: "rgba(34,211,238,0.2)" },
  indigo:  { accent: "#818cf8", bg: "rgba(129,140,248,0.07)",  border: "rgba(129,140,248,0.2)" },
};

export default function MetricCard({ title, value, icon: Icon, color = "blue", badge, delta, deltaDir }: MetricCardProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div
      className="metric-card"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 5,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
          {title}
        </span>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 4,
            background: c.bg,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 13, height: 13, color: c.accent }} />
        </div>
      </div>

      {/* Value */}
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.01em" }}>
        {value}
      </div>

      {/* Badge / delta */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {badge && (
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              padding: "2px 6px",
              borderRadius: 2,
              background: c.bg,
              color: c.accent,
              border: `1px solid ${c.border}`,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            {badge}
          </span>
        )}
        {delta && (
          <span
            style={{
              fontSize: 10,
              color: deltaDir === "up" ? "#34d399" : deltaDir === "down" ? "#f87171" : "var(--text-muted)",
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
