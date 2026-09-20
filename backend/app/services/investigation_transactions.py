"""
Investigation Transaction Management

Provides atomic transaction handling for investigations with proper rollback
on failure at any critical step.

Ensures:
- All-or-nothing atomicity for complete investigations
- No orphaned Evidence, Decision, or Audit records on failure
- Alert status is not incorrectly left at INVESTIGATING
- ToolCall records are persisted with execution timing
- Complete provenance chain is maintained
"""

import json
import time
from typing import Dict, Any, List, Tuple
from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.domain import (
    AlertRecord, ToolCall, Evidence, DecisionRecord, AuditTrailRow
)
from app.services.evaluation_context import EvaluationContext
from app.services.audit_appender import append_audit_record


class InvestigationTransaction:
    """
    Manages atomic investigation workflows with proper transaction semantics.
    
    Usage:
        with InvestigationTransaction(db, alert_id) as tx:
            # All operations auto-rollback on exception
            tool_calls = tx.record_tool_calls([...])
            evidence_list = tx.record_evidence([...])
            decision = tx.record_decision(...)
            audit = tx.record_audit(...)
            # COMMIT on successful exit
    """
    
    def __init__(self, db: Session, alert_id: str):
        """Initialize transaction context for a single investigation."""
        self.db = db
        self.alert_id = alert_id
        self.tool_calls: List[ToolCall] = []
        self.evidence_records: List[Evidence] = []
        self.decision_record: DecisionRecord = None
        self.audit_record: AuditTrailRow = None
        self.committed = False
        
    def __enter__(self):
        """Enter transaction context."""
        # Verify alert exists
        alert = self.db.query(AlertRecord).filter(
            AlertRecord.alert_id == self.alert_id
        ).first()
        if not alert:
            raise ValueError(f"Alert {self.alert_id} not found")
        
        # Mark as INVESTIGATING (will rollback if tx fails)
        alert.status = "INVESTIGATING"
        self.db.flush()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit transaction context with automatic rollback on exception."""
        if exc_type is not None:
            # Exception occurred - rollback
            self.db.rollback()
            self.committed = False
            return False  # Re-raise the exception
        
        if not self.committed:
            # Normal exit without explicit commit - do it now
            try:
                self.db.commit()
                self.committed = True
            except SQLAlchemyError as e:
                self.db.rollback()
                self.committed = False
                raise RuntimeError(
                    f"Investigation transaction failed to commit for alert {self.alert_id}: {str(e)}"
                ) from e
        
        return True
    
    def record_tool_call(
        self,
        tool_name: str,
        input_query: str,
        output_result: str,
        execution_time_ms: float = 0.0
    ) -> ToolCall:
        """
        Record a single tool invocation with measured execution time.
        
        Args:
            tool_name: Name of the tool (log_lookup, threat_intel_lookup, asset_criticality_lookup)
            input_query: The input provided to the tool
            output_result: The result returned (as string, typically JSON)
            execution_time_ms: Execution time in milliseconds
        
        Returns:
            Persisted ToolCall record
        
        Raises:
            Exception: On database error (will trigger automatic rollback)
        """
        tool_call = ToolCall(
            alert_id=self.alert_id,
            tool_name=tool_name,
            input_query=input_query,
            output_result=output_result,
            execution_time_ms=execution_time_ms,
            is_evaluation=EvaluationContext.is_in_evaluation(),
            evaluation_run_id=EvaluationContext.get_current_run_id(),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        self.db.add(tool_call)
        self.db.flush()  # Ensure it's in DB but transaction still open
        self.tool_calls.append(tool_call)
        return tool_call
    
    def record_tool_calls(
        self,
        tool_executions: List[Tuple[str, str, str, float]]
    ) -> List[ToolCall]:
        """
        Record multiple tool invocations.
        
        Args:
            tool_executions: List of (tool_name, input, output, execution_time_ms) tuples
        
        Returns:
            List of persisted ToolCall records
        """
        results = []
        for tool_name, input_query, output_result, exec_time in tool_executions:
            result = self.record_tool_call(
                tool_name=tool_name,
                input_query=input_query,
                output_result=output_result,
                execution_time_ms=exec_time
            )
            results.append(result)
        return results
    
    def record_evidence(
        self,
        evidence_items: List[Dict[str, Any]],
        tool_calls_map: Dict[str, ToolCall] = None
    ) -> List[Evidence]:
        """
        Record evidence items from investigation.
        
        Each evidence item should contain:
        - evidence_id: Unique ID
        - tool_name: Which tool generated this
        - evidence_type: Type of evidence
        - content: Evidence content (dict or string)
        - evidence_score: Score 0.0-1.0
        - trust_tier: VERIFIED, CORROBORATED, or UNTRUSTED
        - trust_weight: Weight in confidence calculation
        - reason: Justification
        - raw_strength: Raw score from tool
        
        Args:
            evidence_items: List of evidence dictionaries
            tool_calls_map: Optional mapping from tool_name to ToolCall record for FK reference
        
        Returns:
            List of persisted Evidence records
        """
        results = []
        
        for idx, item in enumerate(evidence_items):
            # Create Evidence record
            content = item.get("content", {})
            if isinstance(content, dict):
                content_str = json.dumps(content)
            else:
                content_str = str(content)
            
            evidence = Evidence(
                evidence_id=item.get("evidence_id", f"EV-{uuid4().hex[:6].upper()}"),
                alert_id=self.alert_id,
                tool_name=item.get("tool_name", "unknown"),
                evidence_type=item.get("evidence_type", "INVESTIGATION"),
                content=content_str,
                evidence_score=float(item.get("evidence_score", 0.0)),
                trust_tier=str(item.get("trust_tier", "UNTRUSTED")).upper(),
                trust_weight=float(item.get("trust_weight", 0.2)),
                reason=item.get("reason", ""),
                raw_strength=float(item.get("raw_strength", 0.0)),
                cited=item.get("cited", False),
                step_order=idx + 1,
                is_evaluation=EvaluationContext.is_in_evaluation(),
                evaluation_run_id=EvaluationContext.get_current_run_id(),
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            
            self.db.add(evidence)
            self.db.flush()
            self.evidence_records.append(evidence)
            results.append(evidence)
        
        return results
    
    def record_decision(
        self,
        confidence: float,
        llm_reported_confidence: float,
        classification: str,
        action: str,
        scoring_method: str = "WEIGHTED_TRUST",
        decision_reason: str = "",
        cited_evidence: List[str] = None
    ) -> DecisionRecord:
        """
        Record the final decision for this investigation.
        
        Args:
            confidence: Final computed confidence (0.0-1.0)
            llm_reported_confidence: LLM's self-reported confidence
            classification: MALICIOUS, UNCERTAIN, or BENIGN
            action: ISOLATE_HOST, ESCALATE, or NONE
            scoring_method: Confidence calculation method
            decision_reason: Reasoning for decision
            cited_evidence: List of evidence IDs cited in decision
        
        Returns:
            Persisted DecisionRecord
        """
        if cited_evidence is None:
            cited_evidence = []
        
        decision = DecisionRecord(
            alert_id=self.alert_id,
            confidence=confidence,
            llm_reported_confidence=llm_reported_confidence,
            classification=classification.upper(),
            action=action.upper(),
            scoring_method=scoring_method,
            decision_reason=decision_reason,
            cited_evidence=json.dumps(cited_evidence),
            step_order=len(self.evidence_records) + 1,
            is_evaluation=EvaluationContext.is_in_evaluation(),
            evaluation_run_id=EvaluationContext.get_current_run_id(),
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        self.db.add(decision)
        self.db.flush()
        self.decision_record = decision
        return decision
    
    def record_audit(
        self,
        event_type: str = "DECISION_FINALIZED",
        reasoning_step: str = "",
        event_content: Dict[str, Any] = None
    ) -> AuditTrailRow:
        """
        Record audit trail entry for this investigation.
        
        Args:
            event_type: Type of audit event
            reasoning_step: Reasoning description
            event_content: Event metadata
        
        Returns:
            Persisted AuditTrailRow
        """
        if event_content is None:
            event_content = {}
        
        audit = append_audit_record(
            db=self.db,
            alert_id=self.alert_id,
            decision_id=self.decision_record.id if self.decision_record else None,
            event_type=event_type,
            reasoning_step=reasoning_step,
            evidence_ids=[e.evidence_id for e in self.evidence_records],
            event_content=json.dumps(event_content)
        )
        
        self.audit_record = audit
        return audit
    
    def commit(self) -> None:
        """Explicitly commit the transaction."""
        self.db.commit()
        self.committed = True
        
        # Update alert status to INVESTIGATED
        alert = self.db.query(AlertRecord).filter(
            AlertRecord.alert_id == self.alert_id
        ).first()
        if alert:
            alert.status = "INVESTIGATED"
            self.db.commit()
    
    def get_provenance_chain(self) -> Dict[str, Any]:
        """Return a dict representing the complete provenance chain."""
        return {
            "alert_id": self.alert_id,
            "evaluation_run_id": EvaluationContext.get_current_run_id(),
            "is_evaluation": EvaluationContext.is_in_evaluation(),
            "tool_calls": [
                {
                    "id": tc.id,
                    "tool_name": tc.tool_name,
                    "input_query": tc.input_query,
                    "execution_time_ms": tc.execution_time_ms,
                }
                for tc in self.tool_calls
            ],
            "evidence": [
                {
                    "evidence_id": e.evidence_id,
                    "tool_name": e.tool_name,
                    "evidence_score": e.evidence_score,
                    "trust_tier": e.trust_tier,
                }
                for e in self.evidence_records
            ],
            "decision": {
                "id": self.decision_record.id if self.decision_record else None,
                "confidence": self.decision_record.confidence if self.decision_record else None,
                "classification": self.decision_record.classification if self.decision_record else None,
            } if self.decision_record else None,
            "audit": {
                "audit_id": self.audit_record.audit_id if self.audit_record else None,
                "previous_hash": self.audit_record.previous_hash if self.audit_record else None,
                "current_hash": self.audit_record.current_hash if self.audit_record else None,
            } if self.audit_record else None,
        }

