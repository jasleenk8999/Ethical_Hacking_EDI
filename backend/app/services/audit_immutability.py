"""
Audit Record Immutability Protection

Prevents unauthorized mutation or deletion of audit records through normal application flow.
Allows only:
- INSERT new records (via append_audit_record)
- SELECT/READ for verification
- Direct test fixture cleanup (via direct session operations outside normal flow)

Prevents:
- UPDATE of existing records
- DELETE of existing records
- Modification via ORM
"""

from sqlalchemy import event
from sqlalchemy.orm import Session
from app.models.domain import AuditTrailRow


def protect_audit_immutability():
    """
    Registers SQLAlchemy event listeners to prevent audit record mutation/deletion.
    Call once at application startup.
    """
    
    @event.listens_for(AuditTrailRow, 'before_update', propagate=True)
    def prevent_audit_update(mapper, connection, target):
        """Prevent UPDATE operations on audit records."""
        raise RuntimeError(
            f"Audit record mutation is not permitted. "
            f"Audit ID {target.audit_id} is immutable. "
            f"Audit chain integrity requires all records remain unchanged after creation."
        )
    
    @event.listens_for(AuditTrailRow, 'before_delete', propagate=True)
    def prevent_audit_delete(mapper, connection, target):
        """Prevent DELETE operations on audit records."""
        raise RuntimeError(
            f"Audit record deletion is not permitted. "
            f"Audit ID {target.audit_id} is immutable. "
            f"Audit chain integrity requires all records remain in the database."
        )


def bypass_immutability_for_testing(session: Session):
    """
    Temporarily disables immutability checks for test fixture cleanup.
    
    This allows tests to reset the database without being blocked by
    immutability protection. Should ONLY be called from test fixtures.
    
    Usage:
        with bypass_immutability_for_testing(session):
            session.query(AuditTrailRow).delete()
            session.commit()
    
    Returns: Context manager
    """
    from contextlib import contextmanager
    
    @contextmanager
    def _bypass():
        # Disable the event listeners
        event.remove(AuditTrailRow, 'before_update', prevent_audit_update)
        event.remove(AuditTrailRow, 'before_delete', prevent_audit_delete)
        try:
            yield
        finally:
            # Re-enable them
            event.listen(AuditTrailRow, 'before_update', prevent_audit_update, propagate=True)
            event.listen(AuditTrailRow, 'before_delete', prevent_audit_delete, propagate=True)
    
    return _bypass()
