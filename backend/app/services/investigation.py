import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.domain import Alert, ToolCall, Evidence, Decision, AuditTrail
from app.services.tools import SimulatedLogLookup, SimulatedThreatIntel, SimulatedAssetCriticality
from app.services.trust_engine import assign_trust_tier
from app.services.confidence_engine import calculate_confidence
from app.services.decision_engine import evaluate_decision
from app.services.audit_engine import create_audit_entry, GENESIS_HASH

def run_investigation_pipeline(db: Session, alert_id_str: str, scoring_method: str = "WEIGHTED_TRUST"):
    """
    Executes complete evidence-gated investigation pipeline for a given alert:
    Alert -> Tool Execution -> Evidence Trust -> Aggregation -> Confidence -> Decision -> Audit Chain
    """
    alert = db.query(Alert).filter(Alert.alert_id == alert_id_str).first()
    if not alert:
        raise ValueError(f"Alert {alert_id_str} not found in database.")

    alert.status = "INVESTIGATING"
    db.commit()

    # Step 1: Tool Executions
    # 1. Log Lookup Tool
    log_res, log_score = SimulatedLogLookup.execute(alert.source_ip, alert.target_asset, alert.type)
    t_log = ToolCall(
        alert_id=alert.alert_id,
        tool_name="Log Lookup",
        input_query=f"search logs ip={alert.source_ip} host={alert.target_asset}",
        output_result=str(log_res),
        execution_time_ms=28.5
    )
    db.add(t_log)

    # 2. Threat Intel Tool
    intel_res, intel_score = SimulatedThreatIntel.execute(alert.source_ip)
    t_intel = ToolCall(
        alert_id=alert.alert_id,
        tool_name="Threat Intelligence",
        input_query=f"query reputation ip={alert.source_ip}",
        output_result=str(intel_res),
        execution_time_ms=34.2
    )
    db.add(t_intel)

    # 3. Asset Criticality Tool
    asset_res, asset_score = SimulatedAssetCriticality.execute(alert.target_asset)
    t_asset = ToolCall(
        alert_id=alert.alert_id,
        tool_name="Asset Criticality",
        input_query=f"cmdb lookup asset={alert.target_asset}",
        output_result=str(asset_res),
        execution_time_ms=18.7
    )
    db.add(t_asset)
    db.commit()

    # Step 2: Evidence Trust Tier Annotation
    tier_intel, weight_intel, reason_intel = assign_trust_tier("Threat Intelligence", "Signature Feed")
    tier_log, weight_log, reason_log = assign_trust_tier("Log Lookup", "SIEM Event Log")
    tier_asset, weight_asset, reason_asset = assign_trust_tier("Asset Criticality", "CMDB Record")

    e_intel = Evidence(
        evidence_id=f"EVD-{uuid.uuid4().hex[:6].upper()}",
        alert_id=alert.alert_id,
        tool_name="Threat Intelligence",
        evidence_type="Threat Score / Reputation",
        content=f"IP Reputation: {intel_res['reputation']} (Score {intel_res['threat_score']}/100) | Campaign: {intel_res['known_campaign']}",
        evidence_score=intel_score,
        trust_tier=tier_intel,
        trust_weight=weight_intel,
        reason=reason_intel
    )
    db.add(e_intel)

    e_log = Evidence(
        evidence_id=f"EVD-{uuid.uuid4().hex[:6].upper()}",
        alert_id=alert.alert_id,
        tool_name="Log Lookup",
        evidence_type="SIEM Audit Telemetry",
        content=log_res.get("log_summary", "Security log anomaly recorded."),
        evidence_score=log_score,
        trust_tier=tier_log,
        trust_weight=weight_log,
        reason=reason_log
    )
    db.add(e_log)

    e_asset = Evidence(
        evidence_id=f"EVD-{uuid.uuid4().hex[:6].upper()}",
        alert_id=alert.alert_id,
        tool_name="Asset Criticality",
        evidence_type="CMDB Business Impact",
        content=f"Criticality: {asset_res['criticality_level']} | Dept: {asset_res['department']} | Impact: {asset_res['business_impact']}",
        evidence_score=asset_score,
        trust_tier=tier_asset,
        trust_weight=weight_asset,
        reason=reason_asset
    )
    db.add(e_asset)
    db.commit()

    # Step 3: Confidence Calculation
    evidence_payload = [
        {"evidence_score": e_intel.evidence_score, "trust_weight": e_intel.trust_weight, "trust_tier": e_intel.trust_tier, "tool_name": e_intel.tool_name},
        {"evidence_score": e_log.evidence_score, "trust_weight": e_log.trust_weight, "trust_tier": e_log.trust_tier, "tool_name": e_log.tool_name},
        {"evidence_score": e_asset.evidence_score, "trust_weight": e_asset.trust_weight, "trust_tier": e_asset.trust_tier, "tool_name": e_asset.tool_name}
    ]

    conf_data = calculate_confidence(evidence_payload, method=scoring_method)

    # Step 4: Decision Engine
    alert_dict = {
        "alert_id": alert.alert_id,
        "type": alert.type,
        "source_ip": alert.source_ip,
        "target_asset": alert.target_asset
    }
    decision_eval = evaluate_decision(conf_data, alert_dict, evidence_payload)

    decision = Decision(
        alert_id=alert.alert_id,
        confidence=decision_eval["confidence"],
        classification=decision_eval["classification"],
        action=decision_eval["action"],
        scoring_method=scoring_method,
        decision_reason=decision_eval["decision_reason"]
    )
    db.add(decision)

    # Update alert status
    if decision_eval["classification"] == "MALICIOUS":
        alert.status = "CONTAINED (SIMULATED)"
    elif decision_eval["classification"] == "UNCERTAIN":
        alert.status = "ESCALATED"
    else:
        alert.status = "CLOSED (BENIGN)"
    db.commit()

    # Step 5: Audit Trail Hash Chain Recording
    # Fetch last audit record hash to maintain cryptographic chain
    last_audit = db.query(AuditTrail).order_by(AuditTrail.id.desc()).first()
    prev_hash = last_audit.current_hash if last_audit else GENESIS_HASH

    reasoning_step = {
        "step": "Evidence Aggregation & Calibrated Threshold Decision",
        "evidence_ids": [e_intel.evidence_id, e_log.evidence_id, e_asset.evidence_id],
        "confidence_calculated": conf_data["confidence"],
        "classification": decision_eval["classification"],
        "action_taken": decision_eval["action"],
        "safety_guard": "SIMULATION MODE ACTIVE"
    }

    event_content = f"Incident {alert.alert_id} investigated. Confidence={conf_data['confidence']}. Class={decision_eval['classification']}. Action={decision_eval['action']}."

    audit_payload = create_audit_entry(
        previous_hash=prev_hash,
        alert_id=alert.alert_id,
        decision_id=decision.id,
        event_type="INCIDENT_INVESTIGATION_COMPLETED",
        reasoning_step=reasoning_step,
        evidence_ids=[e_intel.evidence_id, e_log.evidence_id, e_asset.evidence_id],
        event_content=event_content
    )

    audit_record = AuditTrail(**audit_payload)
    db.add(audit_record)
    db.commit()

    return {
        "alert": alert,
        "tool_calls": [t_log, t_intel, t_asset],
        "evidence": [e_intel, e_log, e_asset],
        "confidence": conf_data,
        "decision": decision,
        "audit": audit_record
    }
