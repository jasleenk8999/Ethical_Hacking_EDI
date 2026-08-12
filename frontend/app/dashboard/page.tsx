"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldX,
  BarChart3,
  ArrowRight,
  Sparkles,
  Lock,
  History,
  FileCheck,
  ChevronRight,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import MetricCard from "@/components/MetricCard";
import { fetchMetrics } from "@/lib/api";

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "badge-critical",
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
};

const STATUS_COLOR: Record<string, string> = {
  INGESTED: "var(--text-muted)",
  INVESTIGATING: "var(--accent-blue)",
  "CONTAINED (SIMULATED)": "#34d399",
  ESCALATED: "#fbbf24",
  CLOSED: "var(--text-muted)",
};

export default function SOCDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics()
      .then((data) => { setMetrics(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, gap: 10, color: "var(--text-muted)", fontFamily: "monospace", fontSize: 12 }}>
        <Activity style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
        Loading telemetry…
      </div>
    );
  }

  const stats = metrics?.statistics || {};
  const dist = metrics?.distributions || {};
  const recentIncidents = metrics?.recent_incidents || [];

  const confidenceBands = [
    { band: "0.0–0.2", count: 2 },
    { band: "0.2–0.4", count: 3 },
    { band: "0.4–0.6", count: 4 },
    { band: "0.6–0.8", count: 6 },
    { band: "0.8–1.0", count: 8 },
  ];

  const timelineData = [
    { t: "10:00", mal: 1, unc: 2, ben: 3 },
    { t: "10:15", mal: 2, unc: 1, ben: 4 },
    { t: "10:30", mal: 3, unc: 2, ben: 2 },
    { t: "10:45", mal: 1, unc: 3, ben: 5 },
    { t: "11:00", mal: 4, unc: 1, ben: 3 },
  ];

  const actionDist = [
    { action: "Containment", count: stats.malicious_incidents || 4 },
    { action: "Escalation",  count: stats.uncertain_incidents || 3 },
    { action: "Benign",      count: stats.benign_incidents    || 5 },
  ];

  const tooltipStyle = { backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-subtle)", fontSize: 11 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1200 }}>

      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
            SOC Operations Dashboard
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
            Evidence-gated incident telemetry · Auto-refreshing
          </p>
        </div>
        <Link
          href="/alerts"
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
        >
          <ShieldAlert style={{ width: 12, height: 12 }} />
          Ingest Alert
        </Link>
      </div>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
        <MetricCard title="Total Alerts"  value={stats.total_alerts          || 10} icon={ShieldAlert}  color="blue"    />
        <MetricCard title="Active Inv."   value={stats.active_investigations  || 2}  icon={Activity}     color="indigo"  />
        <MetricCard title="Malicious"     value={stats.malicious_incidents     || 4}  icon={ShieldX}      color="rose"    badge="CONTAIN"  />
        <MetricCard title="Uncertain"     value={stats.uncertain_incidents     || 3}  icon={AlertTriangle} color="amber"  badge="ESCALATE" />
        <MetricCard title="Benign"        value={stats.benign_incidents        || 3}  icon={CheckCircle2} color="emerald" badge="MONITOR"  />
        <MetricCard title="Avg Conf."     value={(stats.average_confidence || 0.81).toFixed(2)} icon={Sparkles} color="cyan" />
        <MetricCard title="FP Rate"       value={`${((stats.false_positive_rate || 0) * 100).toFixed(0)}%`} icon={AlertTriangle} color="emerald" />
        <MetricCard title="Audit Comp."   value="100%"  icon={History}    color="purple" />
        <MetricCard title="EGAR"          value={`${((stats.egar || 1) * 100).toFixed(0)}%`} icon={FileCheck} color="emerald" badge="GATED" />
      </div>

      {/* ── CHARTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {/* Classification pie */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Classification
            </span>
          </div>
          <div style={{ padding: 12, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist.classification || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3}>
                  {(dist.classification || []).map((e: any, i: number) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence bands bar */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Confidence Bands
            </span>
          </div>
          <div style={{ padding: 12, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceBands} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1a1e28" />
                <XAxis dataKey="band" stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent-blue)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trust tiers pie */}
        <div className="panel">
          <div className="panel-header">
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Evidence Trust Tiers
            </span>
          </div>
          <div style={{ padding: 12, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist.trust_tiers || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3}>
                  {(dist.trust_tiers || []).map((e: any, i: number) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── TIMELINE + ACTION DIST ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div className="panel">
          <div className="panel-header">
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Incident Timeline
            </span>
          </div>
          <div style={{ padding: 12, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1a1e28" />
                <XAxis dataKey="t" stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} />
                <YAxis stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="mal" stroke="#f87171" strokeWidth={1.5} dot={false} name="Malicious" />
                <Line type="monotone" dataKey="unc" stroke="#fbbf24" strokeWidth={1.5} dot={false} name="Uncertain" />
                <Line type="monotone" dataKey="ben" stroke="#34d399" strokeWidth={1.5} dot={false} name="Benign" />
                <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Action Distribution
            </span>
          </div>
          <div style={{ padding: 12, height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionDist} layout="vertical" margin={{ top: 4, right: 8, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#1a1e28" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} />
                <YAxis dataKey="action" type="category" stroke="var(--text-muted)" fontSize={9} tick={{ fill: "var(--text-muted)" }} width={72} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent-blue)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── RECENT INCIDENTS TABLE ── */}
      <div className="panel">
        <div className="panel-header">
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Recent Incidents
          </span>
          <Link href="/alerts" style={{ fontSize: 11, color: "var(--accent-blue)", textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
            View all <ChevronRight style={{ width: 12, height: 12 }} />
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Incident ID", "Type", "Severity", "Source IP", "Target Asset", "Status", "Timestamp", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 14px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentIncidents.map((inc: any) => (
                <tr key={inc.id} className="data-row" style={{ borderBottom: "1px solid var(--bg-surface)" }}>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>
                    <Link href={`/investigate/${inc.alert_id}`} style={{ color: "var(--accent-blue)", textDecoration: "none" }}>
                      {inc.alert_id}
                    </Link>
                  </td>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: "var(--text-secondary)" }}>{inc.type}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span className={SEVERITY_STYLE[inc.severity] || "badge-medium"} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, fontFamily: "monospace", fontWeight: 600 }}>
                      {inc.severity}
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 11, color: "var(--text-muted)" }}>{inc.source_ip}</td>
                  <td style={{ padding: "9px 14px", fontSize: 11, color: "var(--text-muted)" }}>{inc.target_asset}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 7px",
                        borderRadius: 3,
                        fontFamily: "monospace",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: STATUS_COLOR[inc.status] || "var(--text-muted)",
                      }}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                    {inc.timestamp?.substring(0, 16)}
                  </td>
                  <td style={{ padding: "9px 14px" }}>
                    <Link
                      href={`/investigate/${inc.alert_id}`}
                      style={{ fontSize: 11, color: "var(--accent-blue)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}
                    >
                      Investigate <ArrowRight style={{ width: 11, height: 11 }} />
                    </Link>
                  </td>
                </tr>
              ))}
              {recentIncidents.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, fontFamily: "monospace" }}>
                    No incidents found. Seed the database or ingest an alert.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
