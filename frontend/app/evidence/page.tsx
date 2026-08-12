"use client";

import { useEffect, useState } from "react";
import { Layers, ShieldCheck, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import TrustBadge from "@/components/TrustBadge";
import EvidenceGraph from "@/components/EvidenceGraph";

export default function EvidenceExplorerPage() {
  const [filterTier, setFilterTier] = useState("ALL");

  const evidenceItems = [
    { id: "EVD-101", alert_id: "ALT-001", tool_name: "Threat Intelligence", evidence_type: "Global Reputation", trust_tier: "VERIFIED", trust_weight: 1.0, evidence_score: 0.95, content: "Source IP 192.168.10.45 listed in Threat Intel feed (Reputation: Malicious, Threat Score 92/100)." },
    { id: "EVD-102", alert_id: "ALT-001", tool_name: "Log Lookup", evidence_type: "SIEM Audit Telemetry", trust_tier: "CORROBORATED", trust_weight: 0.6, evidence_score: 0.82, content: "27 consecutive failed SSH logins detected within 5-minute window." },
    { id: "EVD-103", alert_id: "ALT-001", tool_name: "Asset Criticality", evidence_type: "CMDB Impact Record", trust_tier: "CORROBORATED", trust_weight: 0.6, evidence_score: 0.90, content: "Asset FIN-SERVER-01 belongs to Finance Dept with Very High business impact." },
    { id: "EVD-104", alert_id: "ALT-004", tool_name: "Threat Intelligence", evidence_type: "Signature Match", trust_tier: "VERIFIED", trust_weight: 1.0, evidence_score: 0.98, content: "Win32/CobaltStrike.Gen signature verified in endpoint memory space." },
    { id: "EVD-105", alert_id: "ALT-004", tool_name: "External Feed", evidence_type: "Unverified User Report", trust_tier: "UNTRUSTED", trust_weight: 0.2, evidence_score: 0.40, content: "Single third-party forum post alleging compromised API endpoint." }
  ];

  const filtered = filterTier === "ALL" ? evidenceItems : evidenceItems.filter(e => e.trust_tier === filterTier);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Evidence Explorer & Trust System
          </h1>
          <p className="text-xs text-slate-400 font-mono">Annotated Evidence Tiers & Lineage Graph</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button 
            onClick={() => setFilterTier("ALL")} 
            className={`px-3 py-1.5 rounded-lg border ${filterTier === "ALL" ? "bg-cyan-950 text-cyan-300 border-cyan-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            All Tiers
          </button>
          <button 
            onClick={() => setFilterTier("VERIFIED")} 
            className={`px-3 py-1.5 rounded-lg border ${filterTier === "VERIFIED" ? "bg-emerald-950 text-emerald-300 border-emerald-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            Verified (1.0)
          </button>
          <button 
            onClick={() => setFilterTier("CORROBORATED")} 
            className={`px-3 py-1.5 rounded-lg border ${filterTier === "CORROBORATED" ? "bg-blue-950 text-cyan-300 border-blue-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            Corroborated (0.6)
          </button>
          <button 
            onClick={() => setFilterTier("UNTRUSTED")} 
            className={`px-3 py-1.5 rounded-lg border ${filterTier === "UNTRUSTED" ? "bg-amber-950 text-amber-300 border-amber-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            Untrusted (0.2)
          </button>
        </div>
      </div>

      {/* TRUST TIER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-800/80 transition-colors font-mono space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">{item.id}</span>
              <TrustBadge tier={item.trust_tier} weight={item.trust_weight} />
            </div>
            <div className="text-xs text-slate-300 font-semibold">{item.tool_name} — {item.evidence_type}</div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">{item.content}</p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Alert: {item.alert_id}</span>
              <span>Evidence Score: {(item.evidence_score).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* INTERACTIVE GRAPH */}
      <EvidenceGraph />
    </div>
  );
}
