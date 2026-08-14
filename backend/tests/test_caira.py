import pytest
from app.services.investigation import compute_confidence, verify_completeness
from app.models.domain import Base, Alert, Decision, AuditTrailRow, Evidence
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def test_compute_confidence_empty():
    assert compute_confidence([]) == 0.0

def test_compute_confidence_weighted():
    items = [
        {"trust_tier": "VERIFIED", "evidence_score": 0.95},       # 0.95 * 1.0 = 0.95
        {"trust_tier": "CORROBORATED", "evidence_score": 0.80},   # 0.80 * 0.6 = 0.48
        {"trust_tier": "UNTRUSTED", "evidence_score": 0.40},      # 0.40 * 0.2 = 0.08
    ]
    # Sum weighted = 0.95 + 0.48 + 0.08 = 1.51
    # Sum weights = 1.0 + 0.6 + 0.2 = 1.8
    # Expected = 1.51 / 1.8 = 0.8388888...
    expected = 1.51 / 1.8
    result = compute_confidence(items)
    assert abs(result - expected) < 1e-3

def test_compute_confidence_invalid_tier():
    items = [
        {"trust_tier": "UNKNOWN", "evidence_score": 0.90}, # Defaults weight to 0.2
    ]
    expected = (0.90 * 0.2) / 0.2
    assert abs(compute_confidence(items) - expected) < 1e-5

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_verify_completeness_full(db_session):
    alert_id = "ALT-TEST-01"

    # Add Alert
    alert = Alert(
        alert_id=alert_id,
        type="Brute Force Attack",
        severity="HIGH",
        source_ip="192.168.1.100",
        target_asset="SERVER-01",
        description="Test alert"
    )
    db_session.add(alert)

    # Add Evidence
    ev1 = Evidence(
        evidence_id="EVD-01",
        alert_id=alert_id,
        tool_name="Threat Intel",
        evidence_type="Reputation",
        trust_tier="VERIFIED",
        trust_weight=1.0,
        evidence_score=0.9,
        content="Malicious IP",
        reason="Verified threat intel feed match",
        raw_strength=0.9,
        cited=True,
        step_order=1
    )
    ev2 = Evidence(
        evidence_id="EVD-02",
        alert_id=alert_id,
        tool_name="Log Lookup",
        evidence_type="SSH Logs",
        trust_tier="CORROBORATED",
        trust_weight=0.6,
        evidence_score=0.8,
        content="Failed SSH logins",
        reason="Failed logins in log audit",
        raw_strength=0.8,
        cited=True,
        step_order=2
    )
    db_session.add_all([ev1, ev2])

    # Add Decision citing all evidence and with counterfactual reasoning
    dec = Decision(
        alert_id=alert_id,
        confidence=0.85,
        classification="MALICIOUS",
        action="SIMULATED HOST ISOLATION",
        decision_reason="Multiple failed logins from malicious IP. Alternative hypothesis of benign typo rejected.",
        cited_evidence='["EVD-01", "EVD-02"]'
    )
    db_session.add(dec)

    # Add Audit trail rows in proper step order and trust consistency
    r1 = AuditTrailRow(
        audit_id="AUD-01",
        alert_id=alert_id,
        event_type="EVIDENCE_COLLECTED",
        reasoning_step="Collected Threat Intel",
        evidence_ids='["EVD-01"]',
        event_content="Threat Intel verified",
        previous_hash="GENESIS",
        current_hash="HASH1",
        raw_strength=0.9,
        cited=True,
        step_order=1
    )
    r2 = AuditTrailRow(
        audit_id="AUD-02",
        alert_id=alert_id,
        event_type="EVIDENCE_COLLECTED",
        reasoning_step="Collected Log Lookup",
        evidence_ids='["EVD-02"]',
        event_content="Log lookup corroborating",
        previous_hash="HASH1",
        current_hash="HASH2",
        raw_strength=0.8,
        cited=True,
        step_order=2
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    res = verify_completeness(alert_id, db_session)
    assert res["alert_id"] == alert_id
    assert res["checks"]["evidence_attribution"] == 1.0
    assert res["checks"]["trust_consistency"] == 1.0
    assert res["checks"]["causal_completeness"] == 1.0
    assert res["checks"]["counterfactual_clarity"] == 1.0
    assert res["completeness_score"] == 1.0
