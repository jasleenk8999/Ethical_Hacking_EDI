"use client";

import { Database, Table, ArrowRightLeft, Key } from "lucide-react";

const TABLES_SCHEMA = [
  {
    name: "alerts",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "alert_id", type: "String (Indexed, Unique)" },
      { name: "type", type: "String" },
      { name: "severity", type: "String (LOW|MEDIUM|HIGH|CRITICAL)" },
      { name: "source_ip", type: "String" },
      { name: "destination_ip", type: "String" },
      { name: "target_asset", type: "String" },
      { name: "status", type: "String (INGESTED|INVESTIGATING|CONTAINED|ESCALATED)" },
      { name: "timestamp", type: "String / ISO8601" }
    ],
    relations: ["evidence.alert_id", "tool_calls.alert_id", "decisions.alert_id", "audit_trails.alert_id"]
  },
  {
    name: "evidence",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "evidence_id", type: "String (Unique)" },
      { name: "alert_id", type: "String (FK -> alerts.alert_id)" },
      { name: "tool_name", type: "String" },
      { name: "evidence_score", type: "Float [0.0 - 1.0]" },
      { name: "trust_tier", type: "String (VERIFIED|CORROBORATED|UNTRUSTED)" },
      { name: "trust_weight", type: "Float (1.0 | 0.6 | 0.2)" },
      { name: "reason", type: "Text" }
    ],
    relations: ["alerts.alert_id"]
  },
  {
    name: "decisions",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "alert_id", type: "String (FK -> alerts.alert_id)" },
      { name: "confidence", type: "Float [0.0 - 1.0]" },
      { name: "classification", type: "String (MALICIOUS|UNCERTAIN|BENIGN)" },
      { name: "action", type: "String" },
      { name: "scoring_method", type: "String (WEIGHTED_TRUST|UNWEIGHTED_AVERAGE)" },
      { name: "decision_reason", type: "Text" }
    ],
    relations: ["alerts.alert_id", "audit_trails.decision_id"]
  },
  {
    name: "audit_trails",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "audit_id", type: "String (Unique)" },
      { name: "alert_id", type: "String (FK -> alerts.alert_id)" },
      { name: "decision_id", type: "Integer (FK -> decisions.id)" },
      { name: "event_type", type: "String" },
      { name: "previous_hash", type: "String (SHA-256 Link)" },
      { name: "current_hash", type: "String (SHA-256 Payload Hash)" },
      { name: "verification_status", type: "String (VALID|TAMPERED)" }
    ],
    relations: ["alerts.alert_id", "decisions.id"]
  },
  {
    name: "scenarios",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "scenario_id", type: "String (Unique)" },
      { name: "name", type: "String" },
      { name: "category", type: "String" },
      { name: "expected_result", type: "String" },
      { name: "configuration", type: "Text (JSON)" }
    ],
    relations: ["evaluations.scenario_id"]
  },
  {
    name: "evaluations",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "scenario_id", type: "String (FK -> scenarios.scenario_id)" },
      { name: "agent_version", type: "String (CAIRA-v1.0 | Baseline-Mock)" },
      { name: "confidence", type: "Float" },
      { name: "predicted_class", type: "String" },
      { name: "egar", type: "Float (1.0 or 0.0)" },
      { name: "false_positive", type: "Boolean" },
      { name: "audit_completeness", type: "Float" },
      { name: "ttfc", type: "Float (seconds)" }
    ],
    relations: ["scenarios.scenario_id"]
  },
  {
    name: "tool_calls",
    pk: "id",
    fields: [
      { name: "id", type: "Integer (PK)" },
      { name: "alert_id", type: "String (FK -> alerts.alert_id)" },
      { name: "tool_name", type: "String (Log Lookup|Threat Intel|Asset Criticality)" },
      { name: "input_query", type: "Text" },
      { name: "execution_time_ms", type: "Float" }
    ],
    relations: ["alerts.alert_id"]
  }
];

export default function DatabaseSchemaViewer() {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="font-bold text-slate-100">CAIRA Relational Database Schema</h3>
            <p className="text-xs text-slate-400 font-mono">SQLAlchemy ORM + SQLite / PostgreSQL Relational Mapping</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-full font-mono">
          7 Core Entities
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TABLES_SCHEMA.map((tbl) => (
          <div key={tbl.name} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-800/80 transition-colors font-mono space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-cyan-300">{tbl.name}</span>
              </div>
              <span className="text-[10px] text-slate-500 uppercase">Table</span>
            </div>

            <div className="space-y-1 text-xs">
              {tbl.fields.map((f, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-slate-900">
                  <div className="flex items-center gap-1.5">
                    {f.name === tbl.pk ? <Key className="w-3 h-3 text-amber-400" /> : <span className="w-3 h-3 text-slate-600 font-bold">•</span>}
                    <span className="text-slate-200 font-medium">{f.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">{f.type}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-900 text-[10px] text-slate-500 flex items-center gap-1">
              <ArrowRightLeft className="w-3 h-3 text-cyan-500" />
              <span>Relations: {tbl.relations.join(", ")}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
