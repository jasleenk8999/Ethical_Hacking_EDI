"use client";

import { ShieldCheck, Radio, X, Lock, Server, Globe } from "lucide-react";

interface ActionSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionDetails?: any;
}

export default function ActionSimulationModal({ isOpen, onClose, actionDetails }: ActionSimulationModalProps) {
  if (!isOpen) return null;

  const data = actionDetails || {
    target_host: "FIN-SERVER-01",
    blocked_ip: "192.168.10.45",
    containment_type: "Host Isolation & Ingress Firewall Block",
    safety_banner: "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl shadow-cyan-950/50 relative animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-3 rounded-xl bg-amber-950 text-amber-400 border border-amber-800">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">Simulated Action Triggered</h3>
            <p className="text-xs text-slate-400 font-sans">Controlled Evidence-Gated Containment Simulation</p>
          </div>
        </div>

        {/* Safety Banner */}
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-300 text-xs font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{data.safety_banner || "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED"}</span>
        </div>

        {/* Action Details */}
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Target Host:</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-cyan-500" />
                {data.target_host}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Source IP Block:</span>
              <span className="text-rose-300 font-bold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-rose-500" />
                {data.blocked_ip}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Containment Type:</span>
              <span className="text-amber-300 font-semibold">{data.containment_type}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Execution Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                SUCCESS (SIMULATED)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-950 transition-all"
        >
          Acknowledge Simulation
        </button>
      </div>
    </div>
  );
}
