"""
Safe Audit Chain Appending with Concurrency Control

Implements database-level serialization for audit chain writes using
SELECT FOR UPDATE locking to prevent concurrent writes from both reading
the same previous_hash.

The pattern is:
1. BEGIN TRANSACTION (implicit in SQLAlchemy)
2. SELECT FOR UPDATE on audit_trails table to get latest previous_hash
3. Compute new audit record with that hash
4. INSERT new record
5. COMMIT (all-or-nothing atomicity)

This ensures linear audit chain with no fork possibility under concurrency.
"""

import hashlib
import json
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.domain import AuditTrailRow
from app.services.evaluation_context import EvaluationContext


GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def compute_hash(previous_hash: str, timestamp: str, event_type: str, event_content: str) -> str:
    """
    Computes SHA-256 hash for audit block chaining.
    """
    payload = f"{previous_hash}|{timestamp}|{event_type}|{event_content}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def append_audit_record(
    db: Session,
    alert_id: str,
    event_type: str,
    event_content: str,
    reasoning_step: str = "",
    evidence_ids: list = None,
    decision_id: int = None
) -> AuditTrailRow:
    """
    Atomically appends a new audit record to the chain.
    
    Uses SELECT FOR UPDATE to serialize writes and prevent concurrent
    requests from both reading the same previous_hash.
    
    Args:
        db: SQLAlchemy Session
        alert_id: The alert being investigated
        event_type: Type of event (e.g., "DECISION_FINALIZED")
        event_content: JSON serializable content
        reasoning_step: Human-readable reasoning
        evidence_ids: List of evidence IDs that influenced this decision
        decision_id: Optional reference to DecisionRecord
    
    Returns:
        The newly created AuditTrailRow
    
    Raises:
        Exception: On any database error during atomic write
    """
    if evidence_ids is None:
        evidence_ids = []
    
    try:
        # Step 1: SELECT FOR UPDATE lock on the audit table
        # This serializes access - only one transaction can hold this lock at a time
        latest_audit = db.query(AuditTrailRow).with_for_update().order_by(
            desc(AuditTrailRow.id)
        ).first()
        
        # Step 2: Determine previous_hash (locked, so it won't change mid-transaction)
        previous_hash = GENESIS_HASH
        if latest_audit:
            previous_hash = latest_audit.current_hash
        
        # Step 3: Create new audit record with that hash
        timestamp = datetime.now(timezone.utc).isoformat()
        current_hash = compute_hash(
            previous_hash, 
            timestamp, 
            event_type, 
            event_content
        )
        
        new_audit = AuditTrailRow(
            audit_id=f"AUD-{uuid4().hex[:8].upper()}",
            alert_id=alert_id,
            decision_id=decision_id,
            event_type=event_type,
            reasoning_step=reasoning_step,
            evidence_ids=json.dumps(evidence_ids),
            event_content=event_content,
            previous_hash=previous_hash,
            current_hash=current_hash,
            verification_status="VALID",
            timestamp=timestamp,
            is_evaluation=EvaluationContext.is_in_evaluation(),
            evaluation_run_id=EvaluationContext.get_current_run_id()
        )
        
        # Step 4: Add and flush (transaction still open)
        db.add(new_audit)
        db.flush()  # Ensure it's written but transaction not yet committed
        
        return new_audit
    
    except Exception as e:
        # On any error, the entire transaction will be rolled back
        # because we're using implicit transactions in SQLAlchemy
        raise RuntimeError(
            f"Failed to append audit record for alert {alert_id}: {str(e)}"
        ) from e
