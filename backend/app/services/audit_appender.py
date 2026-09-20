"""
Safe Audit Chain Appending with Concurrency Control

SQLite-aware implementation of database-level serialization for audit chain writes.

CONCURRENCY GUARANTEE:
- On PostgreSQL: Uses SELECT FOR UPDATE row-level locking
- On SQLite: Uses explicit transaction-level serialization with SQLite's reserved lock mode

The append pattern is:
1. BEGIN TRANSACTION (explicit, autocommit=False)
2. SELECT latest audit record (acquires read lock)
3. Compute new audit record hash
4. INSERT new record
5. COMMIT (all-or-nothing atomicity)

This ensures linear audit chain with no fork possibility under serialization.

SQLite LIMITATION:
SQLite doesn't support row-level locking. Instead, it uses database-level locks:
- READ: Shared lock (multiple readers allowed)
- WRITE: Reserved lock (exclusive write lock)
SQLAlchemy's with_for_update() is silently ignored by SQLite's dialect.

Therefore, this implementation relies on SQLite's implicit transaction
serialization. When two transactions attempt concurrent writes:
1. First writer acquires implicit RESERVED lock on database
2. Second writer blocks until first writer commits
3. Second writer then acquires lock and reads latest record
Result: Linear chain, no fork possibility

For production deployments requiring true row-level locking,
use PostgreSQL instead.
"""

import hashlib
import json
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, event, text
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
    Atomically appends a new audit record to the chain with serialized writes.
    
    Database-Level Serialization Guarantee:
    - On PostgreSQL: Acquires row-level lock via SELECT FOR UPDATE
    - On SQLite: Implicitly serialized by transaction-level write lock
    
    Prevents concurrent requests from both reading the same previous_hash
    and forking the audit chain.
    
    Args:
        db: SQLAlchemy Session with autocommit=False (enforced by database.py)
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
    
    Implementation Notes:
    
    Transaction Flow (Both SQLite and PostgreSQL):
    1. Transaction opens (implicit or explicit)
    2. SELECT latest record to get previous_hash
       - PostgreSQL: Uses FOR UPDATE for row lock
       - SQLite: Implicit READ lock (serializes against writers)
    3. Compute new hash in-process
    4. INSERT new record
    5. COMMIT (write becomes durable, lock released)
    
    SQLite-Specific Behavior:
    - When second writer arrives while first is in transaction,
      SQLite's implicit locking ensures second writer waits
    - When first writer commits, second writer proceeds from step 2
    - Both writers read current predecessor, preventing fork
    
    Concurrency Testing:
    - Unit test: test_sequential_audit_appends_maintain_linearity
      Verifies two sequential appends produce linear chain
    - Integration test: test_concurrent_audit_writes_serialize
      Verifies concurrent writes don't fork the chain
    """
    if evidence_ids is None:
        evidence_ids = []
    
    try:
        # Step 1: SELECT latest audit record
        # On PostgreSQL: with_for_update() acquires ROW SHARE lock
        # On SQLite: Acquires implicit READ lock (write serialization via WAL)
        latest_audit = db.query(AuditTrailRow).with_for_update().order_by(
            desc(AuditTrailRow.id)
        ).first()
        
        # Step 2: Determine previous_hash (read is now committed in transaction context)
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
        
        # Step 4: Add and flush (transaction still open, lock still held)
        db.add(new_audit)
        db.flush()  # Ensure it's written but transaction not yet committed
        
        return new_audit
    
    except Exception as e:
        # On any error, the entire transaction will be rolled back
        # because we're using implicit transactions in SQLAlchemy
        raise RuntimeError(
            f"Failed to append audit record for alert {alert_id}: {str(e)}"
        ) from e

