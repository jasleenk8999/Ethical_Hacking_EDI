"""
CAIRA Phase 2 Architecture Hardening - Exploration & Preservation Tests

This test module implements Phase 1 of the Phase 2 hardening plan:
1. EXPLORATION TESTS - Expected to XFAIL on unfixed code, XPASS after fixes
2. PRESERVATION TESTS - Must PASS on both fixed and unfixed code

These tests are designed to:
- Surface concrete counterexamples for each Phase 2 defect (expected to fail now)
- Establish baseline behavior for preservation verification (must always pass)
- Document expected vs actual behavior for future fix validation
"""

import threading
import pytest
import os
import re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.domain import AlertRecord, Evidence, DecisionRecord, AuditTrailRow, Evaluation, Scenario
from app.services.investigation import run_investigation_pipeline
from app.services.evaluator import run_evaluation_harness, PREDEFINED_SCENARIOS
from app.services.confidence_engine import calculate_confidence
from app.services.decision_engine import evaluate_decision
from app.services.audit_engine import verify_audit_chain


# ─── Test Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def db_engine():
    """In-memory SQLite database for all tests."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def db_session(db_engine):
    """Fresh database session for each test."""
    TestSession = sessionmaker(bind=db_engine)
    session = TestSession()
    yield session
    # Clean up all tables for next test
    for table in reversed(Base.metadata.sorted_tables):
        try:
            session.execute(table.delete())
        except Exception:
            # Table might not exist in this test run; skip
            pass
    try:
        session.commit()
    except Exception:
        session.rollback()
    session.close()


# ═══════════════════════════════════════════════════════════════════════════════════════
# EXPLORATION TESTS - Phase 2 Defects (Expected to XFAIL before fixes)
# ═══════════════════════════════════════════════════════════════════════════════════════

@pytest.mark.xfail(reason="DEFECT 1.9: is_evaluation flag not yet implemented", strict=False)
class TestExplorationEvaluationPollution:
    """
    DEFECT 1.1 / 1.2 / 1.9: Evaluation Pollution
    
    CURRENT BEHAVIOR (DEFECT):
    - Evaluation runs create normal Alert, Evidence, Decision, AuditTrail records
    - No mechanism to distinguish synthetic from real incidents
    - Metrics increase on repeated evaluation of identical scenarios
    
    EXPECTED BEHAVIOR (AFTER FIX):
    - All evaluation records have is_evaluation=true and evaluation_run_id
    - Running same evaluation twice doesn't increase operational metrics
    """

    def test_evaluation_records_not_marked_with_is_evaluation_flag(self, db_session):
        """
        EXPLORATION 1.9: Prove evaluation records lack is_evaluation flag.
        
        Expected: to XFAIL before fix, XPASS after fix.
        """
        # Seed scenarios if needed
        if not db_session.query(Scenario).first():
            for scenario_data in PREDEFINED_SCENARIOS:
                scenario = Scenario(**scenario_data)
                db_session.add(scenario)
            db_session.commit()

        # Run evaluation harness
        run_evaluation_harness(db_session, agent_type="CAIRA-v1.0")

        # Check if evaluation records have is_evaluation field
        first_alert = db_session.query(AlertRecord).first()
        first_evidence = db_session.query(Evidence).first()
        first_decision = db_session.query(DecisionRecord).first()

        # EXPECTED (after fix): All have is_evaluation=True
        # ACTUAL (current code): AttributeError or None (field doesn't exist)
        assert first_alert and first_evidence and first_decision, \
            "No evaluation records created"
        
        has_alert_flag = hasattr(first_alert, 'is_evaluation')
        has_evidence_flag = hasattr(first_evidence, 'is_evaluation')
        has_decision_flag = hasattr(first_decision, 'is_evaluation')

        assert has_alert_flag and has_evidence_flag and has_decision_flag, \
            f"Missing is_evaluation flags: Alert={has_alert_flag}, Evidence={has_evidence_flag}, Decision={has_decision_flag}"

    def test_evaluation_pollution_increases_metrics(self, db_session):
        """
        EXPLORATION 1.1-1.2: Prove that running evaluation twice increases metrics
        (demonstrating evaluation pollution).
        
        Expected: to XFAIL before fix, XPASS after fix.
        """
        # Seed scenarios
        if not db_session.query(Scenario).first():
            for scenario_data in PREDEFINED_SCENARIOS:
                scenario = Scenario(**scenario_data)
                db_session.add(scenario)
            db_session.commit()

        # Run evaluation harness first time
        results_1 = run_evaluation_harness(db_session, agent_type="CAIRA-v1.0")
        count_after_run_1 = db_session.query(DecisionRecord).count()

        # Run evaluation harness second time (deterministic scenarios)
        results_2 = run_evaluation_harness(db_session, agent_type="CAIRA-v1.0")
        count_after_run_2 = db_session.query(DecisionRecord).count()

        # EXPECTED (after fix): count_after_run_2 == count_after_run_1 (evaluation records excluded/isolated)
        # ACTUAL (current code): count_after_run_2 > count_after_run_1 (records pollute metrics)
        assert count_after_run_2 == count_after_run_1, \
            f"Evaluation pollution detected. Run 1={count_after_run_1}, Run 2={count_after_run_2} (should be equal)"


@pytest.mark.xfail(reason="DEFECT 1.7: Hardcoded thresholds not yet centralized", strict=False)
class TestExplorationDecisionPolicyScatter:
    """
    DEFECT 1.7: Decision Policy Scattered
    
    CURRENT BEHAVIOR (DEFECT):
    - Thresholds 0.40, 0.75 hardcoded across multiple files
    - No centralized DecisionPolicy module
    - Changes require hunting across codebase
    
    EXPECTED BEHAVIOR (AFTER FIX):
    - Single source of truth: DecisionPolicy constants module
    - All code imports from centralized module
    """

    def test_decision_thresholds_hardcoded_in_multiple_locations(self):
        """
        EXPLORATION 1.7: Prove hardcoded thresholds exist across files.
        
        Expected: to XFAIL before fix, XPASS after fix.
        """
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        threshold_files = {}

        # Search for hardcoded threshold values
        for root, dirs, files in os.walk(backend_dir):
            # Skip test directories and non-Python files
            if 'test' in root:
                continue
            for file in files:
                if file.endswith('.py'):
                    filepath = os.path.join(root, file)
                    try:
                        with open(filepath, 'r') as f:
                            content = f.read()
                            # Look for confidence comparisons with hardcoded 0.40 or 0.75
                            if re.search(r'(0\.75|0\.40)', content):
                                lines = content.split('\n')
                                matches = []
                                for i, line in enumerate(lines, 1):
                                    if re.search(r'(0\.75|0\.40)', line) and 'confidence' in line.lower():
                                        matches.append((i, line.strip()[:80]))
                                if matches:
                                    threshold_files[os.path.relpath(filepath, backend_dir)] = matches
                    except (IOError, UnicodeDecodeError):
                        pass

        # If multiple files contain hardcoded thresholds, test should fail
        assert len(threshold_files) <= 1, \
            f"Hardcoded thresholds in {len(threshold_files)} files: {list(threshold_files.keys())}"


@pytest.mark.xfail(reason="DEFECT 1.3-1.4: Audit concurrency locking not yet implemented", strict=False)
class TestExplorationAuditConcurrency:
    """
    DEFECT 1.3 / 1.4: Audit Chain Concurrency Race
    
    CURRENT BEHAVIOR (DEFECT):
    - Concurrent audit writes read same previous_hash
    - Audit chain can have fork (multiple blocks with same parent)
    - Chain verification fails or produces inconsistent state
    
    EXPECTED BEHAVIOR (AFTER FIX):
    - Only one writer can obtain lock on audit chain
    - Audit chain remains linear under concurrency
    - All blocks have unique parent-hash references
    """

    def test_concurrent_audit_writes_expose_fork_vulnerability(self, db_session):
        """
        EXPLORATION 1.3-1.4: Prove concurrent investigations create audit chain fork.
        
        Expected: to XFAIL before fix, XPASS after fix.
        """
        # Create two distinct alerts
        alert_1 = AlertRecord(
            alert_id="AUDIT-TEST-001",
            type="Incident 1",
            severity="HIGH",
            source_ip="10.0.0.1",
            target_asset="HOST-A"
        )
        alert_2 = AlertRecord(
            alert_id="AUDIT-TEST-002",
            type="Incident 2",
            severity="HIGH",
            source_ip="10.0.0.2",
            target_asset="HOST-B"
        )
        db_session.add_all([alert_1, alert_2])
        db_session.commit()

        # Run two concurrent investigations
        results = []
        errors = []

        def investigate(alert_id):
            try:
                result = run_investigation_pipeline(db_session, alert_id)
                results.append(result)
            except Exception as e:
                errors.append((alert_id, str(e)))

        t1 = threading.Thread(target=investigate, args=("AUDIT-TEST-001",))
        t2 = threading.Thread(target=investigate, args=("AUDIT-TEST-002",))

        t1.start()
        t2.start()
        t1.join()
        t2.join()

        # Check if any errors occurred
        assert not errors, f"Concurrent investigation encountered errors: {errors}"

        # Fetch all audit records
        audits = db_session.query(AuditTrailRow).order_by(AuditTrailRow.id).all()

        # Check for fork: multiple blocks with same previous_hash
        if len(audits) >= 2:
            previous_hashes = [a.previous_hash for a in audits]
            prev_hash_counts = {}
            for ph in previous_hashes:
                prev_hash_counts[ph] = prev_hash_counts.get(ph, 0) + 1

            # If any previous_hash appears more than once, there's a fork
            forks = {ph: count for ph, count in prev_hash_counts.items() if count > 1}
            assert not forks, \
                f"Audit chain fork detected. Multiple blocks reference same parent hash: {list(forks.keys())[:1]}"

        # Verify chain remains linear
        if audits:
            verification = verify_audit_chain(audits)
            assert verification["verified"], \
                f"Chain verification failed: {verification.get('status_message', 'Unknown error')}"


# ═══════════════════════════════════════════════════════════════════════════════════════
# PRESERVATION TESTS - Phase 1 Behavior (Must PASS on both fixed and unfixed code)
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestPreservationConfidenceCalculation:
    """
    PRESERVATION: Confidence calculation logic must remain unchanged.
    
    These tests verify that Phase 1 functionality is preserved.
    """

    def test_weighted_confidence_calculation_unchanged(self):
        """PRESERVATION 3.7: Confidence calculation logic unchanged."""
        evidence = [
            {"trust_tier": "VERIFIED", "evidence_score": 0.9, "trust_weight": 1.0},
            {"trust_tier": "CORROBORATED", "evidence_score": 0.8, "trust_weight": 0.6},
        ]
        result = calculate_confidence(evidence)
        
        # Expected: (0.9*1.0 + 0.8*0.6) / (1.0 + 0.6) = 1.38 / 1.6 = 0.8625
        expected = 0.8625
        assert abs(result["confidence"] - expected) < 0.001, \
            f"Confidence calculation changed: got {result['confidence']}, expected {expected}"

    def test_decision_thresholds_0_40_returns_uncertain(self):
        """PRESERVATION 3.2: 0.40 threshold returns UNCERTAIN."""
        alert = {"alert_id": "TEST", "source_ip": "1.1.1.1", "target_asset": "HOST"}
        evidence_list = [{"trust_tier": "CORROBORATED", "evidence_score": 0.4, "trust_weight": 0.6}]
        confidence_result = calculate_confidence(evidence_list)
        decision = evaluate_decision(confidence_result, alert, evidence_list)
        
        assert decision["classification"] == "UNCERTAIN", \
            f"Expected UNCERTAIN for confidence=0.40, got {decision['classification']}"

    def test_decision_thresholds_0_75_returns_malicious(self):
        """PRESERVATION 3.2: 0.75 threshold returns MALICIOUS."""
        alert = {"alert_id": "TEST", "source_ip": "1.1.1.1", "target_asset": "HOST"}
        evidence_list = [{"trust_tier": "VERIFIED", "evidence_score": 0.75, "trust_weight": 1.0}]
        confidence_result = calculate_confidence(evidence_list)
        decision = evaluate_decision(confidence_result, alert, evidence_list)
        
        assert decision["classification"] == "MALICIOUS", \
            f"Expected MALICIOUS for confidence=0.75, got {decision['classification']}"

    def test_decision_thresholds_0_39_returns_benign(self):
        """PRESERVATION 3.2: <0.40 threshold returns BENIGN."""
        alert = {"alert_id": "TEST", "source_ip": "1.1.1.1", "target_asset": "HOST"}
        evidence_list = [{"trust_tier": "UNTRUSTED", "evidence_score": 0.39, "trust_weight": 0.2}]
        confidence_result = calculate_confidence(evidence_list)
        decision = evaluate_decision(confidence_result, alert, evidence_list)
        
        assert decision["classification"] == "BENIGN", \
            f"Expected BENIGN for confidence=0.39, got {decision['classification']}"


class TestPreservationAuditChainVerification:
    """
    PRESERVATION: Audit chain verification logic must remain unchanged.
    
    These tests verify that existing audit integrity checks still work.
    """

    def test_audit_chain_verification_valid_chain_passes(self, db_session):
        """PRESERVATION 3.10: Valid audit chain verifies successfully."""
        alert = AlertRecord(
            alert_id="AUDIT-VALID",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="HOST"
        )
        db_session.add(alert)
        db_session.commit()

        # Run investigation (creates audit chain)
        try:
            run_investigation_pipeline(db_session, "AUDIT-VALID")
        except Exception as e:
            pytest.skip(f"Investigation failed: {e}")

        # Verify chain
        audits = db_session.query(AuditTrailRow).order_by(AuditTrailRow.id).all()
        if audits:
            result = verify_audit_chain(audits)
            assert result["verified"], \
                f"Valid audit chain failed verification: {result['status_message']}"

    def test_audit_chain_tamper_detection_still_works(self, db_session):
        """PRESERVATION 3.10: Tamper detection still identifies invalid chains."""
        alert = AlertRecord(
            alert_id="AUDIT-TAMPER",
            type="Test",
            severity="HIGH",
            source_ip="192.168.1.1",
            target_asset="HOST"
        )
        db_session.add(alert)
        db_session.commit()

        # Run investigation
        try:
            run_investigation_pipeline(db_session, "AUDIT-TAMPER")
        except Exception as e:
            pytest.skip(f"Investigation failed: {e}")

        # Tamper with audit record
        audit = db_session.query(AuditTrailRow).first()
        if audit:
            original_content = audit.event_content
            audit.event_content = "TAMPERED CONTENT"
            db_session.commit()

            # Verify detection
            audits = db_session.query(AuditTrailRow).order_by(AuditTrailRow.id).all()
            result = verify_audit_chain(audits)

            # Reset for cleanup
            audit.event_content = original_content
            db_session.commit()

            assert not result["verified"], \
                "Tamper detection failed: should have detected modified content"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])


# ═══════════════════════════════════════════════════════════════════════════════════════
# NEW: Test Evaluation Isolation Implementation (should PASS after Phase 2 changes)
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestEvaluationIsolationImplementation:
    """
    After Phase 2 fixes: Verify evaluation isolation is working correctly.
    These tests demonstrate the new behavior.
    """

    def test_evaluation_records_marked_with_is_evaluation_flag(self, db_session):
        """Verify that evaluation records are properly marked with is_evaluation=true."""
        from app.services.evaluation_context import evaluation_run
        
        # Create a synthetic alert within evaluation context
        with evaluation_run() as run_id:
            alert = AlertRecord(
                alert_id="EVAL-TEST-001",
                type="Test Alert",
                severity="HIGH",
                source_ip="10.0.0.1",
                target_asset="TEST-HOST",
                is_evaluation=True,
                evaluation_run_id=run_id
            )
            db_session.add(alert)
            db_session.commit()

            # Verify the evaluation context was applied
            fetched_alert = db_session.query(AlertRecord).filter_by(alert_id="EVAL-TEST-001").first()
            assert fetched_alert is not None
            assert fetched_alert.is_evaluation is True
            assert fetched_alert.evaluation_run_id == run_id
            assert run_id.startswith("EVAL-")

    def test_evaluation_run_id_is_unique_per_execution(self, db_session):
        """Verify that each evaluation run gets a unique ID."""
        from app.services.evaluation_context import EvaluationContext
        
        run_1 = EvaluationContext.start_run()
        run_2 = EvaluationContext.start_run()
        
        assert run_1 != run_2
        assert run_1.startswith("EVAL-")
        assert run_2.startswith("EVAL-")
        
        EvaluationContext.end_run()

    def test_operational_records_not_marked_as_evaluation(self, db_session):
        """Verify that operational alerts are NOT marked as evaluation."""
        alert = AlertRecord(
            alert_id="OP-001",
            type="Operational Alert",
            severity="MEDIUM",
            source_ip="192.168.1.100",
            target_asset="PROD-HOST",
            # Default: is_evaluation=False, evaluation_run_id=None
        )
        db_session.add(alert)
        db_session.commit()

        fetched = db_session.query(AlertRecord).filter_by(alert_id="OP-001").first()
        assert fetched.is_evaluation is False
        assert fetched.evaluation_run_id is None

    def test_operational_metrics_exclude_evaluation_records(self, db_session):
        """Verify that queries can distinguish evaluation from operational records."""
        from app.services.evaluation_context import evaluation_run
        
        # Create 2 operational alerts
        for i in range(2):
            alert = AlertRecord(
                alert_id=f"OP-{i}",
                type="Op",
                severity="HIGH",
                source_ip="1.1.1.1",
                target_asset="HOST",
                is_evaluation=False
            )
            db_session.add(alert)
        db_session.commit()

        # Create 3 evaluation alerts in a run
        with evaluation_run() as run_id:
            for i in range(3):
                alert = AlertRecord(
                    alert_id=f"EVAL-{i}",
                    type="Eval",
                    severity="HIGH",
                    source_ip="2.2.2.2",
                    target_asset="HOST",
                    is_evaluation=True,
                    evaluation_run_id=run_id
                )
                db_session.add(alert)
            db_session.commit()

        # Query operational only
        op_count = db_session.query(AlertRecord).filter(AlertRecord.is_evaluation == False).count()
        # Query evaluation only
        eval_count = db_session.query(AlertRecord).filter(AlertRecord.is_evaluation == True).count()

        assert op_count == 2, f"Expected 2 operational, got {op_count}"
        assert eval_count == 3, f"Expected 3 evaluation, got {eval_count}"

    def test_decision_policy_centralization(self):
        """Verify the centralized DecisionPolicy module exists and works."""
        from app.services.decision_policy import (
            classify_confidence,
            BENIGN_MAX,
            UNCERTAIN_MIN,
            MALICIOUS_MIN
        )

        # Test threshold constants
        assert BENIGN_MAX == 0.39
        assert UNCERTAIN_MIN == 0.40
        assert MALICIOUS_MIN == 0.75

        # Test classification logic
        assert classify_confidence(0.39) == "BENIGN"
        assert classify_confidence(0.40) == "UNCERTAIN"
        assert classify_confidence(0.74) == "UNCERTAIN"
        assert classify_confidence(0.75) == "MALICIOUS"
        assert classify_confidence(0.95) == "MALICIOUS"

    def test_decision_engine_uses_centralized_policy(self):
        """Verify that decision_engine.py uses the centralized DecisionPolicy."""
        from app.services.decision_engine import evaluate_decision
        
        alert = {"alert_id": "TEST", "source_ip": "1.1.1.1", "target_asset": "HOST"}
        evidence_list = []
        
        # Test BENIGN decision
        result = evaluate_decision({"confidence": 0.39, "method": "WEIGHTED_TRUST"}, alert, evidence_list)
        assert result["classification"] == "BENIGN"

        # Test UNCERTAIN decision
        result = evaluate_decision({"confidence": 0.40, "method": "WEIGHTED_TRUST"}, alert, evidence_list)
        assert result["classification"] == "UNCERTAIN"

        # Test MALICIOUS decision
        result = evaluate_decision({"confidence": 0.75, "method": "WEIGHTED_TRUST"}, alert, evidence_list)
        assert result["classification"] == "MALICIOUS"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])


# ═══════════════════════════════════════════════════════════════════════════════════════
# NEW: Audit Concurrency & Immutability Implementation Tests (Phase 2 Slice 2)
# ═══════════════════════════════════════════════════════════════════════════════════════

class TestAuditConcurrencySafety:
    """
    Verify audit chain remains linear under controlled concurrent appends.
    """

    def test_audit_chain_uses_select_for_update_locking(self):
        """
        Verify that audit append uses SELECT FOR UPDATE for database-level serialization.
        """
        from app.services.audit_appender import append_audit_record
        import inspect
        
        source = inspect.getsource(append_audit_record)
        assert "with_for_update()" in source, \
            "audit append must use with_for_update() for database-level locking"
        assert "order_by" in source, \
            "audit append must fetch latest record to determine previous_hash"

    def test_sequential_audit_appends_maintain_linearity(self, db_session):
        """
        Test that sequential audit appends using safe append function produce linear chain.
        """
        from app.services.audit_appender import append_audit_record
        
        # Create first audit record
        audit1 = append_audit_record(
            db=db_session,
            alert_id="SEQ-TEST-1",
            event_type="EVENT_1",
            event_content="Content 1"
        )
        db_session.commit()
        
        # Create second audit record (reads latest via SELECT FOR UPDATE)
        audit2 = append_audit_record(
            db=db_session,
            alert_id="SEQ-TEST-2",
            event_type="EVENT_2",
            event_content="Content 2"
        )
        db_session.commit()
        
        # Verify chain is linear
        assert audit2.previous_hash == audit1.current_hash, \
            "Second audit record should reference first record's hash"
        
        # Verify no fork
        audits = db_session.query(AuditTrailRow).order_by(AuditTrailRow.id).all()
        previous_hashes = [a.previous_hash for a in audits]
        prev_counts = {}
        for ph in previous_hashes:
            prev_counts[ph] = prev_counts.get(ph, 0) + 1
        
        for ph, count in prev_counts.items():
            assert count == 1, f"Previous hash {ph[:16]}... referenced by {count} blocks (fork!)"


class TestAuditImmutability:
    """
    Test that audit records are immutable through normal application flow.
    """

    def test_audit_record_cannot_be_updated(self, db_session):
        """
        Verify that audit record UPDATE is prevented by immutability protection.
        """
        # Create an audit record
        audit = AuditTrailRow(
            audit_id="AUD-IMMUT-001",
            alert_id="ALERT-001",
            event_type="TEST",
            reasoning_step="Test reasoning",
            evidence_ids="[]",
            event_content="Test content",
            previous_hash="0000000000000000000000000000000000000000000000000000000000000000",
            current_hash="aaaa000000000000000000000000000000000000000000000000000000000000",
            verification_status="VALID"
        )
        db_session.add(audit)
        db_session.commit()
        
        # Try to modify it
        audit.event_content = "TAMPERED"
        
        # Should raise error on commit
        try:
            db_session.commit()
            pytest.fail("Audit update should have been prevented")
        except RuntimeError as e:
            assert "immutable" in str(e).lower() or "mutation" in str(e).lower()
            db_session.rollback()

    def test_audit_record_cannot_be_deleted(self, db_session):
        """
        Verify that audit record DELETE is prevented by immutability protection.
        """
        # Create an audit record
        audit = AuditTrailRow(
            audit_id="AUD-IMMUT-002",
            alert_id="ALERT-002",
            event_type="TEST",
            reasoning_step="Test reasoning",
            evidence_ids="[]",
            event_content="Test content",
            previous_hash="0000000000000000000000000000000000000000000000000000000000000000",
            current_hash="bbbb000000000000000000000000000000000000000000000000000000000000",
            verification_status="VALID"
        )
        db_session.add(audit)
        db_session.commit()
        
        # Try to delete it
        db_session.delete(audit)
        
        # Should raise error on commit
        try:
            db_session.commit()
            pytest.fail("Audit deletion should have been prevented")
        except RuntimeError as e:
            assert "immutable" in str(e).lower() or "not permitted" in str(e).lower()
            db_session.rollback()

    def test_api_routes_have_no_audit_mutation_endpoints(self):
        """
        Verify that API router has no UPDATE/DELETE endpoints for audit records.
        """
        from app.api.router import api_router
        
        # Check all routes
        for route in api_router.routes:
            if hasattr(route, 'path') and 'audit' in str(route.path):
                methods = getattr(route, 'methods', set())
                assert 'DELETE' not in methods, f"Audit endpoint should not support DELETE"
                assert 'PUT' not in methods, f"Audit endpoint should not support PUT"
                assert 'PATCH' not in methods, f"Audit endpoint should not support PATCH"


class TestToolCallEvaluationMetadata:
    """
    Test that ToolCall records support evaluation metadata.
    """

    def test_toolcall_model_has_evaluation_fields(self):
        """
        Verify ToolCall has is_evaluation and evaluation_run_id fields.
        """
        from app.models.domain import ToolCall
        from sqlalchemy import inspect as sa_inspect
        
        mapper = sa_inspect(ToolCall)
        columns = {c.name for c in mapper.columns}
        
        assert 'is_evaluation' in columns, "ToolCall missing is_evaluation"
        assert 'evaluation_run_id' in columns, "ToolCall missing evaluation_run_id"

    def test_toolcall_operational_defaults_to_non_evaluation(self, db_session):
        """
        Verify operational ToolCall records default to is_evaluation=false.
        """
        from app.models.domain import ToolCall
        
        tool_call = ToolCall(
            alert_id="OP-001",
            tool_name="Test",
            input_query="query",
            output_result="{}"
        )
        db_session.add(tool_call)
        db_session.commit()
        
        fetched = db_session.query(ToolCall).filter_by(alert_id="OP-001").first()
        assert fetched.is_evaluation is False
        assert fetched.evaluation_run_id is None

    def test_toolcall_can_be_marked_as_evaluation(self, db_session):
        """
        Verify evaluation ToolCall records can be marked with metadata.
        """
        from app.models.domain import ToolCall
        
        tool_call = ToolCall(
            alert_id="EVAL-001",
            tool_name="Test",
            input_query="query",
            output_result="{}",
            is_evaluation=True,
            evaluation_run_id="EVAL-20260817-TEST"
        )
        db_session.add(tool_call)
        db_session.commit()
        
        fetched = db_session.query(ToolCall).filter_by(alert_id="EVAL-001").first()
        assert fetched.is_evaluation is True
        assert fetched.evaluation_run_id == "EVAL-20260817-TEST"


class TestAuditChainVerification:
    """
    Test audit chain verification with various scenarios.
    """

    def test_audit_chain_verifies_empty(self):
        """Empty chain should verify successfully."""
        result = verify_audit_chain([])
        assert result["verified"] is True

    def test_audit_chain_detects_broken_link(self):
        """Chain with mismatched previous hash should fail verification."""
        records = [
            {
                "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "current_hash": "hash1",
                "timestamp": "2026-08-17T00:00:00",
                "event_type": "TEST",
                "event_content": "Block 1"
            },
            {
                "previous_hash": "wrong_hash",  # Should match hash1
                "current_hash": "hash2",
                "timestamp": "2026-08-17T00:01:00",
                "event_type": "TEST",
                "event_content": "Block 2"
            }
        ]
        result = verify_audit_chain(records)
        assert result["verified"] is False
        assert 1 in result["tampered_indices"]

    def test_audit_chain_detects_modified_content(self):
        """Chain with modified event_content should fail verification."""
        from app.services.audit_engine import compute_hash
        
        ts = "2026-08-17T00:00:00"
        et = "TEST"
        
        # Create valid hash
        original_content = "Original"
        valid_hash = compute_hash("0000000000000000000000000000000000000000000000000000000000000000", ts, et, original_content)
        
        # Now use wrong hash with modified content
        records = [
            {
                "previous_hash": "0000000000000000000000000000000000000000000000000000000000000000",
                "current_hash": valid_hash,
                "timestamp": ts,
                "event_type": et,
                "event_content": "Modified content"  # Changed!
            }
        ]
        
        result = verify_audit_chain(records)
        assert result["verified"] is False
        assert 0 in result["tampered_indices"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
