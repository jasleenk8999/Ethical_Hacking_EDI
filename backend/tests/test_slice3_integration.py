"""
Slice 3 Integration Tests - Real ToolCall Persistence

These tests verify that the enhanced investigation pipeline is actually
integrated into the API and creates real ToolCall records.
"""

import pytest
import json
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.domain import (
    AlertRecord, ToolCall, Evidence, DecisionRecord, AuditTrailRow
)
from app.services.investigation_integrated import run_investigation_pipeline_integrated
from app.services.evaluation_context import EvaluationContext
from app.services.audit_engine import verify_audit_chain
from app.services.seeder import seed_database


@pytest.fixture
def memory_db():
    """In-memory SQLite with seeded data."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def session_with_seed(memory_db):
    """Session with test data seeded."""
    Session = sessionmaker(bind=memory_db)
    session = Session()
    # Seed database with test tools
    seed_database(session)
    return session


def mock_llm_for_testing():
    """Create mock LLM responses for testing."""
    msg1 = AIMessage(
        content='Tool use: log_lookup(user="alice")',
        tool_calls=[{
            "name": "log_lookup_tool",
            "args": {"user": "alice"},
            "id": "call_1"
        }]
    )
    msg2 = AIMessage(
        content='Tool use: threat_intel_lookup(source_ip="192.168.1.100")',
        tool_calls=[{
            "name": "threat_intel_lookup_tool",
            "args": {"source_ip": "192.168.1.100"},
            "id": "call_2"
        }]
    )
    msg3 = AIMessage(
        content='Tool use: asset_criticality_lookup(user_or_asset="admin-server")',
        tool_calls=[{
            "name": "asset_criticality_lookup_tool",
            "args": {"user_or_asset": "admin-server"},
            "id": "call_3"
        }]
    )
    
    msg_final = AIMessage(
        content='Based on the evidence, I conclude this is MALICIOUS activity.',
        tool_calls=[]
    )
    
    return [msg1, msg2, msg3, msg_final]


# ═══════════════════════════════════════════════════════════════════════════════════════
# INTEGRATED PIPELINE TESTS
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestIntegratedInvestigationPipeline:
    """Verify the integrated pipeline creates real ToolCall records."""

    def test_investigation_creates_real_toolcalls(self, session_with_seed):
        """
        CRITICAL TEST: Run actual integrated investigation and verify ToolCall persistence.
        """
        # Create alert
        alert = AlertRecord(
            alert_id="INTEGRATION-TEST-001",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        # Mock LLM
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        with patch("app.agent.graph.llm") as mock_llm:
            mock_llm.bind_tools.return_value = mock_bound
            
            # Run investigation through integrated pipeline
            result = run_investigation_pipeline_integrated(
                session_with_seed,
                "INTEGRATION-TEST-001",
                scoring_method="WEIGHTED_TRUST"
            )
        
        # Verify result structure
        assert result["confidence"] is not None
        assert result["decision"] is not None
        assert result["evidence"] is not None
        assert result["audit"] is not None
        assert result["tool_calls"] is not None
        
        # CRITICAL: Verify ToolCall records were created
        tool_calls = session_with_seed.query(ToolCall).filter_by(
            alert_id="INTEGRATION-TEST-001"
        ).all()
        
        # Should have 3 tool calls
        assert len(tool_calls) == 3, f"Expected 3 ToolCalls, got {len(tool_calls)}"
        
        # Verify each ToolCall has required fields
        tool_names = set()
        for tc in tool_calls:
            assert tc.alert_id == "INTEGRATION-TEST-001"
            assert tc.tool_name in ["log_lookup", "threat_intel_lookup", "asset_criticality_lookup"]
            assert tc.input_query is not None
            assert tc.output_result is not None
            assert tc.execution_time_ms > 0
            assert tc.is_evaluation is False
            assert tc.evaluation_run_id is None
            tool_names.add(tc.tool_name)
        
        # Verify we got all three tools
        assert len(tool_names) == 3, f"Expected 3 unique tools, got {tool_names}"

    def test_investigation_creates_evidence_linked_to_tools(self, session_with_seed):
        """Verify Evidence records link to their source tools."""
        alert = AlertRecord(
            alert_id="INTEGRATION-TEST-002",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        with patch("app.agent.graph.llm") as mock_llm:
            mock_llm.bind_tools.return_value = mock_bound
            result = run_investigation_pipeline_integrated(session_with_seed, "INTEGRATION-TEST-002")
        
        # Get evidence
        evidence = session_with_seed.query(Evidence).filter_by(
            alert_id="INTEGRATION-TEST-002"
        ).all()
        
        assert len(evidence) >= 2
        
        # Each evidence should reference a tool
        tool_names = {e.tool_name for e in evidence}
        assert len(tool_names) >= 2  # At least two tools represented in evidence
        
        # Verify evidence can be traced to tools
        for ev in evidence:
            # Tool call should exist
            tool_calls = session_with_seed.query(ToolCall).filter_by(
                alert_id="INTEGRATION-TEST-002",
                tool_name=ev.tool_name
            ).all()
            assert len(tool_calls) > 0, f"No ToolCall found for evidence from {ev.tool_name}"

    def test_investigation_creates_complete_provenance_chain(self, session_with_seed):
        """Verify Alert → ToolCall → Evidence → Decision → Audit chain."""
        alert = AlertRecord(
            alert_id="INTEGRATION-TEST-CHAIN",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        with patch("app.agent.graph.llm") as mock_llm:
            mock_llm.bind_tools.return_value = mock_bound
            result = run_investigation_pipeline_integrated(session_with_seed, "INTEGRATION-TEST-CHAIN")
        
        # 1. Alert
        alert_record = session_with_seed.query(AlertRecord).filter_by(
            alert_id="INTEGRATION-TEST-CHAIN"
        ).first()
        assert alert_record is not None
        
        # 2. ToolCalls
        tool_calls = session_with_seed.query(ToolCall).filter_by(
            alert_id="INTEGRATION-TEST-CHAIN"
        ).all()
        assert len(tool_calls) >= 2
        
        # 3. Evidence
        evidence_list = session_with_seed.query(Evidence).filter_by(
            alert_id="INTEGRATION-TEST-CHAIN"
        ).all()
        assert len(evidence_list) >= 2
        
        # 4. Decision
        decision = session_with_seed.query(DecisionRecord).filter_by(
            alert_id="INTEGRATION-TEST-CHAIN"
        ).first()
        assert decision is not None
        assert decision.confidence is not None
        
        # 5. Audit
        audit = session_with_seed.query(AuditTrailRow).filter_by(
            alert_id="INTEGRATION-TEST-CHAIN"
        ).first()
        assert audit is not None
        
        # Verify chain linkage
        assert decision.id == result["decision"].id
        assert audit.decision_id == decision.id

    def test_investigation_evaluation_metadata(self, session_with_seed):
        """Verify evaluation metadata propagates through integrated pipeline."""
        alert = AlertRecord(
            alert_id="INTEGRATION-EVAL-001",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        # Set evaluation context
        run_id = EvaluationContext.start_run()
        try:
            with patch("app.agent.graph.llm") as mock_llm:
                mock_llm.bind_tools.return_value = mock_bound
                result = run_investigation_pipeline_integrated(session_with_seed, "INTEGRATION-EVAL-001")
            
            # Verify all records have evaluation metadata
            tool_calls = session_with_seed.query(ToolCall).filter_by(
                alert_id="INTEGRATION-EVAL-001"
            ).all()
            for tc in tool_calls:
                assert tc.is_evaluation is True
                assert tc.evaluation_run_id == run_id
            
            evidence_list = session_with_seed.query(Evidence).filter_by(
                alert_id="INTEGRATION-EVAL-001"
            ).all()
            for ev in evidence_list:
                assert ev.is_evaluation is True
                assert ev.evaluation_run_id == run_id
            
            decision = session_with_seed.query(DecisionRecord).filter_by(
                alert_id="INTEGRATION-EVAL-001"
            ).first()
            assert decision.is_evaluation is True
            assert decision.evaluation_run_id == run_id
            
        finally:
            EvaluationContext.end_run()

    def test_investigation_audit_verification(self, session_with_seed):
        """Verify audit records are valid and verifiable."""
        alert = AlertRecord(
            alert_id="INTEGRATION-AUDIT-001",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        with patch("app.agent.graph.llm") as mock_llm:
            mock_llm.bind_tools.return_value = mock_bound
            result = run_investigation_pipeline_integrated(session_with_seed, "INTEGRATION-AUDIT-001")
        
        # Fetch all audit records
        audits = session_with_seed.query(AuditTrailRow).filter_by(
            alert_id="INTEGRATION-AUDIT-001"
        ).order_by(AuditTrailRow.id).all()
        
        assert len(audits) > 0
        
        # Convert to dicts for verification
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
        
        # Verify chain
        verification = verify_audit_chain(audit_dicts)
        assert verification["verified"] is True, f"Audit chain verification failed: {verification}"

    def test_investigation_response_fields(self, session_with_seed):
        """Verify response object contains all required fields."""
        alert = AlertRecord(
            alert_id="INTEGRATION-RESPONSE",
            type="Suspicious Login",
            severity="HIGH",
            source_ip="192.168.1.100",
            target_asset="admin-server",
            user="alice",
            status="INGESTED"
        )
        session_with_seed.add(alert)
        session_with_seed.commit()
        
        mock_responses = mock_llm_for_testing()
        
        class MockBoundLLM:
            def __init__(self):
                self.call_count = 0
            
            def invoke(self, messages):
                idx = min(self.call_count, len(mock_responses) - 1)
                response = mock_responses[idx]
                self.call_count += 1
                return response
        
        mock_bound = MockBoundLLM()
        
        with patch("app.agent.graph.llm") as mock_llm:
            mock_llm.bind_tools.return_value = mock_bound
            result = run_investigation_pipeline_integrated(session_with_seed, "INTEGRATION-RESPONSE")
        
        # Verify all expected fields
        assert "confidence" in result or result.get("confidence") is not None
        assert result["decision"] is not None
        assert result["evidence"] is not None
        assert result["audit"] is not None
        assert result["tool_calls"] is not None
        assert result["provenance"] is not None

