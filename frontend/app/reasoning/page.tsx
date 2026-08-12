"use client";

import { useState } from "react";
import { BrainCircuit, Calculator, ArrowRightLeft, Sparkles, Layers } from "lucide-react";
import TrustBadge from "@/components/TrustBadge";

export default function AgentReasoningPage() {
  const [method, setMethod] = useState<"WEIGHTED_TRUST" | "UNWEIGHTED_AVERAGE">("WEIGHTED_TRUST");

  const evidenceItems = [
    { tool_name: "Threat Intelligence", evidence_type: "Global Reputation", trust_tier: "VERIFIED", trust_weight: 1.0, evidence_score: 0.95 },
    { tool_name: "Log Lookup", evidence_type: "SIEM Audit Telemetry", trust_tier: "CORROBORATED", trust_weight: 0.6, evidence_score: 0.82 },
    { tool_name: "Asset Criticality", evidence_type: "CMDB Impact", trust_tier: "CORROBORATED", trust_weight: 0.6, evidence_score: 0.90 }
  ];

  const totalWeighted = evidenceItems.reduce((acc, item) => acc + (item.evidence_score * item.trust_weight), 0);
  const totalWeight = evidenceItems.reduce((acc, item) => acc + item.trust_weight, 0);
  const unweightedAvg = evidenceItems.reduce((acc, item) => acc + item.evidence_score, 0) / evidenceItems.length;

  const finalScore = method === "WEIGHTED_TRUST" ? (totalWeighted / totalWeight) : unweightedAvg;

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-cyan-400" />
            Agent Reasoning & Calibrated Confidence Math
          </h1>
          <p className="text-xs text-slate-400 font-mono">Transparent Evidence Score Aggregation & Formulas</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setMethod("WEIGHTED_TRUST")}
            className={`px-3 py-1.5 rounded-lg border ${method === "WEIGHTED_TRUST" ? "bg-cyan-950 text-cyan-300 border-cyan-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            Method 1: Weighted Trust
          </button>
          <button
            onClick={() => setMethod("UNWEIGHTED_AVERAGE")}
            className={`px-3 py-1.5 rounded-lg border ${method === "UNWEIGHTED_AVERAGE" ? "bg-cyan-950 text-cyan-300 border-cyan-800" : "bg-slate-900 border-slate-800 text-slate-400"}`}
          >
            Method 2: Unweighted Average
          </button>
        </div>
      </div>

      {/* FORMULA DISPLAY BOX */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Aggregation Formula</span>
          <span className="text-xs text-cyan-400 font-bold">{method}</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/80 text-center font-mono text-sm text-cyan-300">
          {method === "WEIGHTED_TRUST" ? (
            <div>Confidence = Σ (Evidence Score × Trust Weight) / Σ (Trust Weight)</div>
          ) : (
            <div>Confidence = Σ (Evidence Score) / N</div>
          )}
        </div>
      </div>

      {/* EVIDENCE BREAKDOWN TABLE */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Collected Evidence Contribution Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2 px-3">Tool Source</th>
                <th className="py-2 px-3">Evidence Score</th>
                <th className="py-2 px-3">Trust Tier</th>
                <th className="py-2 px-3">Trust Weight</th>
                <th className="py-2 px-3 text-right">Weighted Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {evidenceItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-semibold text-slate-200">{item.tool_name}</td>
                  <td className="py-3 px-3 text-cyan-400 font-bold">{item.evidence_score.toFixed(2)}</td>
                  <td className="py-3 px-3"><TrustBadge tier={item.trust_tier} weight={item.trust_weight} /></td>
                  <td className="py-3 px-3 text-slate-300">{item.trust_weight.toFixed(1)}</td>
                  <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                    {(item.evidence_score * item.trust_weight).toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MATH SUMMARY STRIP */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs pt-3">
          <div><span className="text-slate-500">Numerator Σ(Score × Weight):</span> <span className="text-slate-200 font-bold">{totalWeighted.toFixed(4)}</span></div>
          <div><span className="text-slate-500">Denominator Σ(Weight):</span> <span className="text-slate-200 font-bold">{totalWeight.toFixed(1)}</span></div>
          <div><span className="text-slate-500">Final Confidence:</span> <span className="text-cyan-400 font-bold text-base">{finalScore.toFixed(4)}</span></div>
        </div>
      </div>
    </div>
  );
}
