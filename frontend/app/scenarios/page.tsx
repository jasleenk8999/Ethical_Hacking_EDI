"use client";

import { useState } from "react";
import { FlaskConical, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { createScenario } from "@/lib/api";

export default function ScenariosPage() {
  const [name, setName] = useState("Custom Adversarial Injection");
  const [alertType, setAlertType] = useState("Conflicting Telemetry");
  const [severity, setSeverity] = useState("HIGH");
  const [sourceIp, setSourceIp] = useState("192.168.10.99");
  const [targetAsset, setTargetAsset] = useState("FIN-SERVER-01");
  const [expectedResult, setExpectedResult] = useState("UNCERTAIN");
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setSuccess(false);
    try {
      await createScenario({
        name,
        category: "User Custom",
        alert_type: alertType,
        severity,
        source_ip: sourceIp,
        target_asset: targetAsset,
        expected_result: expectedResult,
        description: `Custom test scenario evaluating ${alertType} against ${targetAsset}.`
      });
      setSuccess(true);
    } catch (err) {
      console.error("Scenario creation failed:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            Adversarial Scenario Generator
          </h1>
          <p className="text-xs text-slate-400 font-mono">Create Edge-Case & Adversarial Test Scenarios</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 font-mono">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scenario Generator Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400">Scenario Name:</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 outline-none mt-1" />
          </div>
          <div>
            <label className="text-slate-400">Alert Type:</label>
            <input type="text" value={alertType} onChange={(e) => setAlertType(e.target.value)} className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 outline-none mt-1" />
          </div>
          <div>
            <label className="text-slate-400">Severity:</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 outline-none mt-1">
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
          <div>
            <label className="text-slate-400">Expected Classification:</label>
            <select value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 outline-none mt-1">
              <option value="MALICIOUS">MALICIOUS</option>
              <option value="UNCERTAIN">UNCERTAIN</option>
              <option value="BENIGN">BENIGN</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> {creating ? "Generating Scenario..." : "Generate Test Scenario"}
        </button>

        {success && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Scenario generated and added to evaluation benchmark suite!
          </div>
        )}
      </div>
    </div>
  );
}
