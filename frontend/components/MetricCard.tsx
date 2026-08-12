"use client";

import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "cyan" | "emerald" | "amber" | "rose" | "indigo" | "purple";
  badge?: string;
}

export default function MetricCard({ title, value, subtitle, icon: Icon, color = "cyan", badge }: MetricCardProps) {
  const colorMap = {
    cyan: {
      border: "border-cyan-800/50 hover:border-cyan-700",
      bg: "bg-cyan-950/20",
      iconBg: "bg-cyan-950 text-cyan-400 border-cyan-800/80",
      text: "text-cyan-400",
    },
    emerald: {
      border: "border-emerald-800/50 hover:border-emerald-700",
      bg: "bg-emerald-950/20",
      iconBg: "bg-emerald-950 text-emerald-400 border-emerald-800/80",
      text: "text-emerald-400",
    },
    amber: {
      border: "border-amber-800/50 hover:border-amber-700",
      bg: "bg-amber-950/20",
      iconBg: "bg-amber-950 text-amber-400 border-amber-800/80",
      text: "text-amber-400",
    },
    rose: {
      border: "border-rose-800/50 hover:border-rose-700",
      bg: "bg-rose-950/20",
      iconBg: "bg-rose-950 text-rose-400 border-rose-800/80",
      text: "text-rose-400",
    },
    indigo: {
      border: "border-indigo-800/50 hover:border-indigo-700",
      bg: "bg-indigo-950/20",
      iconBg: "bg-indigo-950 text-indigo-400 border-indigo-800/80",
      text: "text-indigo-400",
    },
    purple: {
      border: "border-purple-800/50 hover:border-purple-700",
      bg: "bg-purple-950/20",
      iconBg: "bg-purple-950 text-purple-400 border-purple-800/80",
      text: "text-purple-400",
    },
  };

  const theme = colorMap[color];

  return (
    <div className={`p-4 rounded-xl bg-slate-900/70 border ${theme.border} transition-all duration-200 shadow-sm relative overflow-hidden group`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border text-sm font-semibold ${theme.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-100 font-mono tracking-tight">{value}</div>
        {badge && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.bg} ${theme.text} border-current/30`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-sans">{subtitle}</p>}

      {/* Decorative gradient glow on hover */}
      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-300" />
    </div>
  );
}
