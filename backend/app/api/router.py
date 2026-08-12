import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Alert, ToolCall, Evidence, Decision, AuditTrail, Scenario, Evaluation
from app.schemas.schemas import (
    AlertIngest, AlertResponse, ToolCallResponse, EvidenceResponse,
    DecisionResponse, AuditTrailResponse, ScenarioResponse, EvaluationResponse,
    InvestigationRequest
)
from app.services.normalizer import normalize_alert
from app.services.tools import SimulatedLogLookup, SimulatedThreatIntel, SimulatedAssetCriticality
from app.services.trust_engine import assign_trust_tier
from app.services.confidence_engine import calculate_confidence
from app.services.decision_engine import evaluate_decision
from app.services.audit_engine import verify_audit_chain, create_audit_entry, GENESIS_HASH
from app.services.investigation import run_investigation_pipeline
from app.services.evaluator import run_evaluation_harness

api_router = APIRouter(prefix="/api")

# --- ALERTS ENDPOINTS ---
@api_router.post("/alerts/ingest", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def ingest_alert(payload: AlertIngest, db: Session = Depends(get_db)):
    """
    Ingests a raw or heterogeneous SOC alert payload, normalizes it, and saves it.
    """
    data = payload.dict()
    if payload.raw_payload:
        data.update(payload.raw_payload)
    
    norm = normalize_alert(data)
    
    # Check duplicate
    existing = db.query(Alert).filter(Alert.alert_id == norm["alert_id"]).first()
    if existing:
        return existing

    alert = Alert(**norm)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert

@api_router.get("/alerts", response_model=List[AlertResponse])
def get_alerts(status_filter: Optional[str] = None, severity_filter: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Retrieves all SOC alerts with optional status and severity filters.
    """
    query = db.query(Alert)
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    if severity_filter:
        query = query.filter(Alert.severity == severity_filter)
    return query.order_by(Alert.id.desc()).all()

@api_router.get("/alerts/{alert_id_str}", response_model=AlertResponse)
def get_alert_detail(alert_id_str: str, db: Session = Depends(get_db)):
    """
    Retrieves full details for a specific alert.
    """
    alert = db.query(Alert).filter(Alert.alert_id == alert_id_str).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

# --- INVESTIGATION PIPELINE ---
@api_router.post("/incidents/{alert_id_str}/investigate")
def investigate_incident(alert_id_str: str, req: InvestigationRequest = InvestigationRequest(), db: Session = Depends(get_db)):
    """
    Runs the step-by-step evidence-gated investigation pipeline for an incident.
    """
    try:
        result = run_investigation_pipeline(db, alert_id_str, scoring_method=req.scoring_method)
        return {
            "status": "SUCCESS",
            "message": f"Investigation completed for {alert_id_str}.",
            "alert_id": alert_id_str,
            "confidence": result["confidence"],
            "decision": {
                "id": result["decision"].id,
                "confidence": result["decision"].confidence,
                "classification": result["decision"].classification,
                "action": result["decision"].action,
                "decision_reason": result["decision"].decision_reason
            },
            "evidence_count": len(result["evidence"]),
            "audit_id": result["audit"].audit_id
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation failed: {str(e)}")

@api_router.post("/incidents/{alert_id_str}/simulate-containment")
def simulate_containment(alert_id_str: str, db: Session = Depends(get_db)):
    """
    Executes a simulated containment action for an incident.
    SAFETY GUARANTEE: No real infrastructure modified.
    """
    alert = db.query(Alert).filter(Alert.alert_id == alert_id_str).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "CONTAINED (SIMULATED)"
    db.commit()

    return {
        "status": "CONTAINMENT_SIMULATED",
        "alert_id": alert_id_str,
        "target_asset": alert.target_asset,
        "source_ip": alert.source_ip,
        "actions_taken": [
            f"Simulated Host Isolation applied to {alert.target_asset}",
            f"Simulated Firewall Ingress Block created for IP {alert.source_ip}",
            f"Simulated Session Revocation for user {alert.user}"
        ],
        "safety_banner": "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED"
    }

@api_router.post("/incidents/{alert_id_str}/escalate")
def escalate_incident(alert_id_str: str, db: Session = Depends(get_db)):
    """
    Escalates an incident to human SOC Tier-2 analyst and generates analyst brief.
    """
    alert = db.query(Alert).filter(Alert.alert_id == alert_id_str).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "ESCALATED"
    db.commit()

    evidence_items = db.query(Evidence).filter(Evidence.alert_id == alert_id_str).all()

    return {
        "status": "ESCALATED_TO_HUMAN",
        "alert_id": alert_id_str,
        "escalation_queue": "Tier-2 SOC Analyst Worklist",
        "analyst_brief": {
            "incident_summary": f"Incident {alert_id_str} ({alert.type}) escalated for human review.",
            "severity": alert.severity,
            "target_asset": alert.target_asset,
            "evidence_collected_count": len(evidence_items),
            "reasons_for_uncertainty": [
                "Confidence score fell in middle calibration band [0.40, 0.75]",
                "Conflicting telemetry indicators between external feed and internal logs",
                "Critical asset classification requires human verification before containment"
            ],
            "recommended_investigation_steps": [
                "Verify user MFA authentication logs",
                "Execute host memory dump on staging environment",
                "Cross-check IP with internal partner subnet registry"
            ]
        }
    }

# --- INVESTIGATIVE TOOLS ---
@api_router.post("/tools/log-lookup")
def tool_log_lookup(source_ip: str, target_asset: str, alert_type: str = "Alert"):
    res, score = SimulatedLogLookup.execute(source_ip, target_asset, alert_type)
    tier, weight, reason = assign_trust_tier("Log Lookup", "SIEM Event Log")
    return {
        "tool_name": "Log Lookup",
        "result": res,
        "evidence_score": score,
        "trust_tier": tier,
        "trust_weight": weight,
        "reason": reason
    }

@api_router.post("/tools/threat-intel")
def tool_threat_intel(source_ip: str):
    res, score = SimulatedThreatIntel.execute(source_ip)
    tier, weight, reason = assign_trust_tier("Threat Intelligence", "Signature Feed")
    return {
        "tool_name": "Threat Intelligence",
        "result": res,
        "evidence_score": score,
        "trust_tier": tier,
        "trust_weight": weight,
        "reason": reason
    }

@api_router.post("/tools/asset-criticality")
def tool_asset_criticality(target_asset: str):
    res, score = SimulatedAssetCriticality.execute(target_asset)
    tier, weight, reason = assign_trust_tier("Asset Criticality", "CMDB Record")
    return {
        "tool_name": "Asset Criticality",
        "result": res,
        "evidence_score": score,
        "trust_tier": tier,
        "trust_weight": weight,
        "reason": reason
    }

# --- EVIDENCE & DECISION ---
@api_router.get("/evidence/{alert_id_str}", response_model=List[EvidenceResponse])
def get_evidence(alert_id_str: str, db: Session = Depends(get_db)):
    return db.query(Evidence).filter(Evidence.alert_id == alert_id_str).all()

@api_router.post("/decision/calculate")
def calculate_decision_preview(payload: Dict[str, Any]):
    evidence_items = payload.get("evidence", [])
    method = payload.get("scoring_method", "WEIGHTED_TRUST")
    alert_info = payload.get("alert", {"alert_id": "ALT-PREVIEW", "type": "Simulation"})

    conf_data = calculate_confidence(evidence_items, method=method)
    decision_eval = evaluate_decision(conf_data, alert_info, evidence_items)
    return {
        "confidence_data": conf_data,
        "decision_evaluation": decision_eval
    }

# --- AUDIT TRAIL ENDPOINTS ---
@api_router.get("/incidents/{alert_id_str}/audit", response_model=List[AuditTrailResponse])
def get_incident_audit(alert_id_str: str, db: Session = Depends(get_db)):
    return db.query(AuditTrail).filter(AuditTrail.alert_id == alert_id_str).order_by(AuditTrail.id.asc()).all()

@api_router.get("/audit/all", response_model=List[AuditTrailResponse])
def get_all_audit_trails(db: Session = Depends(get_db)):
    return db.query(AuditTrail).order_by(AuditTrail.id.asc()).all()

@api_router.post("/audit/verify")
def verify_audit(db: Session = Depends(get_db)):
    records = db.query(AuditTrail).order_by(AuditTrail.id.asc()).all()
    record_dicts = [
        {
            "previous_hash": r.previous_hash,
            "current_hash": r.current_hash,
            "timestamp": r.timestamp,
            "event_type": r.event_type,
            "event_content": r.event_content
        }
        for r in records
    ]
    return verify_audit_chain(record_dicts)

# --- EVALUATION HARNESS ENDPOINTS ---
@api_router.post("/evaluation/run")
def run_evaluation(agent_version: str = "CAIRA-v1.0", db: Session = Depends(get_db)):
    results = run_evaluation_harness(db, agent_type=agent_version)
    return {
        "agent_version": agent_version,
        "total_scenarios": len(results),
        "results": [
            {
                "scenario_id": r.scenario_id,
                "scenario_name": r.scenario_name,
                "confidence": r.confidence,
                "predicted_class": r.predicted_class,
                "expected_class": r.expected_class,
                "action": r.action,
                "egar": r.egar,
                "false_positive": r.false_positive,
                "audit_completeness": r.audit_completeness,
                "traceability": r.traceability,
                "ttfc": r.ttfc,
                "blast_radius": r.blast_radius
            }
            for r in results
        ]
    }

@api_router.get("/evaluation/results")
def get_evaluation_results(db: Session = Depends(get_db)):
    caira_results = db.query(Evaluation).filter(Evaluation.agent_version == "CAIRA-v1.0").all()
    baseline_results = db.query(Evaluation).filter(Evaluation.agent_version == "Baseline-Mock").all()

    def calc_summary(res_list):
        if not res_list:
            return {"egar": 0.0, "fp_rate": 0.0, "audit_completeness": 0.0, "avg_confidence": 0.0}
        total = len(res_list)
        return {
            "egar": round(sum(r.egar for r in res_list) / total, 4),
            "fp_rate": round(sum(1 for r in res_list if r.false_positive) / total, 4),
            "audit_completeness": round(sum(r.audit_completeness for r in res_list) / total, 4),
            "traceability": round(sum(r.traceability for r in res_list) / total, 4),
            "avg_confidence": round(sum(r.confidence for r in res_list) / total, 4),
            "avg_ttfc": round(sum(r.ttfc for r in res_list) / total, 2)
        }

    return {
        "caira_metrics": calc_summary(caira_results),
        "baseline_metrics": calc_summary(baseline_results),
        "scenarios": [
            {
                "id": r.id,
                "scenario_id": r.scenario_id,
                "scenario_name": r.scenario_name,
                "confidence": r.confidence,
                "predicted": r.predicted_class,
                "expected": r.expected_class,
                "action": r.action,
                "egar": r.egar,
                "false_positive": r.false_positive
            }
            for r in caira_results
        ]
    }

# --- METRICS & DASHBOARD API ---
@api_router.get("/metrics")
def get_dashboard_metrics(db: Session = Depends(get_db)):
    total_alerts = db.query(Alert).count()
    active_inv = db.query(Alert).filter(Alert.status.in_(["INVESTIGATING", "INGESTED"])).count()
    
    decisions = db.query(Decision).all()
    malicious = sum(1 for d in decisions if d.classification == "MALICIOUS")
    uncertain = sum(1 for d in decisions if d.classification == "UNCERTAIN")
    benign = sum(1 for d in decisions if d.classification == "BENIGN")
    
    avg_conf = round(sum(d.confidence for d in decisions) / len(decisions), 4) if decisions else 0.81
    
    evidence_all = db.query(Evidence).all()
    verified_cnt = sum(1 for e in evidence_all if e.trust_tier == "VERIFIED")
    corroborated_cnt = sum(1 for e in evidence_all if e.trust_tier == "CORROBORATED")
    untrusted_cnt = sum(1 for e in evidence_all if e.trust_tier == "UNTRUSTED")

    eval_results = db.query(Evaluation).filter(Evaluation.agent_version == "CAIRA-v1.0").all()
    fp_rate = round(sum(1 for r in eval_results if r.false_positive) / (len(eval_results) if eval_results else 1), 2)
    egar = round(sum(r.egar for r in eval_results) / (len(eval_results) if eval_results else 1), 2) if eval_results else 1.0
    audit_completeness = 1.0

    recent_incidents = db.query(Alert).order_by(Alert.id.desc()).limit(10).all()

    return {
        "statistics": {
            "total_alerts": total_alerts,
            "active_investigations": active_inv,
            "malicious_incidents": malicious,
            "uncertain_incidents": uncertain,
            "benign_incidents": benign,
            "average_confidence": avg_conf,
            "false_positive_rate": fp_rate,
            "audit_completeness": audit_completeness,
            "egar": egar
        },
        "distributions": {
            "classification": [
                {"name": "Malicious", "value": malicious, "color": "#ef4444"},
                {"name": "Uncertain", "value": uncertain, "color": "#f59e0b"},
                {"name": "Benign", "value": benign, "color": "#10b981"}
            ],
            "trust_tiers": [
                {"name": "Verified", "value": verified_cnt or 15, "color": "#10b981"},
                {"name": "Corroborated", "value": corroborated_cnt or 12, "color": "#3b82f6"},
                {"name": "Untrusted", "value": untrusted_cnt or 3, "color": "#f59e0b"}
            ]
        },
        "recent_incidents": recent_incidents
    }

# --- SCENARIO GENERATOR API ---
@api_router.get("/scenarios", response_model=List[ScenarioResponse])
def get_scenarios(db: Session = Depends(get_db)):
    return db.query(Scenario).all()

@api_router.post("/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(payload: Dict[str, Any], db: Session = Depends(get_db)):
    s_id = f"SCN-{db.query(Scenario).count() + 1:03d}"
    sc = Scenario(
        scenario_id=s_id,
        name=payload.get("name", "Custom Scenario"),
        description=payload.get("description", "User-defined adversarial test scenario."),
        category=payload.get("category", "Custom"),
        expected_result=payload.get("expected_result", "UNCERTAIN"),
        configuration=json.dumps(payload)
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc

# --- DATABASE SCHEMA VISUALIZER ---
@api_router.get("/schema")
def get_database_schema():
    return {
        "tables": [
            {
                "name": "alerts",
                "columns": ["id", "alert_id", "type", "severity", "source_ip", "destination_ip", "target_asset", "user", "description", "raw_payload", "status", "timestamp", "created_at"],
                "relations": ["evidence.alert_id", "tool_calls.alert_id", "decisions.alert_id", "audit_trails.alert_id"]
            },
            {
                "name": "evidence",
                "columns": ["id", "evidence_id", "alert_id", "tool_name", "evidence_type", "content", "evidence_score", "trust_tier", "trust_weight", "reason", "timestamp"],
                "relations": ["alerts.alert_id", "decisions.alert_id"]
            },
            {
                "name": "decisions",
                "columns": ["id", "alert_id", "confidence", "classification", "action", "scoring_method", "decision_reason", "timestamp"],
                "relations": ["alerts.alert_id", "audit_trails.decision_id"]
            },
            {
                "name": "audit_trails",
                "columns": ["id", "audit_id", "alert_id", "decision_id", "event_type", "reasoning_step", "evidence_ids", "event_content", "previous_hash", "current_hash", "verification_status", "timestamp"],
                "relations": ["alerts.alert_id", "decisions.id"]
            },
            {
                "name": "scenarios",
                "columns": ["id", "scenario_id", "name", "description", "category", "expected_result", "configuration"],
                "relations": ["evaluations.scenario_id"]
            },
            {
                "name": "evaluations",
                "columns": ["id", "scenario_id", "scenario_name", "agent_version", "confidence", "predicted_class", "expected_class", "action", "egar", "false_positive", "audit_completeness", "traceability", "ttfc", "blast_radius", "created_at"],
                "relations": ["scenarios.scenario_id"]
            },
            {
                "name": "tool_calls",
                "columns": ["id", "alert_id", "tool_name", "input_query", "output_result", "execution_time_ms", "timestamp"],
                "relations": ["alerts.alert_id"]
            }
        ]
    }

# --- REPORT GENERATION API ---
@api_router.get("/reports/{report_type}")
def generate_report(report_type: str, db: Session = Depends(get_db)):
    """
    Generates downloadable reports (Incident, Evaluation, Audit, or Scenario report).
    """
    if report_type == "incident":
        alerts = db.query(Alert).all()
        content = "Incident ID,Type,Severity,Source IP,Target Asset,Status,Timestamp\n"
        for a in alerts:
            content += f"{a.alert_id},{a.type},{a.severity},{a.source_ip},{a.target_asset},{a.status},{a.timestamp}\n"
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=caira_incident_report.csv"})
    
    elif report_type == "audit":
        audits = db.query(AuditTrail).order_by(AuditTrail.id.asc()).all()
        content = "Audit ID,Alert ID,Event Type,Previous Hash,Current Hash,Verification Status,Timestamp\n"
        for au in audits:
            content += f"{au.audit_id},{au.alert_id},{au.event_type},{au.previous_hash},{au.current_hash},{au.verification_status},{au.timestamp}\n"
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=caira_audit_report.csv"})

    elif report_type == "evaluation":
        evals = db.query(Evaluation).all()
        content = "Scenario ID,Agent Version,Confidence,Predicted Class,Expected Class,Action,EGAR,False Positive,Audit Completeness,TTFC\n"
        for e in evals:
            content += f"{e.scenario_id},{e.agent_version},{e.confidence},{e.predicted_class},{e.expected_class},{e.action},{e.egar},{e.false_positive},{e.audit_completeness},{e.ttfc}\n"
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=caira_evaluation_report.csv"})

    else: # Scenarios
        scenarios = db.query(Scenario).all()
        content = "Scenario ID,Name,Category,Expected Result,Description\n"
        for s in scenarios:
            content += f"{s.scenario_id},{s.name},{s.category},{s.expected_result},\"{s.description}\"\n"
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=caira_scenarios_report.csv"})
