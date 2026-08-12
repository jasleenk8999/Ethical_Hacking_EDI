"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, Bell, Clock } from "lucide-react";

const ROLES = ["SOC Analyst (Tier-1)", "SOC Analyst (Tier-2)", "Security Administrator", "Academic Researcher"];

export default function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [role, setRole] = useState(ROLES[0]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const now = new Date();
  const timeStr = now.toUTCString().replace("GMT", "UTC");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => window.location.reload(), 350);
  };

  return (
    <header
      style={{
        height: 52,
        background: "var(--bg-elevated)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        position: "sticky",
        top: 0,
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* Left — breadcrumb-style title */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {title || "SOC Operations"}
        </span>
        {subtitle && (
          <>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>/</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{subtitle}</span>
          </>
        )}
        <span
          style={{
            marginLeft: 6,
            fontSize: 10,
            padding: "2px 8px",
            borderRadius: 3,
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.2)",
            color: "#34d399",
            fontFamily: "monospace",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}
        >
          ● LIVE
        </span>
      </div>

      {/* Right — controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Clock */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--text-muted)",
            fontFamily: "monospace",
          }}
        >
          <Clock style={{ width: 12, height: 12 }} />
          {timeStr}
        </div>

        {/* Role selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 4,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            fontSize: 11,
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Role:</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={{
              background: "transparent",
              color: "var(--accent-blue)",
              border: "none",
              outline: "none",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r} style={{ background: "var(--bg-surface)" }}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <button
          style={{
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            padding: "5px 7px",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
          }}
          title="Notifications"
        >
          <Bell style={{ width: 13, height: 13 }} />
        </button>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          style={{
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: 4,
            padding: "5px 7px",
            cursor: "pointer",
            color: isRefreshing ? "var(--accent-blue)" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s",
          }}
          title="Refresh"
        >
          <RefreshCw
            style={{
              width: 13,
              height: 13,
              animation: isRefreshing ? "spin 0.6s linear infinite" : "none",
            }}
          />
        </button>

        {/* Engine tag */}
        <div
          style={{
            fontSize: 10,
            fontFamily: "monospace",
            padding: "3px 8px",
            borderRadius: 3,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            color: "var(--text-muted)",
          }}
        >
          ENGINE: FASTAPI / SQLITE
        </div>
      </div>
    </header>
  );
}
