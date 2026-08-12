from typing import List, Dict, Any

def calculate_confidence(evidence_items: List[Dict[str, Any]], method: str = "WEIGHTED_TRUST") -> Dict[str, Any]:
    """
    Calculates aggregated confidence score based on collected evidence items.
    Supports Method 1: Weighted Trust Score and Method 2: Unweighted Score.
    """
    if not evidence_items:
        return {
            "confidence": 0.0,
            "method": method,
            "total_evidence": 0,
            "breakdown": []
        }

    total_weighted_score = 0.0
    total_trust_weight = 0.0
    unweighted_sum = 0.0
    breakdown = []

    for item in evidence_items:
        score = float(item.get("evidence_score", 0.5))
        weight = float(item.get("trust_weight", 0.6))
        tier = item.get("trust_tier", "CORROBORATED")
        tool = item.get("tool_name", "Unknown Tool")

        contribution = score * weight
        total_weighted_score += contribution
        total_trust_weight += weight
        unweighted_sum += score

        breakdown.append({
            "tool_name": tool,
            "evidence_score": score,
            "trust_tier": tier,
            "trust_weight": weight,
            "weighted_contribution": round(contribution, 4)
        })

    if method == "UNWEIGHTED_AVERAGE":
        final_confidence = round(unweighted_sum / len(evidence_items), 4)
    else: # WEIGHTED_TRUST
        final_confidence = round(total_weighted_score / (total_trust_weight if total_trust_weight > 0 else 1.0), 4)

    # Ensure bounds [0.0, 1.0]
    final_confidence = max(0.0, min(1.0, final_confidence))

    return {
        "confidence": final_confidence,
        "method": method,
        "total_evidence": len(evidence_items),
        "total_weighted_score": round(total_weighted_score, 4),
        "total_trust_weight": round(total_trust_weight, 4),
        "unweighted_average": round(unweighted_sum / len(evidence_items), 4),
        "breakdown": breakdown
    }
