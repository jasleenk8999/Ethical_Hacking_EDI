"use client";

import { Network, ArrowRight, RefreshCw, CheckCircle2, ShieldAlert, SlidersHorizontal, History } from "lucide-react";

export default function WorkflowPage() {
  const workflowSteps = [
    { title: "1. Start", desc: "Initialize CAIRA SOC System Configuration" },
    { title: "2. Select Test Scenario", desc: "Pick benchmark or ingest custom alert JSON payload" },
    { title: "3. Normalize Telemetry", desc: "Map heterogeneous SOC fields to standard schema" },
    { title: "4. Tool Investigations", desc: "Execute Log Lookup, Threat Intel, and Asset Criticality" },
    { title: "5. Trust Annotation", desc: "Annotate Verified (1.0), Corroborated (0.6), and Untrusted (0.2)" },
    { title: "6. Confidence Calculation", desc: "Aggregate weighted trust scores into calibrated metric" },
    { title: "7. Threshold Decision", desc: "Check >=0.75 Malicious, 0.40-0.75 Escalation, <0.40 Benign" },
    { title: "8. Controlled Action", desc: "Execute Simulated Host Isolation or Escalation Brief" },
    { title: "9. SHA-256 Audit Log", desc: "Append cryptographic block to tamper-evident audit chain" },
    { title: "10. Scorecard Evaluation", desc: "Calculate EGAR, FP rate, and update benchmark metrics" }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            End-to-End System Workflow Map
          </h1>
          <p className="text-xs text-slate-400 font-mono">Sequential Incident Response Lifecycle & Feedback Loop</p>
        </div>
      </div>

      <div className="space-y-4">
        {workflowSteps.map((step, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-4 font-mono hover:border-cyan-800 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-100">{step.title}</h3>
              <p className="text-xs text-slate-400 font-sans">{step.desc}</p>
            </div>
            {idx < workflowSteps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* FEEDBACK LOOP CONTAINER */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-cyan-800/80 font-mono space-y-3">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> Iterative Research Feedback Loop
        </div>
        <p className="text-xs text-slate-300 font-sans leading-relaxed">
          Review evaluation metrics → If EGAR &lt; 100% or FP Rate &gt; 0% → Adjust trust tier weights or decision thresholds → Select another test scenario → Re-run evaluation harness.
        </p>
      </div>
    </div>
  );
}
