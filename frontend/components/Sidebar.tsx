"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Search, 
  Layers, 
  BrainCircuit, 
  SlidersHorizontal, 
  History, 
  CheckCircle2, 
  FlaskConical, 
  FileText, 
  Settings, 
  Database, 
  Network,
  Radio
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Alert Ingestion", href: "/alerts", icon: ShieldAlert },
  { name: "Evidence Explorer", href: "/evidence", icon: Layers },
  { name: "Agent Reasoning", href: "/reasoning", icon: BrainCircuit },
  { name: "Decision Center", href: "/decisions", icon: SlidersHorizontal },
  { name: "Audit Trail", href: "/audit", icon: History },
  { name: "Evaluation Harness", href: "/evaluation", icon: CheckCircle2 },
  { name: "Scenarios", href: "/scenarios", icon: FlaskConical },
  { name: "System Workflow", href: "/workflow", icon: Network },
  { name: "Database Schema", href: "/schema", icon: Database },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-900/50">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg text-slate-100 tracking-wider">CAIRA</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono tracking-tight">Confidence-Aware SOC Agent</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 font-semibold">
          SOC Investigation Core
        </div>
        {NAV_ITEMS.slice(0, 6).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 shadow-sm shadow-cyan-950"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-3 px-2 py-1.5 text-[10px] uppercase tracking-widest font-mono text-slate-500 font-semibold">
          Research & Evaluation
        </div>
        {NAV_ITEMS.slice(6).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-cyan-950/70 text-cyan-300 border border-cyan-800/80 shadow-sm shadow-cyan-950"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/80"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Safety Guard Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start gap-2">
          <Radio className="w-4 h-4 text-amber-400 shrink-0 animate-pulse mt-0.5" />
          <div>
            <div className="text-[11px] font-bold text-amber-300 tracking-tight uppercase">Simulation Mode</div>
            <p className="text-[10px] text-amber-400/80 leading-tight mt-0.5">
              Actions are strictly simulated. No real network changes.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
