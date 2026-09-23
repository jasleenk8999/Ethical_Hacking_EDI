"""
CAIRA Decision Policy Module

Centralized, single source of truth for classification thresholds and actions.
All classification and authorization logic flows through this module.
"""

# ─── CLASSIFICATION THRESHOLDS ───────────────────────────────────────────

BENIGN_MAX = 0.39  # confidence <= 0.39 → BENIGN
UNCERTAIN_MIN = 0.40  # confidence >= 0.40 and < 0.75 → UNCERTAIN
MALICIOUS_MIN = 0.75  # confidence >= 0.75 → MALICIOUS

# ─── CLASSIFICATION ─────────────────────────────────────────────────────

def classify_confidence(confidence: float) -> str:
    """
    Deterministic confidence-to-classification mapping.
    
    Returns one of: MALICIOUS, UNCERTAIN, BENIGN
    """
    if confidence >= MALICIOUS_MIN:
        return "MALICIOUS"
    elif confidence >= UNCERTAIN_MIN:
        return "UNCERTAIN"
    else:
        return "BENIGN"


def get_action_for_classification(classification: str, alert: dict = None) -> str:
    """
    Maps classification to authorized action.
    
    Args:
        classification: One of MALICIOUS, UNCERTAIN, BENIGN
        alert: Optional alert dict (for contextualization)
    
    Returns:
        Action string describing the appropriate response
    """
    if classification == "MALICIOUS":
        target_asset = alert.get("target_asset", "Asset") if alert else "Asset"
        source_ip = alert.get("source_ip", "0.0.0.0") if alert else "0.0.0.0"
        return f"SIMULATED CONTAINMENT — Host Isolation ({target_asset}) & IP Block ({source_ip})"
    elif classification == "UNCERTAIN":
        return "ESCALATE TO HUMAN ANALYST"
    else:  # BENIGN
        return "NO ACTION"


def is_containment_authorized(classification: str) -> bool:
    """
    Determines if automated containment action is authorized for this classification.
    
    Returns True only for MALICIOUS classification.
    """
    return classification == "MALICIOUS"


def get_decision_reason(classification: str, confidence: float, evidence_list: list) -> str:
    """
    Generates human-readable rationale for the classification decision.
    """
    verified_count = sum(1 for e in evidence_list if e.get("trust_tier") == "VERIFIED")
    corroborated_count = sum(1 for e in evidence_list if e.get("trust_tier") == "CORROBORATED")
    untrusted_count = sum(1 for e in evidence_list if e.get("trust_tier") == "UNTRUSTED")
    
    if classification == "MALICIOUS":
        return (
            f"High confidence score ({confidence:.2f} >= {MALICIOUS_MIN}) supported by {verified_count} Verified "
            f"and {corroborated_count} Corroborated evidence items. Automated simulated containment initiated. "
            f"[SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED]"
        )
    elif classification == "UNCERTAIN":
        return (
            f"Moderate confidence score ({confidence:.2f} in band [{UNCERTAIN_MIN}, {MALICIOUS_MIN}]). Evidence score is indeterminate "
            f"or contains conflicting indicators ({untrusted_count} untrusted sources). Direct containment withheld; "
            f"escalated to Tier-2 SOC Analyst for human-in-the-loop review."
        )
    else:  # BENIGN
        return (
            f"Low confidence score ({confidence:.2f} < {UNCERTAIN_MIN}). Evidence indicates benign operational noise or false alarm. "
            f"No containment required. Ticket closed with monitoring logging."
        )


# ─── HELPER: Get Threshold Band ─────────────────────────────────────────

def get_threshold_band(confidence: float) -> str:
    """
    Returns human-readable threshold band for a confidence value.
    Useful for debugging and logging.
    """
    if confidence >= MALICIOUS_MIN:
        return f"MALICIOUS (>= {MALICIOUS_MIN})"
    elif confidence >= UNCERTAIN_MIN:
        return f"UNCERTAIN ([{UNCERTAIN_MIN}, {MALICIOUS_MIN}])"
    else:
        return f"BENIGN (<= {BENIGN_MAX})"
