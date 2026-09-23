"""
Test Seam for Investigation Pipeline

Provides a deterministic investigation path for testing without requiring:
- Real LLM API keys
- External LLM calls  
- Complex graph mocking

Used by integration tests to verify ToolCall persistence and provenance.
Not used in production.
"""

import json
from sqlalchemy.orm import Session
from app.models.domain import AlertRecord
from app.services.investigation_transactions import InvestigationTransaction
from app.services.investigation import compute_confidence
from app.schemas.schemas import EvidenceItem
from app.services.evaluation_context import EvaluationContext


def run_deterministic_investigation(
    db: Session,
    alert_id: str,
    scoring_method: str = "WEIGHTED_TRUST"
) -> dict:
    """
    Deterministic test investigation that mimics the integrated pipeline
    WITHOUT requiring LLM calls or external APIs.
    
    Creates:
    - 3 ToolCall records (log_lookup, threat_intel_lookup, asset_criticality_lookup)
    - 3 Evidence records from those tools
    - 1 Decision record
    - 1 Audit record
    
    All through the same InvestigationTransaction mechanism as production.
    """
    
    # Verify alert exists
    alert_record = db.query(AlertRecord).filter(AlertRecord.alert_id == alert_id).first()
    if not alert_record:
        raise ValueError(f"Alert {alert_id} not found")
    
    # Simulated tool results (deterministic, no external calls)
    simulated_evidence = [
        EvidenceItem(
            source_tool="log_lookup",
            trust_tier="corroborated",
            content={"events": ["login_failure", "account_locked"]},
            raw_strength=0.3
        ),
        EvidenceItem(
            source_tool="threat_intel_lookup",
            trust_tier="verified",
            content={"malicious": True, "confidence": 0.95},
            raw_strength=0.95
        ),
        EvidenceItem(
            source_tool="asset_criticality_lookup",
            trust_tier="untrusted",
            content={"criticality": 0.7, "role": "admin"},
            raw_strength=0.7
        ),
    ]
    
    # Start atomic transaction
    with InvestigationTransaction(db, alert_id) as tx:
        # Record ToolCalls with deterministic execution times
        tool_execution_times = {
            "log_lookup": 15.5,
            "threat_intel_lookup": 22.3,
            "asset_criticality_lookup": 18.7,
        }
        
        tool_call_records = []
        for evidence_item in simulated_evidence:
            tool_name = evidence_item.source_tool
            exec_time = tool_execution_times.get(tool_name, 20.0)
            
            tc = tx.record_tool_call(
                tool_name=tool_name,
                input_query=f"investigation for {alert_id}",
                output_result=json.dumps(evidence_item.content),
                execution_time_ms=exec_time
            )
            tool_call_records.append(tc)
        
        # Record Evidence
        evidence_items_data = []
        for idx, ev_item in enumerate(simulated_evidence):
            tool_name = ev_item.source_tool
            tier = ev_item.trust_tier.upper()
            raw_strength = ev_item.raw_strength
            
            evidence_items_data.append({
                "evidence_id": f"EV-{tool_name[:3].upper()}-{alert_id[-4:]}",
                "tool_name": tool_name,
                "evidence_type": "TEST_EVIDENCE",
                "content": ev_item.content,
                "evidence_score": raw_strength,
                "trust_tier": tier,
                "trust_weight": {
                    "VERIFIED": 1.0,
                    "CORROBORATED": 0.6,
                    "UNTRUSTED": 0.2
                }.get(tier, 0.2),
                "reason": f"Test evidence from {tool_name}",
                "raw_strength": raw_strength,
                "cited": True
            })
        
        evidence_records = tx.record_evidence(evidence_items_data)
        
        # Compute confidence
        computed_confidence = compute_confidence(simulated_evidence)
        
        # Record Decision
        decision = tx.record_decision(
            confidence=computed_confidence,
            llm_reported_confidence=computed_confidence,  # Same for deterministic test
            classification="MALICIOUS",  # Fixed for deterministic test
            action="ISOLATE",  # Fixed for deterministic test
            scoring_method=scoring_method,
            decision_reason=f"Test investigation for {alert_id}: computed confidence {computed_confidence:.2f}.",
            cited_evidence=[f"EV-{ev['tool_name'][:3].upper()}-{alert_id[-4:]}" for ev in evidence_items_data]
        )
        
        # Record Audit
        audit = tx.record_audit(
            event_type="DECISION_FINALIZED",
            reasoning_step=decision.decision_reason,
            event_content={
                "confidence": computed_confidence,
                "action": decision.action,
                "evidence_count": len(evidence_records),
                "tool_count": len(tool_call_records)
            }
        )
        
        # Commit
        tx.commit()
        
        return {
            "confidence": computed_confidence,
            "decision": decision,
            "evidence": evidence_records,
            "audit": audit,
            "tool_calls": tool_call_records,
            "provenance": tx.get_provenance_chain()
        }

