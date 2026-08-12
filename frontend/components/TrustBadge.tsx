"use client";

import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

interface TrustBadgeProps {
  tier: "VERIFIED" | "CORROBORATED" | "UNTRUSTED" | string;
  weight?: number;
  showIcon?: boolean;
}

export default function TrustBadge({ tier, weight, showIcon = true }: TrustBadgeProps) {
  const normalizedTier = tier?.toUpperCase() || "CORROBORATED";

  let styles = "bg-emerald-950/60 text-emerald-400 border-emerald-800/80";
  let Icon = ShieldCheck;
  let defaultWeight = 1.0;

  if (normalizedTier === "CORROBORATED") {
    styles = "bg-blue-950/60 text-cyan-400 border-blue-800/80";
    Icon = CheckCircle2;
    defaultWeight = 0.6;
  } else if (normalizedTier === "UNTRUSTED") {
    styles = "bg-amber-950/60 text-amber-400 border-amber-800/80";
    Icon = AlertTriangle;
    defaultWeight = 0.2;
  }

  const displayWeight = weight !== undefined ? weight : defaultWeight;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-semibold ${styles}`}>
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      <span>{normalizedTier}</span>
      <span className="opacity-70 text-[10px] ml-0.5 border-l border-current/30 pl-1.5">
        Weight: {displayWeight.toFixed(1)}
      </span>
    </span>
  );
}
