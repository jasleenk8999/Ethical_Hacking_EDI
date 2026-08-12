"use client";

import Link from "next/link";
import { 
  ShieldCheck, 
  Layers, 
  BrainCircuit, 
  History, 
  ArrowRight, 
  Radio, 
  Lock, 
  CheckCircle2, 
  Search, 
  Network, 
  Database,
  SlidersHorizontal,
  Flame
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 py-6 font-sans text-slate-200">
      {/* HERO SECTION */}
      <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 border border-slate-800/80 shadow-2xl overflow-hidden text-center space-y-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-widest shadow-sm">
          <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
          Academic & SOC Research Prototype
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-slate-100 tracking-tight font-sans">
          CAIRA
        </h1>

        <p className="text-xl md:text-2xl font-bold text-cyan-300 tracking-wide font-sans max-w-3xl mx-auto">
          Confidence-aware Adaptive Incident Response Agent
        </p>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto font-sans leading-relaxed">
          &ldquo;AI should not act merely because it is confident. It should act only after confidence is supported by trustworthy and traceable evidence.&rdquo;
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-cyan-950 transition-all hover:scale-105"
          >
            Launch SOC Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/investigate/ALT-001"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Flame className="w-4 h-4 text-amber-400" /> Run Live Demo Investigation
          </Link>
        </div>
      </div>

      {/* CORE RESEARCH CONTRIBUTIONS / BENEFITS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-800 transition-all space-y-3">
          <div className="p-3 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 w-fit">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Evidence-Gated Decisions</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Prevents hasty automated containment by annotating each evidence item with trust weights (Verified=1.0, Corroborated=0.6, Untrusted=0.2).
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-800 transition-all space-y-3">
          <div className="p-3 rounded-xl bg-blue-950 text-cyan-400 border border-blue-800 w-fit">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Confidence Calibration</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Calibrates model confidence against deterministic thresholds (&ge;0.75 Malicious, 0.40-0.75 Escalation, &lt;0.40 Benign) to prevent overconfident false positives.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-800 transition-all space-y-3">
          <div className="p-3 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 w-fit">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Tamper-Evident Auditing</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Stores every reasoning step, tool call, and decision in a SHA-256 cryptographic hash chain for complete auditability and integrity verification.
          </p>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE DIAGRAM */}
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Network className="w-5 h-5 text-cyan-400" />
              CAIRA System Architecture
            </h2>
            <p className="text-xs text-slate-400 font-mono">End-to-End Evidence-Gated Incident Response Pipeline</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
            Research Architecture Map
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center font-mono">
          <div className="p-4 rounded-xl bg-slate-950 border border-cyan-800/80 space-y-2">
            <div className="text-xs font-bold text-cyan-400 uppercase">1. Ingestion & Orchestration</div>
            <div className="text-[11px] text-slate-400 space-y-1 text-left font-sans">
              <div>• Alert Normalizer</div>
              <div>• Context Window</div>
              <div>• Reasoning Agent</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-blue-800/80 space-y-2">
            <div className="text-xs font-bold text-blue-400 uppercase">2. Evidence Loop</div>
            <div className="text-[11px] text-slate-400 space-y-1 text-left font-sans">
              <div>• Log Lookup</div>
              <div>• Threat Intelligence</div>
              <div>• Asset Criticality</div>
              <div>• Trust Tiers (1.0 | 0.6 | 0.2)</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-amber-800/80 space-y-2">
            <div className="text-xs font-bold text-amber-400 uppercase">3. Decision Core</div>
            <div className="text-[11px] text-slate-400 space-y-1 text-left font-sans">
              <div>• Weighted Score Math</div>
              <div>• Action Thresholds</div>
              <div>• Simulated Containment</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-emerald-800/80 space-y-2">
            <div className="text-xs font-bold text-emerald-400 uppercase">4. Audit & Evaluation</div>
            <div className="text-[11px] text-slate-400 space-y-1 text-left font-sans">
              <div>• SHA-256 Hash Chain</div>
              <div>• Evaluation Harness</div>
              <div>• EGAR & FP Rate Metrics</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
