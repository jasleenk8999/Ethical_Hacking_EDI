import pytest
from unittest.mock import MagicMock, patch
from langchain_core.messages import AIMessage
from app.database import Base, engine, SessionLocal
from app.models.domain import AlertRecord, LogEntry, ThreatIntelRecord, AssetRecord
from app.agent.graph import compiled_graph, run_agent_investigation
from app.services.investigation import compute_confidence


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(AlertRecord).filter(AlertRecord.alert_id == "ALT-INTEG-001").delete()
    db.query(LogEntry).filter(LogEntry.user == "admin_user").delete()
    db.query(ThreatIntelRecord).filter(ThreatIntelRecord.ip == "192.168.1.100").delete()
    
    alert = AlertRecord(
        alert_id="ALT-INTEG-001",
        type="Brute Force Attack",
        severity="HIGH",
        source_ip="192.168.1.100",
        target_asset="admin_user",
        status="INGESTED"
    )
    log_entry = LogEntry(
        user="admin_user",
        event="failed_auth from 192.168.1.100",
        timestamp="2026-08-14T10:00:00Z"
    )
    intel_entry = ThreatIntelRecord(
        ip="192.168.1.100",
        malicious=True,
        confidence=0.85
    )
    db.add_all([alert, log_entry, intel_entry])
    db.commit()
    yield db
    db.close()


def test_agent_graph_integration_and_confidence_override(setup_db):
    db = setup_db

    # Scripted sequence of LLM responses:
    # Turn 1: Call log_lookup_tool
    msg1 = AIMessage(
        content="",
        tool_calls=[{
            "name": "log_lookup_tool",
            "args": {"user": "admin_user"},
            "id": "call_1"
        }]
    )
    # Turn 2: Call threat_intel_tool
    msg2 = AIMessage(
        content="",
        tool_calls=[{
            "name": "threat_intel_tool",
            "args": {"ip": "192.168.1.100"},
            "id": "call_2"
        }]
    )
    # Turn 3: Submit decision with deliberately high self-reported confidence (0.99)
    msg3 = AIMessage(
        content="",
        tool_calls=[{
            "name": "submit_decision_tool",
            "args": {
                "verdict": "malicious",
                "confidence": 0.99,
                "llm_reported_confidence": 0.99,
                "action": "isolate_host",
                "cited_evidence": "log_lookup_tool,threat_intel_tool",
                "reasoning": "High confidence self-report from LLM"
            },
            "id": "call_3"
        }]
    )

    mock_llm_responses = [msg1, msg2, msg3]

    class MockBoundLLM:
        def __init__(self):
            self.call_count = 0

        def invoke(self, messages):
            idx = min(self.call_count, len(mock_llm_responses) - 1)
            response = mock_llm_responses[idx]
            self.call_count += 1
            return response

    mock_bound = MockBoundLLM()

    with patch("app.agent.graph.llm") as mock_llm:
        mock_llm.bind_tools.return_value = mock_bound
        decision, evidence_log = run_agent_investigation(db, "ALT-INTEG-001")

        # 1. Assert graph completed
        assert decision is not None

        # 2. Assert evidence_log has the expected 2 entries gathered from tools
        assert len(evidence_log) == 2
        tool_names = [e.source_tool for e in evidence_log]
        assert "log_lookup_tool" in tool_names
        assert "threat_intel_tool" in tool_names

        # 3. Assert final decision confidence comes from compute_confidence()
        # and is DIFFERENT from the mocked LLM self-reported 0.99
        expected_computed = compute_confidence(evidence_log)
        assert decision.confidence == expected_computed
        assert decision.llm_reported_confidence == 0.99
        assert decision.confidence != decision.llm_reported_confidence
