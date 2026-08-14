from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class AlertRecord(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, index=True, nullable=False)
    severity = Column(String, index=True, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    source_ip = Column(String, nullable=False)
    destination_ip = Column(String, default="10.0.0.1")
    target_asset = Column(String, index=True, nullable=False)
    user = Column(String, default="system")
    description = Column(Text, nullable=True)
    raw_payload = Column(Text, nullable=True)
    status = Column(String, default="INGESTED")  # INGESTED, INVESTIGATING, CLOSED, ESCALATED, CONTAINED
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ToolCall(Base):
    __tablename__ = "tool_calls"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True, nullable=False)
    tool_name = Column(String, nullable=False)
    input_query = Column(Text, nullable=False)
    output_result = Column(Text, nullable=False)  # JSON formatted string
    execution_time_ms = Column(Float, default=0.0)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String, unique=True, index=True, nullable=False)
    alert_id = Column(String, index=True, nullable=False)
    tool_name = Column(String, nullable=False)
    evidence_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    evidence_score = Column(Float, nullable=False)  # 0.0 to 1.0
    trust_tier = Column(String, nullable=False)  # VERIFIED, CORROBORATED, UNTRUSTED
    trust_weight = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    raw_strength = Column(Float, default=0.0)  # 0.0 to 1.0, real tool strength
    cited = Column(Boolean, default=False)  # whether this evidence was cited by the decision
    step_order = Column(Integer, default=0)  # order in the investigation
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class DecisionRecord(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True, nullable=False)
    confidence = Column(Float, nullable=False)
    llm_reported_confidence = Column(Float, nullable=True)  # LLM's self-reported value (kept separate)
    classification = Column(String, nullable=False)  # MALICIOUS, UNCERTAIN, BENIGN
    action = Column(String, nullable=False)
    scoring_method = Column(String, default="WEIGHTED_TRUST")
    decision_reason = Column(Text, nullable=False)
    cited_evidence = Column(Text, default="[]")  # JSON list of evidence IDs cited by the LLM
    step_order = Column(Integer, default=0)
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class AuditTrailRow(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String, unique=True, index=True, nullable=False)
    alert_id = Column(String, index=True, nullable=False)
    decision_id = Column(Integer, nullable=True)
    event_type = Column(String, nullable=False)
    reasoning_step = Column(Text, nullable=False)
    evidence_ids = Column(Text, default="[]")
    event_content = Column(Text, nullable=False)
    previous_hash = Column(String, nullable=False)
    current_hash = Column(String, nullable=False)
    verification_status = Column(String, default="VALID")
    raw_strength = Column(Float, default=0.0)  # real tool strength for completeness check
    cited = Column(Boolean, default=False)  # whether this row was cited by the decision
    step_order = Column(Integer, default=0)  # causal ordering for completeness check
    timestamp = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    expected_result = Column(String, nullable=False)
    configuration = Column(Text, nullable=False)  # JSON payload


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, index=True, nullable=False)
    scenario_name = Column(String, nullable=False)
    agent_version = Column(String, default="CAIRA-v1.0")
    confidence = Column(Float, nullable=False)
    predicted_class = Column(String, nullable=False)
    expected_class = Column(String, nullable=False)
    action = Column(String, nullable=False)
    egar = Column(Float, nullable=False)
    false_positive = Column(Boolean, default=False)
    audit_completeness = Column(Float, default=1.0)
    traceability = Column(Float, default=1.0)
    ttfc = Column(Float, default=1.2)
    blast_radius = Column(String, default="Low")
    calibration_error = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- NEW: Real tool backing tables ---

class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, index=True, nullable=False)
    event = Column(String, nullable=False)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())


class ThreatIntelRecord(Base):
    __tablename__ = "threat_intel_records"

    id = Column(Integer, primary_key=True, index=True)
    ip = Column(String, index=True, nullable=False)
    malicious = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)  # 0.0 to 1.0


class AssetRecord(Base):
    __tablename__ = "asset_records"

    id = Column(Integer, primary_key=True, index=True)
    user_or_asset = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    criticality = Column(Float, default=0.0)  # 0.0 to 1.0


# Aliases for backwards compatibility
Alert = AlertRecord
Decision = DecisionRecord
AuditTrail = AuditTrailRow