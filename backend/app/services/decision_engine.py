from typing import Dict, Any, List
from app.services.decision_policy import (
    classify_confidence,
    get_action_for_classification,
    get_decision_reason,
    is_containment_authorized
)


def evaluate_decision(confidence_data: Dict[str, Any], alert: Dict[str, Any], evidence_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates evidence confidence against centralized decision thresholds.
    All containment actions are SIMULATED only.
    
    Uses DecisionPolicy for all classification and action logic.
    """
    confidence = confidence_data["confidence"]
    alert_type = alert.get("type", "Alert")
    target_asset = alert.get("target_asset", "Asset")
    source_ip = alert.get("source_ip", "0.0.0.0")

    # Count evidence by trust tier
    verified_count = sum(1 for e in evidence_list if e.get("trust_tier") == "VERIFIED")
    corroborated_count = sum(1 for e in evidence_list if e.get("trust_tier") == "CORROBORATED")
    untrusted_count = sum(1 for e in evidence_list if e.get("trust_tier") == "UNTRUSTED")

    # Use centralized policy for classification
    classification = classify_confidence(confidence)
    action = get_action_for_classification(classification, alert)
    decision_reason = get_decision_reason(classification, confidence, evidence_list)

    # Build simulated containment detail if authorized
    if is_containment_authorized(classification):
        simulated_detail = {
            "containment_type": "Host Isolation & Firewall Rule Ingestion",
            "target_host": target_asset,
            "blocked_ip": source_ip,
            "safety_banner": "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED",
            "execution_status": "SUCCESS (SIMULATED)"
        }
    elif classification == "UNCERTAIN":
        simulated_detail = {
            "escalation_target": "SOC Tier-2 Review Queue",
            "analyst_brief": {
                "summary": f"Incident {alert.get('alert_id')} requires analyst verification.",
                "confidence_score": confidence,
                "evidence_summary": f"Total items: {len(evidence_list)} (Verified: {verified_count}, Corroborated: {corroborated_count}, Untrusted: {untrusted_count})",
                "recommended_next_steps": [
                    "Perform deep memory inspection on target host",
                    "Verify if source IP belongs to partner VPN range",
                    "Review recent user privilege escalation logs"
                ]
            }
        }
    else:  # BENIGN
        simulated_detail = {
            "monitoring_status": "Active Surveillance",
            "safety_banner": "Event classified as benign. Continue monitoring.",
            "execution_status": "CLOSED"
        }

    return {
        "confidence": confidence,
        "classification": classification,
        "action": action,
        "scoring_method": confidence_data.get("method", "WEIGHTED_TRUST"),
        "decision_reason": decision_reason,
        "simulated_detail": simulated_detail,
        "evidence_counts": {
            "total": len(evidence_list),
            "verified": verified_count,
            "corroborated": corroborated_count,
            "untrusted": untrusted_count
        }
    }
