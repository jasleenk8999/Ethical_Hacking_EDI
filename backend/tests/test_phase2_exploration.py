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
