from typing import Dict, Any, List

def evaluate_decision(confidence_data: Dict[str, Any], alert: Dict[str, Any], evidence_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates evidence confidence against deterministic decision thresholds.
    All containment actions are SIMULATED only.
    """
    confidence = confidence_data["confidence"]
    alert_type = alert.get("type", "Alert")
    target_asset = alert.get("target_asset", "Asset")
    source_ip = alert.get("source_ip", "0.0.0.0")

    verified_count = sum(1 for e in evidence_list if e.get("trust_tier") == "VERIFIED")
    corroborated_count = sum(1 for e in evidence_list if e.get("trust_tier") == "CORROBORATED")
    untrusted_count = sum(1 for e in evidence_list if e.get("trust_tier") == "UNTRUSTED")

    if confidence >= 0.75:
        classification = "MALICIOUS"
        action = f"SIMULATED CONTAINMENT — Host Isolation ({target_asset}) & IP Block ({source_ip})"
        decision_reason = (
            f"High confidence score ({confidence:.2f} >= 0.75) supported by {verified_count} Verified "
            f"and {corroborated_count} Corroborated evidence items. Automated simulated containment initiated. "
            f"[SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED]"
        )
        simulated_detail = {
            "containment_type": "Host Isolation & Firewall Rule Ingestion",
            "target_host": target_asset,
            "blocked_ip": source_ip,
            "safety_banner": "SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED",
            "execution_status": "SUCCESS (SIMULATED)"
        }
    elif confidence >= 0.40:
        classification = "UNCERTAIN"
        action = "ESCALATE TO HUMAN ANALYST"
        decision_reason = (
            f"Moderate confidence score ({confidence:.2f} in band [0.40, 0.75]). Evidence score is indeterminate "
            f"or contains conflicting indicators ({untrusted_count} untrusted sources). Direct containment withheld; "
            f"escalated to Tier-2 SOC Analyst for human-in-the-loop review."
        )
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
    else:
        classification = "BENIGN"
        action = "NO ACTION"
        decision_reason = (
            f"Low confidence score ({confidence:.2f} < 0.40). Evidence indicates benign operational noise or false alarm. "
            f"No containment required. Ticket closed with monitoring logging."
        )
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
