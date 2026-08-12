"use client";

import { FileText, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { getReportDownloadUrl } from "@/lib/api";

const REPORTS = [
  {
    type: "incident",
    title: "SOC Incident Investigation Report",
    desc: "Export summary of all ingested alerts, tool lookups, confidence scores, classifications, and actions taken.",
    icon: FileText
  },
  {
    type: "evaluation",
    title: "Adversarial Evaluation Report",
    desc: "Export evaluation benchmark scores, EGAR metrics, false positive rates, TTFC speeds, and baseline agent comparisons.",
    icon: FileSpreadsheet
  },
  {
    type: "audit",
    title: "Tamper-Evident SHA-256 Audit Report",
    desc: "Export complete cryptographic hash chain audit records, block IDs, previous hashes, current hashes, and integrity status.",
    icon: FileText
  },
  {
    type: "scenarios",
    title: "Test Scenario Configuration Report",
    desc: "Export list of predefined and custom adversarial test scenarios with expected classification benchmarks.",
    icon: FileSpreadsheet
  }
];

export default function ReportsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Report Generation & Research Exports
          </h1>
          <p className="text-xs text-slate-400 font-mono">Download Formatted Incident, Audit, and Evaluation Reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map(rep => {
          const Icon = rep.icon;
          return (
            <div key={rep.type} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{rep.title}</h3>
                  <span className="text-[10px] text-slate-500 uppercase">CSV / Data Export</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">{rep.desc}</p>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={getReportDownloadUrl(rep.type)}
                  download
                  className="w-full py-2.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Download className="w-4 h-4 text-cyan-400" /> Download {rep.type.toUpperCase()} Report (CSV)
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
