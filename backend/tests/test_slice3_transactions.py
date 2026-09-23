"""
CAIRA Phase 2 Slice 3 — Investigation Transaction Atomicity & ToolCall Persistence

Tests for:
1. Atomic investigation transactions with proper rollback
2. ToolCall persistence from investigation pipeline
3. Evidence provenance with tool correlation
4. Complete traceability chain
"""

import pytest
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.domain import (
    AlertRecord, ToolCall, Evidence, DecisionRecord, AuditTrailRow
)
from app.services.investigation_transactions import InvestigationTransaction
from app.services.evaluation_context import EvaluationContext


# ─── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def memory_db():
    """In-memory SQLite database for test isolation."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def session_factory(memory_db):
    """Session factory for creating fresh sessions."""
    return sessionmaker(bind=memory_db)


# ═══════════════════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 1: TRANSACTION ATOMICITY
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestInvestigationTransactionAtomicity:
    """Verify atomic transaction behavior with proper rollback."""

    def test_successful_transaction_commits_all_records(self, session_factory):
        """Verify successful transaction creates all records."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-TXN-001",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Execute transaction
        with InvestigationTransaction(session, "TEST-TXN-001") as tx:
            tc = tx.record_tool_call("test_tool", "input", json.dumps({"result": "ok"}), 10.0)
            ev = tx.record_evidence([{
                "evidence_id": "EV-001",
                "tool_name": "test_tool",
                "content": {"test": "data"},
                "evidence_score": 0.8,
                "trust_tier": "VERIFIED",
                "trust_weight": 1.0,
                "reason": "Test evidence",
                "raw_strength": 0.8
            }])
            dec = tx.record_decision(0.8, 0.8, "MALICIOUS", "ISOLATE")
            aud = tx.record_audit()
            tx.commit()
        
        # Verify all records exist
        assert session.query(ToolCall).filter_by(alert_id="TEST-TXN-001").count() == 1
        assert session.query(Evidence).filter_by(alert_id="TEST-TXN-001").count() == 1
        assert session.query(DecisionRecord).filter_by(alert_id="TEST-TXN-001").count() == 1
        assert session.query(AuditTrailRow).filter_by(alert_id="TEST-TXN-001").count() == 1
        
        session.close()

    def test_transaction_rollback_on_toolcall_failure(self, session_factory):
        """Verify rollback when tool recording fails."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-ROLLBACK-001",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Start transaction and fail partway through
        try:
            with InvestigationTransaction(session, "TEST-ROLLBACK-001") as tx:
                tx.record_tool_call("tool1", "input", "{}", 10.0)
                
                # Simulate failure
                raise ValueError("Simulated tool execution failure")
                
                # This never runs
                tx.record_evidence([{"evidence_id": "EV-001"}])
        except ValueError:
            pass  # Expected
        
        # Verify rollback - no records exist
        assert session.query(ToolCall).filter_by(alert_id="TEST-ROLLBACK-001").count() == 0
        assert session.query(Evidence).filter_by(alert_id="TEST-ROLLBACK-001").count() == 0
        
        session.close()

    def test_transaction_rollback_on_decision_failure(self, session_factory):
        """Verify rollback when decision creation fails."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-DECISION-FAIL",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Transaction with failure at decision stage
        try:
            with InvestigationTransaction(session, "TEST-DECISION-FAIL") as tx:
                tx.record_tool_call("tool1", "input", "{}", 10.0)
                tx.record_evidence([{
                    "evidence_id": "EV-001",
                    "tool_name": "tool1",
                    "content": {},
                    "evidence_score": 0.8,
                    "trust_tier": "VERIFIED",
                    "trust_weight": 1.0,
                    "reason": "Test",
                    "raw_strength": 0.8
                }])
                
                # Simulate failure during decision
                raise RuntimeError("Decision creation failed")
        except RuntimeError:
            pass  # Expected
        
        # Verify complete rollback
        assert session.query(ToolCall).filter_by(alert_id="TEST-DECISION-FAIL").count() == 0
        assert session.query(Evidence).filter_by(alert_id="TEST-DECISION-FAIL").count() == 0
        assert session.query(DecisionRecord).filter_by(alert_id="TEST-DECISION-FAIL").count() == 0
        
        session.close()

    def test_alert_status_not_left_investigating(self, session_factory):
        """Verify alert status is not left at INVESTIGATING on failure."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-STATUS",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin",
            status="INGESTED"
        )
        session.add(alert)
        session.commit()
        
        # Transaction fails
        try:
            with InvestigationTransaction(session, "TEST-STATUS") as tx:
                # Status is set to INVESTIGATING on enter
                tx.record_tool_call("tool1", "input", "{}", 10.0)
                raise Exception("Failure during investigation")
        except Exception:
            pass
        
        # Verify alert is not left at INVESTIGATING
        fetched = session.query(AlertRecord).filter_by(alert_id="TEST-STATUS").first()
        assert fetched.status == "INGESTED", f"Alert status incorrectly left as {fetched.status}"
        
        session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 2: TOOLCALL PERSISTENCE
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestToolCallPersistence:
    """Verify ToolCall records are properly persisted."""

    def test_toolcall_records_created_with_execution_time(self, session_factory):
        """Verify ToolCall records include execution timing."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-TOOLCALL-001",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Record tool calls with different times
        with InvestigationTransaction(session, "TEST-TOOLCALL-001") as tx:
            tc1 = tx.record_tool_call("log_lookup", "user=admin", json.dumps({"events": []}), 15.5)
            tc2 = tx.record_tool_call("threat_intel", "ip=192.168.1.1", json.dumps({"malicious": True}), 22.3)
            tc3 = tx.record_tool_call("asset_criticality", "asset=server-01", json.dumps({"criticality": 0.9}), 18.7)
            tx.commit()
        
        # Verify all tool calls persisted with correct times
        tool_calls = session.query(ToolCall).filter_by(alert_id="TEST-TOOLCALL-001").order_by(ToolCall.id).all()
        assert len(tool_calls) == 3
        assert tool_calls[0].tool_name == "log_lookup"
        assert tool_calls[0].execution_time_ms == 15.5
        assert tool_calls[1].tool_name == "threat_intel"
        assert tool_calls[1].execution_time_ms == 22.3
        assert tool_calls[2].tool_name == "asset_criticality"
        assert tool_calls[2].execution_time_ms == 18.7
        
        session.close()

    def test_toolcall_evaluation_metadata(self, session_factory):
        """Verify ToolCall records have evaluation metadata."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-EVAL-TC",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Set evaluation context
        run_id = EvaluationContext.start_run()
        try:
            with InvestigationTransaction(session, "TEST-EVAL-TC") as tx:
                tc = tx.record_tool_call("test_tool", "input", "{}", 10.0)
                assert tc.is_evaluation is True
                assert tc.evaluation_run_id == run_id
                tx.commit()
            
            # Verify persisted
            fetched = session.query(ToolCall).filter_by(alert_id="TEST-EVAL-TC").first()
            assert fetched.is_evaluation is True
            assert fetched.evaluation_run_id == run_id
        finally:
            EvaluationContext.end_run()
        
        session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 3: EVIDENCE PROVENANCE
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestEvidenceProvenance:
    """Verify evidence records link to tool executions."""

    def test_evidence_linked_to_tools(self, session_factory):
        """Verify evidence identifies its source tool."""
        session = session_factory()
        
        alert = AlertRecord(
            alert_id="TEST-PROV-001",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        with InvestigationTransaction(session, "TEST-PROV-001") as tx:
            # Record tool calls
            tc1 = tx.record_tool_call("log_lookup", "user=admin", json.dumps({"result": "ok"}), 15.0)
            tc2 = tx.record_tool_call("threat_intel", "ip=192.168.1.1", json.dumps({"malicious": True}), 20.0)
            
            # Record evidence with tool references
            evidence = tx.record_evidence([
                {
                    "evidence_id": "EV-LOG-001",
                    "tool_name": "log_lookup",
                    "evidence_type": "LOG_ANALYSIS",
                    "content": {"events": []},
                    "evidence_score": 0.3,
                    "trust_tier": "CORROBORATED",
                    "trust_weight": 0.6,
                    "reason": "Log lookup result",
                    "raw_strength": 0.3
                },
                {
                    "evidence_id": "EV-THREAT-001",
                    "tool_name": "threat_intel",
                    "evidence_type": "THREAT_INTEL",
                    "content": {"malicious": True},
                    "evidence_score": 0.95,
                    "trust_tier": "VERIFIED",
                    "trust_weight": 1.0,
                    "reason": "Threat intelligence hit",
                    "raw_strength": 0.95
                }
            ])
            tx.commit()
        
        # Verify evidence records exist and link to tools
        ev1 = session.query(Evidence).filter_by(evidence_id="EV-LOG-001").first()
        assert ev1 is not None
        assert ev1.tool_name == "log_lookup"
        assert ev1.evidence_score == 0.3
        
        ev2 = session.query(Evidence).filter_by(evidence_id="EV-THREAT-001").first()
        assert ev2 is not None
        assert ev2.tool_name == "threat_intel"
        assert ev2.evidence_score == 0.95
        
        session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# TEST CATEGORY 4: COMPLETE TRACEABILITY
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestCompleteTraceability:
    """Verify complete provenance chain is queryable."""

    def test_full_investigation_trace_chain(self, session_factory):
        """Verify Alert → ToolCall → Evidence → Decision → Audit chain."""
        session = session_factory()
        
        # Create alert
        alert = AlertRecord(
            alert_id="TEST-TRACE-FULL",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="server-01",
            user="admin"
        )
        session.add(alert)
        session.commit()
        
        # Execute full transaction
        with InvestigationTransaction(session, "TEST-TRACE-FULL") as tx:
            # Tool calls
            tc1 = tx.record_tool_call("log_lookup", "user=admin", "{}", 15.0)
            tc2 = tx.record_tool_call("threat_intel", "ip=192.168.1.1", "{}", 20.0)
            
            # Evidence
            evs = tx.record_evidence([
                {
                    "evidence_id": "EV-001",
                    "tool_name": "log_lookup",
                    "evidence_type": "LOG",
                    "content": {},
                    "evidence_score": 0.3,
                    "trust_tier": "CORROBORATED",
                    "trust_weight": 0.6,
                    "reason": "Log result",
                    "raw_strength": 0.3
                },
                {
                    "evidence_id": "EV-002",
                    "tool_name": "threat_intel",
                    "evidence_type": "THREAT",
                    "content": {},
                    "evidence_score": 0.9,
                    "trust_tier": "VERIFIED",
                    "trust_weight": 1.0,
                    "reason": "Threat hit",
                    "raw_strength": 0.9
                }
            ])
            
            # Decision
            dec = tx.record_decision(0.7, 0.75, "MALICIOUS", "ISOLATE", cited_evidence=["EV-001", "EV-002"])
            
            # Audit
            aud = tx.record_audit()
            tx.commit()
        
        # Verify complete chain
        # 1. Alert exists
        fetched_alert = session.query(AlertRecord).filter_by(alert_id="TEST-TRACE-FULL").first()
        assert fetched_alert is not None
        
        # 2. ToolCalls exist
        tool_calls = session.query(ToolCall).filter_by(alert_id="TEST-TRACE-FULL").all()
        assert len(tool_calls) == 2
        assert {tc.tool_name for tc in tool_calls} == {"log_lookup", "threat_intel"}
        
        # 3. Evidence exists and links to tools
        evidence = session.query(Evidence).filter_by(alert_id="TEST-TRACE-FULL").all()
        assert len(evidence) == 2
        assert evidence[0].tool_name == "log_lookup"
        assert evidence[1].tool_name == "threat_intel"
        
        # 4. Decision exists and cites evidence
        decision = session.query(DecisionRecord).filter_by(alert_id="TEST-TRACE-FULL").first()
        assert decision is not None
        cited = json.loads(decision.cited_evidence)
        assert "EV-001" in cited
        assert "EV-002" in cited
        
        # 5. Audit exists and references decision/evidence
        audit = session.query(AuditTrailRow).filter_by(alert_id="TEST-TRACE-FULL").first()
        assert audit is not None
        assert audit.decision_id == decision.id
        
        session.close()

