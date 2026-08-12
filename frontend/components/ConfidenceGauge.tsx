"use client";

interface ConfidenceGaugeProps {
  confidence: number; // 0.0 to 1.0
  classification?: string;
  showLabels?: boolean;
}

export default function ConfidenceGauge({ confidence, classification, showLabels = true }: ConfidenceGaugeProps) {
  const scorePct = Math.max(0, Math.min(100, Math.round(confidence * 100)));

  let colorClass = "text-emerald-400 border-emerald-500/50 bg-emerald-950/40";
  let bgGradient = "from-emerald-500 to-teal-400";
  let label = classification || (confidence >= 0.75 ? "MALICIOUS" : confidence >= 0.40 ? "UNCERTAIN" : "BENIGN");

  if (confidence >= 0.75) {
    colorClass = "text-rose-400 border-rose-500/50 bg-rose-950/40";
    bgGradient = "from-amber-500 via-rose-500 to-red-600";
  } else if (confidence >= 0.40) {
    colorClass = "text-amber-400 border-amber-500/50 bg-amber-950/40";
    bgGradient = "from-amber-400 to-orange-500";
  }

  return (
    <div className="w-full bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calibrated Confidence Score</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-100">{confidence.toFixed(2)}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${colorClass}`}>
            {label}
          </span>
        </div>
      </div>

      {/* Threshold Bar Container */}
      <div className="relative pt-2 pb-1">
        {/* Background track with 3 threshold bands */}
        <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex relative">
          <div className="w-[40%] h-full bg-emerald-900/60 border-r border-slate-950" title="Benign Zone (< 0.40)" />
          <div className="w-[35%] h-full bg-amber-900/60 border-r border-slate-950" title="Uncertain Escalation Zone (0.40 - 0.75)" />
          <div className="w-[25%] h-full bg-rose-900/60" title="Malicious Containment Zone (>= 0.75)" />
          
          {/* Active progress fill */}
          <div 
            className={`h-full bg-gradient-to-r ${bgGradient} transition-all duration-500 rounded-full`}
            style={{ width: `${scorePct}%` }}
          />
        </div>

        {/* Current Needle Marker */}
        <div 
          className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center transition-all duration-500"
          style={{ left: `${scorePct}%` }}
        >
          <div className="w-3 h-3 bg-white rounded-full border-2 border-slate-950 shadow-md shadow-cyan-500/50 animate-pulse" />
        </div>
      </div>

      {/* Threshold Labels */}
      {showLabels && (
        <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 font-sans">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>0.00 – 0.39 BENIGN (No Action)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>0.40 – 0.74 UNCERTAIN (Escalate)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>0.75 – 1.00 MALICIOUS (Contain)</span>
          </div>
        </div>
      )}
    </div>
  );
}
