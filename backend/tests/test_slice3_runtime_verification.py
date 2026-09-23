"""
Slice 3 Runtime Verification Tests

Verifies that the integrated investigation pipeline:
1. Persists ToolCalls through actual API endpoint
2. Maintains complete provenance chain
3. Creates Decision and Audit records atomically
4. Isolates evaluation from operational data
5. Handles rollback correctly through API layer
"""

import json
import pytest
from datetime import datetime, timezone

from sqlalchemy.orm import Session


from app.models.domain import (
    AlertRecord, ToolCall, Evidence, DecisionRecord, AuditTrailRow
)
from app.services.investigation_test_seam import run_deterministic_investigation





@pytest.fixture
def setup_test_alert(test_db):
    """Create a test alert in the database."""
    alert = AlertRecord(
        alert_id="test-alert-001",
        type="TEST_ALERT",
        severity="HIGH",
        status="INGESTED",
        source_ip="192.168.1.100",
        destination_ip="10.0.0.1",
        target_asset="test-server",
        user="testuser",
        raw_payload=json.dumps({"test": True})
    )
    test_db.add(alert)
    test_db.commit()
    test_db.refresh(alert)
    return alert


class TestAPIInvestigationIntegration:
    """Integration tests for the API investigation endpoint."""
    
    def test_api_investigation_creates_toolcalls(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: POST /api/incidents/{alert_id}/investigate creates ToolCall records
        """
        alert_id = "test-alert-001"
        
        # Call API endpoint
        response = test_client_with_deterministic_investigation.post(
            f"/api/incidents/{alert_id}/investigate",
            json={"scoring_method": "WEIGHTED_TRUST"}
        )
        
        # Verify response status
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        assert data["status"] == "SUCCESS"
        assert data["alert_id"] == alert_id
        assert data["confidence"] > 0
        
        # Query database for ToolCall records
        tool_calls = test_db.query(ToolCall).filter(
            ToolCall.alert_id == alert_id
        ).all()
        
        # Verify 3 ToolCall records created
        assert len(tool_calls) == 3, f"Expected 3 ToolCalls, got {len(tool_calls)}"
        
        # Verify all ToolCalls belong to same alert
        for tc in tool_calls:
            assert tc.alert_id == alert_id
            assert tc.is_evaluation == False
            assert tc.evaluation_run_id is None
    
    def test_api_investigation_toolcall_content(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: Each ToolCall has correct content (tool_name, execution_time_ms, etc.)
        """
        alert_id = "test-alert-001"
        
        # Call API endpoint
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        
        # Query ToolCalls
        tool_calls = test_db.query(ToolCall).filter(
            ToolCall.alert_id == alert_id
        ).order_by(ToolCall.id).all()
        
        expected_tools = {
            "log_lookup": 15.5,
            "threat_intel_lookup": 22.3,
            "asset_criticality_lookup": 18.7,
        }
        
        # Verify each tool was called with correct execution time
        actual_tools = {tc.tool_name: tc.execution_time_ms for tc in tool_calls}
        for expected_tool, expected_time in expected_tools.items():
            assert expected_tool in actual_tools, f"Tool {expected_tool} not found"
            assert actual_tools[expected_tool] == expected_time, \
                f"Tool {expected_tool} execution time: expected {expected_time}, got {actual_tools[expected_tool]}"
        
        # Verify ToolCall content
        for tc in tool_calls:
            assert tc.alert_id == alert_id
            assert tc.tool_name in expected_tools
            assert tc.input_query is not None
            assert tc.output_result is not None
            assert tc.timestamp is not None
            assert tc.is_evaluation == False
            assert tc.evaluation_run_id is None
    
    def test_api_investigation_creates_evidence(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: API investigation creates 3 Evidence records
        """
        alert_id = "test-alert-001"
        
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        
        # Query Evidence
        evidence_records = test_db.query(Evidence).filter(
            Evidence.alert_id == alert_id
        ).all()
        
        # Verify 3 Evidence records
        assert len(evidence_records) == 3, f"Expected 3 Evidence, got {len(evidence_records)}"
        
        # Verify all Evidence belongs to same alert
        for ev in evidence_records:
            assert ev.alert_id == alert_id
            assert ev.is_evaluation == False
            assert ev.evaluation_run_id is None
            assert ev.tool_name in ["log_lookup", "threat_intel_lookup", "asset_criticality_lookup"]
    
    def test_api_investigation_creates_decision(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: API investigation creates 1 Decision record
        """
        alert_id = "test-alert-001"
        
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response contains decision_id
        assert "decision" in data
        assert "id" in data["decision"]
        
        # Query Decision
        decision = test_db.query(DecisionRecord).filter(
            DecisionRecord.alert_id == alert_id
        ).first()
        
        assert decision is not None
        assert decision.alert_id == alert_id
        assert decision.classification == "MALICIOUS"
        assert decision.action == "ISOLATE"
        assert decision.is_evaluation == False
        assert decision.evaluation_run_id is None
        
        # Verify response decision.id matches database
        assert data["decision"]["id"] == decision.id
    
    def test_api_investigation_creates_audit(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: API investigation creates 1 AuditTrail record
        """
        alert_id = "test-alert-001"
        
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response contains audit_id
        assert "audit_id" in data
        
        # Query Audit
        audit = test_db.query(AuditTrailRow).filter(
            AuditTrailRow.alert_id == alert_id
        ).first()
        
        assert audit is not None
        assert audit.alert_id == alert_id
        assert audit.is_evaluation == False
        assert audit.evaluation_run_id is None
        
        # Verify response audit_id matches database
        assert data["audit_id"] == audit.audit_id
    
    def test_api_investigation_complete_provenance_chain(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: Complete runtime trace from Alert → ToolCall → Evidence → Decision → Audit
        """
        alert_id = "test-alert-001"
        
        # Run investigation
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        
        # Verify Alert
        alert = test_db.query(AlertRecord).filter(
            AlertRecord.alert_id == alert_id
        ).first()
        assert alert is not None
        assert alert.status in ["PENDING", "INVESTIGATING", "INVESTIGATED"]  # Alert status after investigation
        
        # Verify ToolCalls (3)
        tool_calls = test_db.query(ToolCall).filter(
            ToolCall.alert_id == alert_id
        ).all()
        assert len(tool_calls) == 3
        
        # Verify Evidence (3)
        evidence_records = test_db.query(Evidence).filter(
            Evidence.alert_id == alert_id
        ).all()
        assert len(evidence_records) == 3
        
        # Verify each Evidence matches a ToolCall by tool_name
        tool_names = {tc.tool_name for tc in tool_calls}
        evidence_tool_names = {ev.tool_name for ev in evidence_records}
        assert evidence_tool_names == tool_names, \
            f"Evidence tools {evidence_tool_names} don't match ToolCall tools {tool_names}"
        
        # Verify Decision
        decision = test_db.query(DecisionRecord).filter(
            DecisionRecord.alert_id == alert_id
        ).first()
        assert decision is not None
        
        # Verify Audit
        audit = test_db.query(AuditTrailRow).filter(
            AuditTrailRow.alert_id == alert_id
        ).first()
        assert audit is not None
        assert audit.decision_id == decision.id
    
    def test_api_investigation_operational_flags(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: Operational investigation has is_evaluation=false, evaluation_run_id=null
        """
        alert_id = "test-alert-001"
        
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        
        # Check all artifacts
        alert = test_db.query(AlertRecord).filter(AlertRecord.alert_id == alert_id).first()
        assert alert is not None
        
        tool_calls = test_db.query(ToolCall).filter(ToolCall.alert_id == alert_id).all()
        for tc in tool_calls:
            assert tc.is_evaluation == False
            assert tc.evaluation_run_id is None
        
        evidence_records = test_db.query(Evidence).filter(Evidence.alert_id == alert_id).all()
        for ev in evidence_records:
            assert ev.is_evaluation == False
            assert ev.evaluation_run_id is None
        
        decision = test_db.query(DecisionRecord).filter(DecisionRecord.alert_id == alert_id).first()
        assert decision is not None
        assert decision.is_evaluation == False
        assert decision.evaluation_run_id is None
        
        audit = test_db.query(AuditTrailRow).filter(AuditTrailRow.alert_id == alert_id).first()
        assert audit is not None
        assert audit.is_evaluation == False
        assert audit.evaluation_run_id is None


class TestDeterministicInvestigation:
    """Tests for the deterministic test seam."""
    
    def test_run_deterministic_investigation_directly(self, test_db, setup_test_alert):
        """
        Verify: run_deterministic_investigation() works without API layer
        """
        alert_id = "test-alert-001"
        
        result = run_deterministic_investigation(test_db, alert_id)
        
        # Verify result structure
        assert "confidence" in result
        assert "decision" in result
        assert "evidence" in result
        assert "audit" in result
        assert "tool_calls" in result
        
        # Verify counts
        assert len(result["tool_calls"]) == 3
        assert len(result["evidence"]) == 3
        
        # Verify data persisted
        tool_calls = test_db.query(ToolCall).filter(ToolCall.alert_id == alert_id).all()
        assert len(tool_calls) == 3
    
    def test_deterministic_investigation_creates_operational_records(self, test_db, setup_test_alert):
        """
        Verify: deterministic investigation creates operational (non-evaluation) records
        """
        alert_id = "test-alert-001"
        
        result = run_deterministic_investigation(test_db, alert_id)
        
        # Check all records are operational
        for tc in result["tool_calls"]:
            assert tc.is_evaluation == False
            assert tc.evaluation_run_id is None
        
        for ev in result["evidence"]:
            assert ev.is_evaluation == False
            assert ev.evaluation_run_id is None
        
        assert result["decision"].is_evaluation == False
        assert result["decision"].evaluation_run_id is None
        
        assert result["audit"].is_evaluation == False
        assert result["audit"].evaluation_run_id is None


class TestAPIResponseContract:
    """Tests for API response compatibility."""
    
    def test_investigate_response_structure(self, test_client_with_deterministic_investigation, test_db, setup_test_alert):
        """
        Verify: Response contains all expected fields
        """
        alert_id = "test-alert-001"
        
        response = test_client_with_deterministic_investigation.post(f"/api/incidents/{alert_id}/investigate")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "status", "message", "alert_id", "confidence",
            "decision", "evidence_count", "audit_id", "elapsed_seconds"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Verify decision structure
        assert "id" in data["decision"]
        assert "confidence" in data["decision"]
        assert "classification" in data["decision"]
        assert "action" in data["decision"]
        assert "decision_reason" in data["decision"]
        
        # Verify types
        assert isinstance(data["evidence_count"], int)
        assert data["evidence_count"] > 0
        assert isinstance(data["audit_id"], str)
        assert len(data["audit_id"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
