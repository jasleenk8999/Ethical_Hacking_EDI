from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime


# --- Existing API / Response Schemas ---

class AlertIngest(BaseModel):
    alert_id: Optional[str] = None
    type: Optional[str] = None
    alert_type: Optional[str] = None
    severity: Optional[str] = None
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    target_asset: Optional[str] = None
    user: Optional[str] = None
    description: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None


class AlertResponse(BaseModel):
    id: int
    alert_id: str
    type: str
    severity: str
    source_ip: str
    target_asset: str
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
    raw_strength: float
    cited: bool
    step_order: int
    timestamp: str

    class Config:
        from_attributes = True


class DecisionResponse(BaseModel):
    id: int
    alert_id: str
    confidence: float
    llm_reported_confidence: Optional[float] = None
    classification: str
    action: str
    scoring_method: str
    decision_reason: str
    cited_evidence: str
    step_order: int
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
    step_order: int
    timestamp: str

    class Config:
        from_attributes = True


class ScenarioResponse(BaseModel):
    id: int
    scenario_id: str
    name: str
    description: str
    complexity: str
    target_type: str
    ground_truth_threat: str
    ideal_action: str
    prerequisites: str
    timestamp: str

    class Config:
        from_attributes = True


class EvaluationResponse(BaseModel):
    id: int
    eval_id: str
    scenario_id: str
    architecture: str
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
    scoring_method: Optional[str] = "WEIGHTED_TRUST"


class InvestigationResult(BaseModel):
    alert: AlertResponse
    tool_calls: List[ToolCallResponse]
    evidence: List[EvidenceResponse]
    decision: DecisionResponse
    audit_entry: AuditTrailResponse


# --- REAL: Pydantic models for the real agent ---

class Alert(BaseModel):
    alert_id: str
    alert_type: str
    source_ip: str
    target_user: str
    timestamp: str


class EvidenceItem(BaseModel):
    evidence_id: Optional[str] = None
    source_tool: str
    trust_tier: Literal["untrusted", "corroborated", "verified"]
    content: Dict[str, Any]
    raw_strength: float = Field(ge=0.0, le=1.0)


class Decision(BaseModel):
    alert_id: str
    verdict: Literal["benign", "uncertain", "malicious"]
    confidence: float = Field(ge=0.0, le=1.0)
    llm_reported_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    action: Literal["none", "escalate", "isolate_host", "block_ip"]
    cited_evidence: List[str] = Field(default_factory=list)