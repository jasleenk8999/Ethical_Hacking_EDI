"use client";

import { useState } from "react";
import { SlidersHorizontal, Lock, AlertTriangle, CheckCircle2, ShieldCheck, Radio } from "lucide-react";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import TrustBadge from "@/components/TrustBadge";

export default function DecisionCenterPage() {
  const [testConfidence, setTestConfidence] = useState(0.84);

  const getClassification = (score: number) => {
    if (score >= 0.75) return { label: "MALICIOUS", action: "SIMULATED CONTAINMENT", style: "text-rose-400 border-rose-800 bg-rose-950/40" };
    if (score >= 0.40) return { label: "UNCERTAIN", action: "ESCALATE TO HUMAN ANALYST", style: "text-amber-400 border-amber-800 bg-amber-950/40" };
    return { label: "BENIGN", action: "NO ACTION (MONITOR ONLY)", style: "text-emerald-400 border-emerald-800 bg-emerald-950/40" };
  };

  const decisionInfo = getClassification(testConfidence);

  return (
    <div className="space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
            Decision Center & Calibration Engine
          </h1>
          <p className="text-xs text-slate-400 font-mono">Deterministic Thresholds & Controlled Action Core</p>
        </div>
      </div>

      {/* CONFIDENCE INTERACTIVE SLIDER & GAUGE */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Simulate Confidence Score</span>
          <span className="text-xs text-cyan-400 font-bold">Score: {testConfidence.toFixed(2)}</span>
        </div>

        <input 
          type="range" 
          min="0.0" 
          max="1.0" 
          step="0.01" 
          value={testConfidence}
          onChange={(e) => setTestConfidence(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <ConfidenceGauge confidence={testConfidence} classification={decisionInfo.label} />
      </div>

      {/* DECISION RATIONALE & SAFETY BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">Triggered Decision Rule</span>
            <span className={`text-xs px-2.5 py-0.5 rounded border font-bold ${decisionInfo.style}`}>
              {decisionInfo.label}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div><span className="text-slate-500">Selected Action:</span> <span className="font-bold text-slate-100">{decisionInfo.action}</span></div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
              Confidence score of {testConfidence.toFixed(2)} triggered threshold rule. All containment actions are strictly simulated.
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-amber-800/80 space-y-4 font-mono">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4 animate-pulse" /> Simulation Safeguards
          </div>
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-bold">
            SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED
          </div>
          <p className="text-xs text-slate-400 font-sans leading-relaxed">
            CAIRA guarantees zero accidental disruption to enterprise production systems by routing all containment commands into isolated simulation logs.
          </p>
        </div>
      </div>
    </div>
  );
}
