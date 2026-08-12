from typing import Dict, Any, Tuple

TRUST_TIERS = {
    "VERIFIED": 1.0,
    "CORROBORATED": 0.6,
    "UNTRUSTED": 0.2
}

def assign_trust_tier(tool_name: str, evidence_type: str, source: str = "") -> Tuple[str, float, str]:
    """
    Assigns a trust tier, trust weight, and explicit justification reason.
    - Verified (1.0): Verified Threat Intelligence feeds & cryptographic signature DBs
    - Corroborated (0.6): Internal SIEM security logs & enterprise CMDB databases
    - Untrusted (0.2): Unverified third-party user reports or noisy telemetry
    """
    tool_lower = tool_name.lower()
    type_lower = evidence_type.lower()
    
    if "threat" in tool_lower or "intel" in tool_lower or "signature" in type_lower:
        return (
            "VERIFIED",
            TRUST_TIERS["VERIFIED"],
            "Evidence originates from verified Threat Intelligence Feed with cross-validated global reputation indicators."
        )
    elif "untrusted" in type_lower or "noise" in type_lower or "user report" in type_lower or "external" in source.lower():
        return (
            "UNTRUSTED",
            TRUST_TIERS["UNTRUSTED"],
            "Evidence comes from an unverified external source or single uncorroborated user report."
        )
    else: # Log Lookup, Asset Criticality, SIEM, System Audit
        return (
            "CORROBORATED",
            TRUST_TIERS["CORROBORATED"],
            "Evidence generated from authoritative internal SOC logs and CMDB asset metadata."
        )
