"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Layers,
  BrainCircuit,
  SlidersHorizontal,
  History,
  CheckCircle2,
  FlaskConical,
  FileText,
  Settings,
  AlertOctagon
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Investigation",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Alert Ingestion", href: "/alerts", icon: ShieldAlert },
      { name: "Evidence Explorer", href: "/evidence", icon: Layers },
      { name: "Agent Reasoning", href: "/reasoning", icon: BrainCircuit },
      { name: "Decision Center", href: "/decisions", icon: SlidersHorizontal },
      { name: "Audit Trail", href: "/audit", icon: History },
    ],
  },
  {
    label: "Research",
    items: [
      { name: "Evaluation Harness", href: "/evaluation", icon: CheckCircle2 },
      { name: "Scenarios", href: "/scenarios", icon: FlaskConical },
      { name: "Reports", href: "/reports", icon: FileText },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "16px 16px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "var(--accent-blue-dim)",
            border: "1px solid var(--accent-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertOctagon style={{ width: 16, height: 16, color: "var(--accent-blue)" }} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
              }}
            >
              CAIRA
            </span>
            <span
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                padding: "1px 6px",
                borderRadius: 3,
                background: "var(--border-subtle)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-default)",
              }}
            >
              v1.0
            </span>
          </div>
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontFamily: "monospace",
              marginTop: 1,
              letterSpacing: "0.02em",
            }}
          >
            Incident Response Agent
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "monospace",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
                padding: "4px 8px 6px",
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="nav-link"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 10px",
                    borderRadius: 4,
                    fontSize: 12.5,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--accent-blue)" : "var(--text-muted)",
                    background: isActive ? "rgba(59,130,246,0.08)" : "transparent",
                    borderLeft: isActive ? "2px solid var(--accent-blue)" : "2px solid transparent",
                    textDecoration: "none",
                    marginBottom: 1,
                  }}
                >
                  <Icon
                    style={{
                      width: 14,
                      height: 14,
                      color: isActive ? "var(--accent-blue)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-base)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 8px",
            borderRadius: 4,
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          <div
            className="status-live"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#fbbf24",
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#d97706", letterSpacing: "0.04em" }}>
              SIMULATION MODE
            </div>
            <div style={{ fontSize: 9, color: "#78350f", marginTop: 1 }}>
              No real actions executed
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
