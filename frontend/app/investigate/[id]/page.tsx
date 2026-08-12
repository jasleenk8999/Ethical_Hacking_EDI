"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldAlert, 
  Terminal, 
  Layers, 
  BrainCircuit, 
  SlidersHorizontal, 
  History, 
  Play, 
  CheckCircle2, 
  Radio, 
  AlertTriangle, 
  Lock,
  ArrowRight,
  ShieldCheck
} from "lucide-react";
import { fetchAlertDetail, runInvestigation, simulateContainment, escalateIncident } from "@/lib/api";
import TrustBadge from "@/components/TrustBadge";
import ConfidenceGauge from "@/components/ConfidenceGauge";
import EvidenceGraph from "@/components/EvidenceGraph";
import ActionSimulationModal from "@/components/ActionSimulationModal";

const PIPELINE_STEPS = [
  "Alert Ingested",
  "Normalized",
  "Investigation Started",
  "Evidence Collection",
  "Trust Assignment",
  "Evidence Aggregation",
  "Confidence Calculation",
  "Decision",
  "Action",
  "Audit Logged"
];

export default function IncidentInvestigationPage() {
  const params = useParams();
  const alertId = params.id as string;
  const router = useRouter();

  const [alert, setAlert] = useState<any>(null);
  const [investigationData, setInvestigationData] = useState<any>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetails, setModalDetails] = useState<any>(null);

  useEffect(() => {
    if (alertId) {
      fetchAlertDetail(alertId)
        .then(data => setAlert(data))
        .catch(err => console.error("Error loading alert:", err));
    }
  }, [alertId]);

  const handleStartInvestigation = async () => {
    setIsRunning(true);
    setActiveStepIndex(0);

    // Simulate animated step-by-step progress
    for (let i = 1; i <= PIPELINE_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 250));
      setActiveStepIndex(i - 1);
    }

    try {
      const res = await runInvestigation(alertId);
      setInvestigationData(res);
      // Reload alert to update status
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
      
      if (res.decision?.action?.includes("SIMULATED")) {
        setModalDetails({
          target_host: updatedAlert.target_asset,
          blocked_ip: updatedAlert.source_ip,
          containment_type: res.decision.action,
          safety_banner: "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED"
        });
        setModalOpen(true);
      }
    } catch (err) {
      console.error("Investigation failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleManualContainment = async () => {
    try {
      const res = await simulateContainment(alertId);
      setModalDetails({
        target_host: alert.target_asset,
        blocked_ip: alert.source_ip,
        containment_type: "Host Isolation & IP Block",
        safety_banner: res.safety_banner
      });
      setModalOpen(true);
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
    } catch (err) {
      console.error("Simulated containment error:", err);
    }
  };

  const handleManualEscalation = async () => {
    try {
      await escalateIncident(alertId);
      const updatedAlert = await fetchAlertDetail(alertId);
      setAlert(updatedAlert);
    } catch (err) {
      console.error("Escalation error:", err);
    }
  };

  if (!alert) {
    return (
      <div className="flex items-center justify-center h-96 font-mono text-cyan-400">
        Loading Incident Telemetry for {alertId}...
      </div>
    );
  }

  const decision = investigationData?.decision || {
    confidence: alert.status === "CONTAINED (SIMULATED)" ? 0.84 : 0.0,
    classification: alert.status === "CONTAINED (SIMULATED)" ? "MALICIOUS" : alert.status === "ESCALATED" ? "UNCERTAIN" : "PENDING",
    action: alert.status === "CONTAINED (SIMULATED)" ? "SIMULATED HOST ISOLATION" : alert.status === "ESCALATED" ? "ESCALATE TO HUMAN ANALYST" : "AWAITING INVESTIGATION",
    decision_reason: "Evidence-gated pipeline awaiting execution or completed."
  };

  return (
    <div className="space-y-6 font-sans text-slate-200">
      <ActionSimulationModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        actionDetails={modalDetails} 
      />

      {/* INCIDENT HEADER CARD */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-cyan-400">{alert.alert_id}</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                alert.severity === "CRITICAL" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                alert.severity === "HIGH" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                "bg-blue-950 text-cyan-400 border border-blue-800"
              }`}>
                {alert.severity}
              </span>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                Status: {alert.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1">{alert.type}</h1>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{alert.description}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartInvestigation}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-950 transition-all"
            >
              <Play className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Running Investigation..." : "Start Investigation"}
            </button>
            <button
              onClick={handleManualContainment}
              className="px-4 py-2.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs font-mono flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" /> Sim Contain
            </button>
            <button
              onClick={handleManualEscalation}
              className="px-4 py-2.5 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 font-bold text-xs font-mono flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Escalate
            </button>
          </div>
        </div>

        {/* METADATA STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono pt-3 border-t border-slate-800">
          <div><span className="text-slate-500">Source IP:</span> <span className="text-cyan-300 font-bold">{alert.source_ip}</span></div>
          <div><span className="text-slate-500">Target Asset:</span> <span className="text-cyan-300 font-bold">{alert.target_asset}</span></div>
          <div><span className="text-slate-500">User Context:</span> <span className="text-slate-200">{alert.user}</span></div>
          <div><span className="text-slate-500">Timestamp:</span> <span className="text-slate-400">{alert.timestamp?.substring(0, 19)}</span></div>
        </div>
      </div>

      {/* VISUAL INVESTIGATION PIPELINE */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2 font-mono">
            <Radio className="w-4 h-4 text-cyan-400" />
            Evidence-Gated Investigation Pipeline
          </h3>
          <span className="text-xs text-slate-400 font-mono">10 Automated Verification Stages</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 font-mono text-[11px]">
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = activeStepIndex >= idx || investigationData;
            const isActive = activeStepIndex === idx && isRunning;
            return (
              <div 
                key={step} 
                className={`p-2.5 rounded-lg border text-center transition-all duration-200 ${
                  isDone 
                    ? "bg-cyan-950/60 border-cyan-800 text-cyan-300 shadow-sm shadow-cyan-950"
                    : isActive
                    ? "bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse"
                    : "bg-slate-950 border-slate-800 text-slate-500"
                }`}
              >
                <div className="text-[9px] font-bold opacity-60 mb-0.5">0{idx+1}</div>
                <div className="font-semibold leading-tight text-[10px]">{step}</div>
                {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto mt-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* INVESTIGATIVE TOOLS & EVIDENCE RESULTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tool 1: Log Lookup */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Tool 1: Log Lookup
            </span>
            <span className="text-[10px] text-slate-500">28.5 ms</span>
          </div>
          <p className="text-xs text-slate-300 font-sans">
            Searched SIEM archives for IP {alert.source_ip} on host {alert.target_asset}.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-sans">
            Detected 27 consecutive failed SSH authentication attempts within 5 minutes.
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Trust Level:</span>
            <TrustBadge tier="CORROBORATED" weight={0.6} />
          </div>
        </div>

        {/* Tool 2: Threat Intelligence */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Tool 2: Threat Intelligence
            </span>
            <span className="text-[10px] text-slate-500">34.2 ms</span>
          </div>
          <p className="text-xs text-slate-300 font-sans">
            Queried global threat intelligence database for {alert.source_ip}.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-sans">
            Reputation: Malicious (Score 92/100) | Known Campaign: Credential Stuffing & APT-41.
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Trust Level:</span>
            <TrustBadge tier="VERIFIED" weight={1.0} />
          </div>
        </div>

        {/* Tool 3: Asset Criticality */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-cyan-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" /> Tool 3: Asset Criticality
            </span>
            <span className="text-[10px] text-slate-500">18.7 ms</span>
          </div>
          <p className="text-xs text-slate-300 font-sans">
            Retrieved CMDB asset metadata for {alert.target_asset}.
          </p>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-sans">
            Department: Finance & Billing | Criticality: Critical | Impact: Very High (PCI-DSS).
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Trust Level:</span>
            <TrustBadge tier="CORROBORATED" weight={0.6} />
          </div>
        </div>
      </div>

      {/* CONFIDENCE & DECISION SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConfidenceGauge confidence={decision.confidence} classification={decision.classification} />

        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-xs text-slate-300 uppercase tracking-wider">Structured Decision Rationale</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              SIMULATION MODE
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div><span className="text-slate-500">Classification:</span> <span className="font-bold text-rose-400">{decision.classification}</span></div>
            <div><span className="text-slate-500">Action:</span> <span className="font-bold text-slate-100">{decision.action}</span></div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-sans">
              {decision.decision_reason}
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE EVIDENCE GRAPH */}
      <EvidenceGraph 
        alertId={alert.alert_id} 
        alertType={alert.type} 
        confidence={decision.confidence}
        decision={decision}
      />
    </div>
  );
}
