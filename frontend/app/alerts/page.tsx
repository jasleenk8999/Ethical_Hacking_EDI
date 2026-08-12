"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Upload, FileText, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { ingestAlert } from "@/lib/api";

const SAMPLE_JSON = {
  id: "ALT-001",
  type: "Brute Force Attack",
  severity: "HIGH",
  source_ip: "192.168.10.45",
  target_asset: "FIN-SERVER-01",
  timestamp: "2026-08-11T10:30:00Z",
  description: "Multiple failed authentication attempts detected within 5-minute window.",
  user: "admin"
};

export default function AlertIngestionPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_JSON, null, 2));
  const [ingesting, setIngesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successResult, setSuccessResult] = useState<any>(null);

  const handleIngest = async () => {
    setErrorMsg("");
    setSuccessResult(null);
    try {
      setIngesting(true);
      const parsed = JSON.parse(jsonText);
      const res = await ingestAlert(parsed);
      setSuccessResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid JSON payload or ingestion error.");
    } finally {
      setIngesting(false);
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setJsonText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGenerateSample = () => {
    const randomId = `ALT-${Math.floor(100 + Math.random() * 900)}`;
    const sample = {
      id: randomId,
      type: "Suspicious PowerShell Execution",
      severity: "HIGH",
      source_ip: `192.168.10.${Math.floor(Math.random() * 200)}`,
      target_asset: "SEC-AUTH-DC01",
      timestamp: new Date().toISOString(),
      description: "Base64 encoded script execution detected by EDR telemetry.",
      user: "sysadmin_svc"
    };
    setJsonText(JSON.stringify(sample, null, 2));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Heterogeneous Alert Ingestion
          </h1>
          <p className="text-xs text-slate-400 font-mono">Ingest, Normalize, and Register SOC Telemetry</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Editor Column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-300">JSON Payload Editor</span>
            <div className="flex items-center gap-2 text-xs">
              <button 
                onClick={handleGenerateSample}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Generate Sample
              </button>
              <label className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer flex items-center gap-1">
                <Upload className="w-3 h-3 text-cyan-400" /> Upload File
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs outline-none focus:border-cyan-500 transition-colors custom-scrollbar"
            placeholder="Paste raw SOC alert JSON here..."
          />

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
              ✗ Error: {errorMsg}
            </div>
          )}

          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all"
          >
            {ingesting ? "Normalizing & Registering..." : "Normalize & Ingest Alert"}
          </button>
        </div>

        {/* Normalization Standard Fields info */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Normalization Schema</h3>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Heterogeneous alert payloads are normalized into CAIRA&apos;s standard schema:
            </p>
            <div className="space-y-1.5 text-xs text-cyan-400">
              <div>• alert_id</div>
              <div>• alert_type</div>
              <div>• severity (LOW|MED|HIGH|CRIT)</div>
              <div>• source_ip</div>
              <div>• destination_ip</div>
              <div>• target_asset</div>
              <div>• timestamp</div>
              <div>• description</div>
            </div>
          </div>

          {successResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 space-y-3 font-mono">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" /> Alert Ingested & Normalized!
              </div>
              <div className="text-xs text-slate-300">
                <div>ID: <span className="text-cyan-400 font-bold">{successResult.alert_id}</span></div>
                <div>Status: <span className="text-emerald-400">{successResult.status}</span></div>
              </div>
              <button
                onClick={() => router.push(`/investigate/${successResult.alert_id}`)}
                className="w-full py-2 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1"
              >
                Start Investigation Pipeline <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
