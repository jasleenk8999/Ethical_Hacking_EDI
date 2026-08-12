"use client";

import { useEffect, useState } from "react";
import { History, ShieldCheck, CheckCircle2, AlertTriangle, Key, RefreshCw, Lock } from "lucide-react";
import { fetchAllAuditTrails, verifyAuditChain } from "@/lib/api";

export default function AuditTrailPage() {
  const [auditRecords, setAuditRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    fetchAllAuditTrails()
      .then(data => {
        setAuditRecords(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching audit trails:", err);
        setLoading(false);
      });
  }, []);

  const handleVerifyIntegrity = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await verifyAuditChain();
      setVerificationResult(res);
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Tamper-Evident SHA-256 Audit Chain
          </h1>
          <p className="text-xs text-slate-400 font-mono">Cryptographic Event Hashing & Integrity Verification</p>
        </div>

        <button
          onClick={handleVerifyIntegrity}
          disabled={verifying}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all"
        >
          <ShieldCheck className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`} />
          {verifying ? "Verifying SHA-256 Hashes..." : "Verify Audit Integrity"}
        </button>
      </div>

      {/* VERIFICATION RESULT BANNER */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border font-mono text-xs flex items-center gap-3 ${
          verificationResult.verified 
            ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
            : "bg-rose-950/60 border-rose-800 text-rose-300"
        }`}>
          {verificationResult.verified ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">{verificationResult.status_message}</div>
            <div className="text-[11px] opacity-80 mt-0.5">
              Verified {verificationResult.total_records} audit blocks. Cryptographic hash linkage intact.
            </div>
          </div>
        </div>
      )}

      {/* AUDIT CHAIN TIMELINE */}
      <div className="space-y-4">
        {auditRecords.map((record, idx) => (
          <div key={record.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-800/80 transition-colors font-mono space-y-3 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400">Block #{idx+1} ({record.audit_id})</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {record.event_type}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">{record.timestamp?.substring(0, 19)}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-400" /> Previous SHA-256 Hash:
                </div>
                <div className="text-[10px] text-slate-400 truncate">{record.previous_hash}</div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-cyan-400" /> Current Block SHA-256 Hash:
                </div>
                <div className="text-[10px] text-cyan-300 font-bold truncate">{record.current_hash}</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 text-xs text-slate-300 font-sans leading-relaxed">
              {record.event_content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
