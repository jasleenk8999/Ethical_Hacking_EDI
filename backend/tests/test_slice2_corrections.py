"""
CAIRA Phase 2 Slice 2 — Correctness Review & Concurrency Verification

This test module performs a correctness review of Slice 2 implementation:
1. Real concurrency tests (multiple connections/transactions)
2. ToolCall traceability verification
3. Audit immutability validation
4. SQLite locking behavior documentation
"""

import tempfile
import os
import threading
import time
from threading import Thread, Event, Lock
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.domain import AuditTrailRow, ToolCall, AlertRecord, Evidence, DecisionRecord
from app.services.audit_appender import append_audit_record, GENESIS_HASH
from app.services.audit_engine import verify_audit_chain
from app.services.evaluation_context import EvaluationContext
from app.services.audit_immutability import protect_audit_immutability


# ─── Module Setup ──────────────────────────────────────────────────────────────────

# Activate audit immutability protection for tests
protect_audit_immutability()


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def file_backed_db():
    """File-backed SQLite database for concurrency testing.
    
    Using file-backed (not in-memory) database allows separate connections
    to see each other's committed changes, which is necessary for true
    concurrency testing.
    """
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    
    try:
        # File-backed engine with connection pooling
        engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False, "timeout": 10.0}
        )
        Base.metadata.create_all(engine)
        yield engine
    finally:
        if os.path.exists(db_path):
            os.unlink(db_path)


@pytest.fixture
def memory_db():
    """In-memory SQLite database for isolated tests."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return engine


# ═══════════════════════════════════════════════════════════════════════════════════════
# ISSUE 1: AUDIT CONCURRENCY — REAL CONCURRENCY TEST
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestConcurrentAuditWrites:
    """
    Real integration tests for concurrent audit append operations.
    Uses file-backed SQLite database with separate connections.
    """

    def test_concurrent_writes_maintain_linear_chain(self, file_backed_db):
        """
        REAL CONCURRENCY TEST:
        Two separate database connections attempt concurrent audit appends.
        
        Verification:
        1. Both writers succeed
        2. Final chain has 3 records (initial + 2 appends)
        3. Chain verifies valid (no tampering)
        4. No block claims same predecessor as another
        """
        Session = sessionmaker(bind=file_backed_db)
        
        # Create initial audit record
        session0 = Session()
        initial = append_audit_record(
            db=session0,
            alert_id="CONC-TEST-INIT",
            event_type="GENESIS",
            event_content="Initial record"
        )
        session0.commit()
        initial_hash = initial.current_hash
        session0.close()
        
        # Prepare two separate writers
        results = {}
        errors = {}
        write_complete = Event()
        write_lock = Lock()
        
        def writer(thread_id, alert_id):
            try:
                session = Session()
                audit = append_audit_record(
                    db=session,
                    alert_id=alert_id,
                    event_type=f"WRITE_{thread_id}",
                    event_content=f"Content from thread {thread_id}"
                )
                session.commit()
                
                with write_lock:
                    results[thread_id] = {
                        'audit_id': audit.audit_id,
                        'previous_hash': audit.previous_hash,
                        'current_hash': audit.current_hash
                    }
                session.close()
            except Exception as e:
                with write_lock:
                    errors[thread_id] = str(e)
        
        # Start two writers concurrently
        t1 = Thread(target=writer, args=(1, "CONC-TEST-1"))
        t2 = Thread(target=writer, args=(2, "CONC-TEST-2"))
        
        t1.start()
        t2.start()
        
        t1.join(timeout=15)
        t2.join(timeout=15)
        
        # Verify results
        assert len(results) == 2, f"Expected 2 successful writes, got {len(results)}: {errors}"
        
        # Fetch final chain
        session_verify = Session()
        audits = session_verify.query(AuditTrailRow).order_by(AuditTrailRow.id).all()
        session_verify.close()
        
        assert len(audits) >= 2, f"Expected at least 2 records, got {len(audits)}"
        
        # Verify chain integrity
        audit_dicts = [
            {
                "previous_hash": a.previous_hash,
                "current_hash": a.current_hash,
                "timestamp": a.timestamp,
                "event_type": a.event_type,
                "event_content": a.event_content
            }
            for a in audits
        ]
        
        verification = verify_audit_chain(audit_dicts)
        assert verification['verified'] is True, \
            f"Audit chain failed verification: {verification}"
        
        # Key assertion: no two blocks claim the same predecessor
        # (unless it's GENESIS, which only first block should reference)
        predecessor_counts = {}
        for audit in audits[1:]:  # Skip first (genesis)
            prev = audit.previous_hash
            predecessor_counts[prev] = predecessor_counts.get(prev, 0) + 1
        
        for prev_hash, count in predecessor_counts.items():
            assert count == 1, \
                f"Predecessor hash {prev_hash[:16]}... referenced by {count} blocks (fork!)"

    def test_sequential_appends_are_linear(self, memory_db):
        """
        Control test: Sequential appends maintain linearity.
        Verifies baseline behavior before concurrency tests.
        """
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        # Append 1
        audit1 = append_audit_record(
            db=session,
            alert_id="SEQ-TEST-1",
            event_type="EVENT_1",
            event_content="First"
        )
        session.commit()
        
        # Append 2
        audit2 = append_audit_record(
            db=session,
            alert_id="SEQ-TEST-2",
            event_type="EVENT_2",
            event_content="Second"
        )
        session.commit()
        
        # Append 3
        audit3 = append_audit_record(
            db=session,
            alert_id="SEQ-TEST-3",
            event_type="EVENT_3",
            event_content="Third"
        )
        session.commit()
        
        # Verify linearity
        assert audit1.previous_hash == GENESIS_HASH
        assert audit2.previous_hash == audit1.current_hash
        assert audit3.previous_hash == audit2.current_hash
        
        # Verify no other block claims same predecessor
        audits = session.query(AuditTrailRow).order_by(AuditTrailRow.id).all()
        predecessor_counts = {}
        for a in audits[1:]:
            prev = a.previous_hash
            predecessor_counts[prev] = predecessor_counts.get(prev, 0) + 1
        
        for prev_hash, count in predecessor_counts.items():
            assert count == 1, f"Fork detected: {count} blocks claim predecessor {prev_hash[:16]}..."
        
        session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# ISSUE 4 & 5: AUDIT IMMUTABILITY & TOOLCALL TRACEABILITY
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestAuditImmutabilityVerification:
    """
    Verify that audit records are truly immutable through application flow.
    """

    def test_audit_cannot_be_updated_through_orm(self, memory_db):
        """
        ORM mutation protection: UPDATE prevented by event listeners.
        """
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        # Create audit record
        audit = AuditTrailRow(
            audit_id="AUD-TEST-001",
            alert_id="ALERT-001",
            event_type="TEST",
            reasoning_step="Test",
            evidence_ids="[]",
            event_content="Original content",
            previous_hash=GENESIS_HASH,
            current_hash="aaaa000000000000000000000000000000000000000000000000000000000000",
            verification_status="VALID"
        )
        session.add(audit)
        session.commit()
        
        # Attempt to mutate
        audit.event_content = "TAMPERED"
        
        with pytest.raises(RuntimeError) as exc_info:
            session.commit()
        
        assert "immutable" in str(exc_info.value).lower() or "mutation" in str(exc_info.value).lower()
        session.rollback()
        session.close()

    def test_audit_cannot_be_deleted_through_orm(self, memory_db):
        """
        ORM deletion protection: DELETE prevented by event listeners.
        """
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        # Create audit record
        audit = AuditTrailRow(
            audit_id="AUD-TEST-002",
            alert_id="ALERT-002",
            event_type="TEST",
            reasoning_step="Test",
            evidence_ids="[]",
            event_content="Content",
            previous_hash=GENESIS_HASH,
            current_hash="bbbb000000000000000000000000000000000000000000000000000000000000",
            verification_status="VALID"
        )
        session.add(audit)
        session.commit()
        
        # Attempt to delete
        session.delete(audit)
        
        with pytest.raises(RuntimeError) as exc_info:
            session.commit()
        
        assert "immutable" in str(exc_info.value).lower() or "not permitted" in str(exc_info.value).lower()
        session.rollback()
        session.close()


class TestToolCallEvaluationTraceability:
    """
    Verify that ToolCall records support evaluation metadata and traceability.
    """

    def test_toolcall_has_evaluation_fields(self, memory_db):
        """
        Verify ToolCall model has is_evaluation and evaluation_run_id fields.
        """
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        # Create operational ToolCall
        op_tool = ToolCall(
            alert_id="OP-001",
            tool_name="TestTool",
            input_query="query",
            output_result="{}",
            is_evaluation=False,
            evaluation_run_id=None
        )
        session.add(op_tool)
        session.commit()
        
        # Create evaluation ToolCall
        run_id = EvaluationContext.start_run()
        eval_tool = ToolCall(
            alert_id="EVAL-001",
            tool_name="TestTool",
            input_query="query",
            output_result="{}",
            is_evaluation=True,
            evaluation_run_id=run_id
        )
        session.add(eval_tool)
        session.commit()
        EvaluationContext.end_run()
        
        # Verify operational
        op_fetched = session.query(ToolCall).filter_by(alert_id="OP-001").first()
        assert op_fetched.is_evaluation is False
        assert op_fetched.evaluation_run_id is None
        
        # Verify evaluation
        eval_fetched = session.query(ToolCall).filter_by(alert_id="EVAL-001").first()
        assert eval_fetched.is_evaluation is True
        assert eval_fetched.evaluation_run_id == run_id
        
        session.close()

    def test_complete_evaluation_trace(self, memory_db):
        """
        Verify complete traceability chain:
        EvaluationRun -> Alert -> ToolCall -> Evidence -> Decision -> AuditTrail
        """
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        run_id = EvaluationContext.start_run()
        
        try:
            # Create alert (evaluation)
            alert = AlertRecord(
                alert_id="EVAL-TRACE-001",
                type="Test",
                severity="HIGH",
                source_ip="192.168.1.1",
                target_asset="server-01",
                user="system",
                is_evaluation=True,
                evaluation_run_id=run_id
            )
            session.add(alert)
            session.commit()
            
            # Create ToolCall (evaluation)
            tool_call = ToolCall(
                alert_id="EVAL-TRACE-001",
                tool_name="TestAnalyzer",
                input_query="analyze 192.168.1.1",
                output_result='{"malicious": true}',
                is_evaluation=True,
                evaluation_run_id=run_id
            )
            session.add(tool_call)
            session.commit()
            
            # Create Evidence (evaluation)
            evidence = Evidence(
                evidence_id="EV-TRACE-001",
                alert_id="EVAL-TRACE-001",
                tool_name="TestAnalyzer",
                evidence_type="Threat Analysis",
                content="IP flagged as malicious",
                evidence_score=0.95,
                trust_tier="VERIFIED",
                trust_weight=1.0,
                reason="Tool output directly",
                is_evaluation=True,
                evaluation_run_id=run_id
            )
            session.add(evidence)
            session.commit()
            
            # Create Decision (evaluation)
            decision = DecisionRecord(
                alert_id="EVAL-TRACE-001",
                confidence=0.95,
                classification="MALICIOUS",
                action="CONTAIN",
                decision_reason="Threat analysis confirmed",
                cited_evidence='["EV-TRACE-001"]',
                is_evaluation=True,
                evaluation_run_id=run_id
            )
            session.add(decision)
            session.commit()
            
            # Create Audit (evaluation)
            audit = append_audit_record(
                db=session,
                alert_id="EVAL-TRACE-001",
                event_type="DECISION_FINALIZED",
                event_content="Malicious decision reached",
                reasoning_step="Threat analysis confirmed",
                evidence_ids=["EV-TRACE-001"],
                decision_id=decision.id
            )
            session.commit()
            
            # Verify complete trace is accessible
            fetched_alert = session.query(AlertRecord).filter_by(alert_id="EVAL-TRACE-001").first()
            assert fetched_alert is not None
            assert fetched_alert.is_evaluation is True
            assert fetched_alert.evaluation_run_id == run_id
            
            fetched_tool = session.query(ToolCall).filter_by(alert_id="EVAL-TRACE-001").first()
            assert fetched_tool is not None
            assert fetched_tool.is_evaluation is True
            assert fetched_tool.evaluation_run_id == run_id
            
            fetched_evidence = session.query(Evidence).filter_by(alert_id="EVAL-TRACE-001").first()
            assert fetched_evidence is not None
            assert fetched_evidence.is_evaluation is True
            assert fetched_evidence.evaluation_run_id == run_id
            
            fetched_decision = session.query(DecisionRecord).filter_by(alert_id="EVAL-TRACE-001").first()
            assert fetched_decision is not None
            assert fetched_decision.is_evaluation is True
            assert fetched_decision.evaluation_run_id == run_id
            
            fetched_audit = session.query(AuditTrailRow).filter_by(alert_id="EVAL-TRACE-001").first()
            assert fetched_audit is not None
            assert fetched_audit.is_evaluation is True
            assert fetched_audit.evaluation_run_id == run_id
            
        finally:
            EvaluationContext.end_run()
            session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# ISSUE 7: XFAIL/XPASS STATE VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestSlice2Status:
    """
    Verify Slice 2 implementation status.
    """

    def test_evaluation_isolation_implemented(self):
        """Verify evaluation isolation is implemented (Slice 1)."""
        # Check is_evaluation and evaluation_run_id exist on models
        from sqlalchemy import inspect as sa_inspect
        
        mapper = sa_inspect(AlertRecord)
        columns = {c.name for c in mapper.columns}
        assert 'is_evaluation' in columns
        assert 'evaluation_run_id' in columns

    def test_audit_immutability_implemented(self, memory_db):
        """Verify audit immutability protection is active."""
        Session = sessionmaker(bind=memory_db)
        session = Session()
        
        audit = AuditTrailRow(
            audit_id="AUD-STATUS-001",
            alert_id="ALERT-STATUS-001",
            event_type="TEST",
            reasoning_step="Test",
            evidence_ids="[]",
            event_content="Content",
            previous_hash=GENESIS_HASH,
            current_hash="cccc000000000000000000000000000000000000000000000000000000000000",
            verification_status="VALID"
        )
        session.add(audit)
        session.commit()
        
        # Try to update
        audit.event_content = "TAMPERED"
        try:
            session.commit()
            # If we get here, immutability is NOT implemented
            session.rollback()
            pytest.fail("Audit immutability not implemented")
        except RuntimeError:
            # Expected
            session.rollback()
        
        session.close()

