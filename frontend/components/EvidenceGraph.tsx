"use client";

import { ShieldAlert, Layers, BrainCircuit, SlidersHorizontal, CheckCircle2, AlertCircle } from "lucide-react";
import TrustBadge from "./TrustBadge";

interface EvidenceGraphProps {
  alertId?: string;
  alertType?: string;
  evidenceItems?: any[];
  confidence?: number;
  decision?: any;
}

export default function EvidenceGraph({
  alertId,
  alertType,
  evidenceItems = [],
  confidence,
  decision
}: EvidenceGraphProps) {

  const hasData = alertId || evidenceItems.length > 0 || confidence !== undefined;

  if (!hasData) {
    return (
      <div className="w-full bg-slate-950 p-8 rounded-xl border border-slate-800 text-slate-400 font-mono text-center flex flex-col items-center justify-center space-y-3">
        <AlertCircle className="w-8 h-8 text-slate-600" />
        <div className="text-sm font-semibold text-slate-300">No Evidence Lineage Data Available</div>
        <p className="text-xs text-slate-500 max-w-md font-sans">
          Ingest a security alert and run an automated investigation pipeline to build an evidence lineage graph.
        </p>
      </div>
    );
  }

  const items = evidenceItems;

  return (
    <div className="w-full bg-slate-950 p-6 rounded-xl border border-slate-800 text-slate-200 font-mono relative overflow-hidden">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-100 tracking-wide">Interactive Evidence Graph & Lineage</h3>
        </div>
        <span className="text-xs text-slate-500 font-sans">Traceable Evidence Gated Reasoning</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center relative z-10">
        {/* Node 1: Alert */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700/80 text-center flex flex-col items-center space-y-2 shadow-lg">
          <div className="p-2 rounded-full bg-rose-950 text-rose-400 border border-rose-800">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Alert Source</div>
            <div className="text-xs font-bold text-slate-200">{alertId || "N/A"}</div>
            <div className="text-[10px] text-slate-400 font-sans">{alertType || "Alert Telemetry"}</div>
          </div>
        </div>

        {/* Node 2: Evidence Items */}
        <div className="space-y-2 md:col-span-1">
          {items.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-center text-xs text-slate-500 font-sans">
              No evidence gathered
            </div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-700 transition-colors text-xs">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-semibold text-slate-300 truncate">{item.tool_name}</span>
                  <TrustBadge tier={item.trust_tier} weight={item.trust_weight} showIcon={false} />
                </div>
                <p className="text-[10px] text-slate-400 font-sans line-clamp-2">{item.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Node 3: Aggregated Confidence */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-cyan-800/80 text-center flex flex-col items-center space-y-2 shadow-lg shadow-cyan-950/40">
          <div className="p-2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Aggregated Confidence</div>
            <div className="text-xl font-bold text-cyan-400">
              {confidence !== undefined ? confidence.toFixed(2) : "N/A"}
            </div>
            <div className="text-[10px] text-cyan-500/80 font-sans">Weighted Trust Model</div>
          </div>
        </div>

        {/* Node 4: Decision Classification */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-700 text-center flex flex-col items-center space-y-2 shadow-lg">
          <div className="p-2 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Classification</div>
            <div className={`text-xs font-bold ${decision?.classification === "MALICIOUS" ? "text-rose-400" : decision?.classification === "UNCERTAIN" ? "text-amber-400" : "text-emerald-400"}`}>
              {decision?.classification || "PENDING"}
            </div>
            <div className="text-[10px] text-slate-400 font-sans">Threshold Rule Matched</div>
          </div>
        </div>

        {/* Node 5: Simulated Action */}
        <div className="p-3.5 rounded-lg bg-slate-900 border border-emerald-800/80 text-center flex flex-col items-center space-y-2 shadow-lg">
          <div className="p-2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Controlled Action</div>
            <div className="text-[11px] font-bold text-emerald-300 leading-tight">{decision?.action || "NO ACTION"}</div>
            <div className="text-[9px] text-amber-400 font-mono mt-1 px-1 bg-amber-950/60 rounded">SIMULATED</div>
          </div>
        </div>
      </div>
    </div>
  );
}
