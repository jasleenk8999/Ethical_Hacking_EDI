from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

class AlertIngest(BaseModel):
    id: Optional[str] = None
    type: str
    severity: str
    source_ip: str
    destination_ip: Optional[str] = "10.0.0.1"
    target_asset: str
    user: Optional[str] = "system"
    description: Optional[str] = ""
    timestamp: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None

class AlertResponse(BaseModel):
    id: int
    alert_id: str
    type: str
    severity: str
    source_ip: str
    destination_ip: str
    target_asset: str
    user: str
    description: Optional[str]
    status: str
    timestamp: str
    created_at: datetime

    class Config:
        from_attributes = True

class ToolCallResponse(BaseModel):
    id: int
    alert_id: str
    tool_name: str
    input_query: str
    output_result: str
    execution_time_ms: float
    timestamp: str

    class Config:
        from_attributes = True

class EvidenceResponse(BaseModel):
    id: int
    evidence_id: str
    alert_id: str
    tool_name: str
    evidence_type: str
    content: str
    evidence_score: float
    trust_tier: str
    trust_weight: float
    reason: str
    timestamp: str

    class Config:
        from_attributes = True

class DecisionResponse(BaseModel):
    id: int
    alert_id: str
    confidence: float
    classification: str
    action: str
    scoring_method: str
    decision_reason: str
    timestamp: str

    class Config:
        from_attributes = True

class AuditTrailResponse(BaseModel):
    id: int
    audit_id: str
    alert_id: str
    decision_id: Optional[int]
    event_type: str
    reasoning_step: str
    evidence_ids: str
    event_content: str
    previous_hash: str
    current_hash: str
    verification_status: str
    timestamp: str

    class Config:
        from_attributes = True

class ScenarioResponse(BaseModel):
    id: int
    scenario_id: str
    name: str
    description: str
    category: str
    expected_result: str
    configuration: str

    class Config:
        from_attributes = True

class EvaluationResponse(BaseModel):
    id: int
    scenario_id: str
    scenario_name: str
    agent_version: str
    confidence: float
    predicted_class: str
    expected_class: str
    action: str
    egar: float
    false_positive: bool
    audit_completeness: float
    traceability: float
    ttfc: float
    blast_radius: str
    calibration_error: float
    created_at: datetime

    class Config:
        from_attributes = True

class InvestigationRequest(BaseModel):
    scoring_method: Optional[str] = "WEIGHTED_TRUST" # WEIGHTED_TRUST vs UNWEIGHTED_AVERAGE

class InvestigationResult(BaseModel):
    alert: AlertResponse
    tool_calls: List[ToolCallResponse]
    evidence: List[EvidenceResponse]
    decision: DecisionResponse
    audit_entry: AuditTrailResponse
