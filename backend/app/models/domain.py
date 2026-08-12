from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, unique=True, index=True, nullable=False)
    type = Column(String, index=True, nullable=False)
    severity = Column(String, index=True, nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    source_ip = Column(String, nullable=False)
    destination_ip = Column(String, default="10.0.0.1")
    target_asset = Column(String, index=True, nullable=False)
    user = Column(String, default="system")
    description = Column(Text, nullable=True)
    raw_payload = Column(Text, nullable=True)
    status = Column(String, default="INGESTED") # INGESTED, INVESTIGATING, CLOSED, ESCALATED, CONTAINED
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())
    created_at = Column(DateTime, default=datetime.utcnow)

class ToolCall(Base):
    __tablename__ = "tool_calls"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True, nullable=False)
    tool_name = Column(String, nullable=False) # Log Lookup, Threat Intelligence, Asset Criticality
    input_query = Column(Text, nullable=False)
    output_result = Column(Text, nullable=False) # JSON formatted string
    execution_time_ms = Column(Float, default=0.0)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String, unique=True, index=True, nullable=False)
    alert_id = Column(String, index=True, nullable=False)
    tool_name = Column(String, nullable=False)
    evidence_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    evidence_score = Column(Float, nullable=False) # 0.0 to 1.0 score indicator of maliciousness/risk
    trust_tier = Column(String, nullable=False) # VERIFIED (1.0), CORROBORATED (0.6), UNTRUSTED (0.2)
    trust_weight = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String, index=True, nullable=False)
    confidence = Column(Float, nullable=False)
    classification = Column(String, nullable=False) # MALICIOUS, UNCERTAIN, BENIGN
    action = Column(String, nullable=False) # SIMULATED CONTAINMENT, ESCALATE TO HUMAN ANALYST, NO ACTION
    scoring_method = Column(String, default="WEIGHTED_TRUST") # WEIGHTED_TRUST, UNWEIGHTED_AVERAGE
    decision_reason = Column(Text, nullable=False)
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())

class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String, unique=True, index=True, nullable=False)
    alert_id = Column(String, index=True, nullable=False)
    decision_id = Column(Integer, nullable=True)
    event_type = Column(String, nullable=False)
    reasoning_step = Column(Text, nullable=False) # Structured reasoning payload
    evidence_ids = Column(Text, default="[]") # JSON list of evidence IDs
    event_content = Column(Text, nullable=False)
    previous_hash = Column(String, nullable=False)
    current_hash = Column(String, nullable=False)
    verification_status = Column(String, default="VALID")
    timestamp = Column(String, default=lambda: datetime.utcnow().isoformat())

class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    expected_result = Column(String, nullable=False)
    configuration = Column(Text, nullable=False) # JSON payload

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, index=True, nullable=False)
    scenario_name = Column(String, nullable=False)
    agent_version = Column(String, default="CAIRA-v1.0") # CAIRA-v1.0 vs Baseline-Mock
    confidence = Column(Float, nullable=False)
    predicted_class = Column(String, nullable=False)
    expected_class = Column(String, nullable=False)
    action = Column(String, nullable=False)
    egar = Column(Float, nullable=False) # Evidence-Gated Action Rate (1.0 or 0.0)
    false_positive = Column(Boolean, default=False)
    audit_completeness = Column(Float, default=1.0)
    traceability = Column(Float, default=1.0)
    ttfc = Column(Float, default=1.2) # Time to final decision (seconds / steps)
    blast_radius = Column(String, default="Low") # Low, Medium, High, Critical
    calibration_error = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
