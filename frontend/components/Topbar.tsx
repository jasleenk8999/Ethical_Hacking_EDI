"use client";

import { useState } from "react";
import { ShieldCheck, UserCheck, RefreshCw, Bell, Search, Terminal } from "lucide-react";

export default function Topbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const [role, setRole] = useState("SOC Analyst");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
          {title || "SOC Incident Command Center"}
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-normal">
            Agent Live
          </span>
        </h1>
        {subtitle && <p className="text-xs text-slate-400 font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Role Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-500">Role:</span>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            className="bg-transparent text-slate-200 outline-none cursor-pointer font-sans text-xs"
          >
            <option value="SOC Analyst">SOC Analyst (Tier-1/2)</option>
            <option value="Security Administrator">Security Administrator</option>
            <option value="Researcher">Academic Researcher</option>
          </select>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh SOC Data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        {/* Operational Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-semibold">ENGINE: DETERMINISTIC MOCK / FASTAPI</span>
        </div>
      </div>
    </header>
  );
}
