import hashlib
import json
import uuid
from datetime import datetime
from typing import Dict, Any, List

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def compute_hash(previous_hash: str, timestamp: str, event_type: str, event_content: str) -> str:
    """
    Computes cryptographic SHA-256 hash for audit block chaining.
    """
    payload = f"{previous_hash}|{timestamp}|{event_type}|{event_content}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

def create_audit_entry(
    previous_hash: str,
    alert_id: str,
    event_type: str,
    reasoning_step: Dict[str, Any],
    evidence_ids: List[str],
    event_content: str,
    decision_id: int = None
) -> Dict[str, Any]:
    """
    Creates a new structured audit log record with SHA-256 hash chaining.
    Does NOT store unrestricted private chain-of-thought, but structured metadata.
    """
    audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.utcnow().isoformat()
    
    prev = previous_hash if previous_hash else GENESIS_HASH
    reasoning_json = json.dumps(reasoning_step, sort_keys=True)
    evidence_ids_json = json.dumps(evidence_ids)

    combined_content = f"{event_content}|{reasoning_json}|{evidence_ids_json}"
    current_hash = compute_hash(prev, timestamp, event_type, combined_content)

    return {
        "audit_id": audit_id,
        "alert_id": alert_id,
        "decision_id": decision_id,
        "event_type": event_type,
        "reasoning_step": reasoning_json,
        "evidence_ids": evidence_ids_json,
        "event_content": combined_content,
        "previous_hash": prev,
        "current_hash": current_hash,
        "verification_status": "VALID",
        "timestamp": timestamp
    }

def verify_audit_chain(audit_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Verifies cryptographic integrity across all audit records.
    Returns chain validity status and highlights any tampered record indices.
    """
    if not audit_records:
        return {
            "verified": True,
            "total_records": 0,
            "status_message": "✓ Audit log is empty. Cryptographic integrity valid.",
            "tampered_indices": []
        }

    tampered_indices = []
    expected_prev_hash = GENESIS_HASH

    for idx, record in enumerate(audit_records):
        prev = record.get("previous_hash", "")
        stored_hash = record.get("current_hash", "")
        timestamp = record.get("timestamp", "")
        event_type = record.get("event_type", "")
        event_content = record.get("event_content", "")

        # Check 1: Previous hash link consistency
        if idx == 0:
            if prev != GENESIS_HASH:
                tampered_indices.append(idx)
        else:
            if prev != expected_prev_hash:
                tampered_indices.append(idx)

        # Check 2: Hash re-computation verification
        recomputed = compute_hash(prev, timestamp, event_type, event_content)
        if recomputed != stored_hash:
            if idx not in tampered_indices:
                tampered_indices.append(idx)

        expected_prev_hash = stored_hash

    is_valid = len(tampered_indices) == 0

    return {
        "verified": is_valid,
        "total_records": len(audit_records),
        "status_message": "✓ Audit chain verified. All SHA-256 cryptographic hashes intact." if is_valid else f"✗ Tampering detected! Invalid hash linkage at block indices: {tampered_indices}",
        "tampered_indices": tampered_indices
    }
