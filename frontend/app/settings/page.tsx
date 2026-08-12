"use client";

import { useState } from "react";
import { Settings, ShieldCheck, Key, Radio, Save, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [provider, setProvider] = useState("Deterministic Mock Reasoning Engine");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            CAIRA System Settings & Model Configuration
          </h1>
          <p className="text-xs text-slate-400 font-mono">Agent Reasoning Engine, LLM Integrations & Safety Locks</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-6 font-mono">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Reasoning Engine Provider</h3>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-cyan-800/80 cursor-pointer">
              <input 
                type="radio" 
                name="provider" 
                value="Deterministic Mock Reasoning Engine" 
                checked={provider === "Deterministic Mock Reasoning Engine"} 
                onChange={(e) => setProvider(e.target.value)}
                className="accent-cyan-400"
              />
              <div>
                <div className="font-bold text-cyan-300">Deterministic Mock Reasoning Engine (Zero API Key Needed)</div>
                <div className="text-[11px] text-slate-400 font-sans">Default offline research engine. Fully functional out-of-the-box.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer opacity-80">
              <input 
                type="radio" 
                name="provider" 
                value="OpenAI gpt-4o / Local LLM Adapter" 
                checked={provider === "OpenAI gpt-4o / Local LLM Adapter"} 
                onChange={(e) => setProvider(e.target.value)}
                className="accent-cyan-400"
              />
              <div>
                <div className="font-bold text-slate-200">OpenAI / Anthropic / Ollama Local LLM Adapter</div>
                <div className="text-[11px] text-slate-400 font-sans">Modular adapter structure for connecting external LLM APIs.</div>
              </div>
            </label>
          </div>

          {provider.includes("OpenAI") && (
            <div className="pt-2">
              <label className="text-xs text-slate-400">API Key (Optional):</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="sk-..." 
                className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 outline-none mt-1 text-xs"
              />
            </div>
          )}
        </div>

        {/* SAFETIES SECTION */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Safety & Containment Policy</h3>
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs font-bold text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>SIMULATION MODE SAFETY LOCK ACTIVE</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900 text-amber-200">ENFORCED</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> Save System Settings
        </button>

        {saved && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Settings updated successfully!
          </div>
        )}
      </div>
    </div>
  );
}
