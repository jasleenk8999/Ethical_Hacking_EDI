import json
import hashlib
from typing import List, Dict, Any, Union
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.domain import AlertRecord, Evidence, DecisionRecord, AuditTrailRow

TRUST_WEIGHTS = {
    "VERIFIED": 1.0,
    "CORROBORATED": 0.6,
    "UNTRUSTED": 0.2
}


def compute_confidence(evidence_items: List[Union[Dict[str, Any], Any]]) -> float:
    """
    Computes trust-weighted aggregate confidence score from evidence items:
    Confidence = sum(evidence_score * trust_weight) / sum(trust_weight)
    """
    if not evidence_items:
        return 0.0

    total_weighted = 0.0
    total_weight = 0.0

    for item in evidence_items:
        if isinstance(item, dict):
            tier = str(item.get("trust_tier", "UNTRUSTED") or "UNTRUSTED").upper()
            score_val = item.get("evidence_score") if item.get("evidence_score") is not None else item.get("raw_strength", 0.0)
            score = float(score_val or 0.0)
            w = item.get("trust_weight")
            weight = float(w) if w is not None and float(w) > 0 else TRUST_WEIGHTS.get(tier, 0.2)
        else:
            tier = str(getattr(item, "trust_tier", "UNTRUSTED") or "UNTRUSTED").upper()
            score_val = getattr(item, "evidence_score", None)
            if score_val is None:
                score_val = getattr(item, "raw_strength", 0.0)
            score = float(score_val or 0.0)
            w = getattr(item, "trust_weight", None)
            weight = float(w) if w is not None and float(w) > 0 else TRUST_WEIGHTS.get(tier, 0.2)

        total_weighted += score * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    return round(total_weighted / total_weight, 4)


def verify_completeness(alert_id: str, db: Session) -> Dict[str, Any]:
    """
    Performs 4-way audit completeness & integrity verification for a given alert:
    1. Evidence Attribution: Ensure all gathered evidence was cited in decision
    2. Trust Consistency: Ensure evidence trust weights match raw strength ordering
    3. Causal Completeness: Ensure audit step ordering is monotonically increasing
    4. Counterfactual Clarity: Recomputes confidence using ONLY cited evidence items
       and verifies that the resulting action band matches the decision's stored action band.
    """
    decision = db.query(DecisionRecord).filter(DecisionRecord.alert_id == alert_id).first()
    evidence_items = db.query(Evidence).filter(Evidence.alert_id == alert_id).all()
    audit_rows = db.query(AuditTrailRow).filter(AuditTrailRow.alert_id == alert_id).order_by(AuditTrailRow.step_order.asc()).all()

    # 1. Evidence Attribution Check
    if not decision or not evidence_items:
        attribution_score = 0.0
    else:
        cited_ids = set()
        if decision.cited_evidence:
            try:
                raw_cited = json.loads(decision.cited_evidence)
                if isinstance(raw_cited, list):
                    cited_ids = set(raw_cited)
                elif isinstance(raw_cited, str):
                    cited_ids = {raw_cited}
            except Exception:
                cited_ids = set()
        all_ids = {e.evidence_id for e in evidence_items}
        all_tools = {e.tool_name for e in evidence_items}
        matched = cited_ids.intersection(all_ids).union(cited_ids.intersection(all_tools))
        if all_ids:
            attribution_score = min(1.0, len(matched) / len(all_ids)) if matched else (0.5 if cited_ids else 0.0)
        else:
            attribution_score = 1.0

    # 2. Trust Consistency Check
    if not evidence_items:
        trust_consistency_score = 1.0
    else:
        inversions = 0
        total_pairs = 0
        for i in range(len(evidence_items)):
            for j in range(i + 1, len(evidence_items)):
                total_pairs += 1
                e1, e2 = evidence_items[i], evidence_items[j]
                if (e1.raw_strength > e2.raw_strength and e1.trust_weight < e2.trust_weight) or \
                   (e1.raw_strength < e2.raw_strength and e1.trust_weight > e2.trust_weight):
                    inversions += 1
        trust_consistency_score = 1.0 - (inversions / total_pairs) if total_pairs > 0 else 1.0

    # 3. Causal Completeness Check
    if not audit_rows:
        causal_score = 0.0
    else:
        is_ordered = True
        for idx in range(1, len(audit_rows)):
            if audit_rows[idx].step_order <= audit_rows[idx - 1].step_order:
                is_ordered = False
                break
        causal_score = 1.0 if is_ordered else 0.5

    # 4. Counterfactual Clarity Check (Task 5: Recompute confidence on cited evidence only)
    if not decision or not evidence_items:
        counterfactual_score = 0.0
        counterfactual_reason = "No decision or evidence items found"
    else:
        from app.services.decision import resolve_action
        cited_ids = set()
        if decision.cited_evidence:
            try:
                raw_cited = json.loads(decision.cited_evidence)
                if isinstance(raw_cited, list):
                    cited_ids = set(raw_cited)
                elif isinstance(raw_cited, str):
                    cited_ids = {raw_cited}
            except Exception:
                cited_ids = set()

        cited_items = [
            e for e in evidence_items 
            if e.cited or e.evidence_id in cited_ids or e.tool_name in cited_ids
        ]
        if not cited_items:
            cited_items = evidence_items

        cited_confidence = compute_confidence(cited_items)
        cited_action_band = resolve_action(cited_confidence)

        act_lower = decision.action.lower()
        if "isolat" in act_lower or "contain" in act_lower or "block" in act_lower:
            stored_action_band = "isolate_host"
        elif "escalat" in act_lower:
            stored_action_band = "escalate"
        else:
            stored_action_band = "none"

        if cited_action_band == stored_action_band:
            counterfactual_score = 1.0
            counterfactual_reason = f"Passed: Cited action band '{cited_action_band}' matches stored action band '{stored_action_band}'"
        else:
            counterfactual_score = 0.0
            counterfactual_reason = f"Failed: Cited action band '{cited_action_band}' (conf={cited_confidence:.2f}) does not match stored action band '{stored_action_band}'"

    checks = {
        "evidence_attribution": round(attribution_score, 2),
        "trust_consistency": round(trust_consistency_score, 2),
        "causal_completeness": round(causal_score, 2),
        "counterfactual_clarity": round(counterfactual_score, 2)
    }

    completeness_score = round(sum(checks.values()) / 4.0, 2)

    return {
        "alert_id": alert_id,
        "completeness_score": completeness_score,
        "checks": checks,
        "counterfactual_reason": counterfactual_reason,
        "is_complete": completeness_score >= 0.85
    }


def run_investigation_pipeline(db: Session, alert_id_str: str, scoring_method: str = "WEIGHTED_TRUST"):
    """
    Entrypoint wrapper for running agent investigation pipeline and saving records.
    """
    from app.agent.graph import run_agent_investigation
    from app.services.decision import resolve_action, resolve_verdict

    alert_record = db.query(AlertRecord).filter(AlertRecord.alert_id == alert_id_str).first()
    if not alert_record:
        raise ValueError(f"Alert {alert_id_str} not found")

    raw_decision, evidence_log = run_agent_investigation(db, alert_id_str)

    db_evidence_list = []
    for idx, ev in enumerate(evidence_log):
        tier = ev.trust_tier.upper() if hasattr(ev, "trust_tier") else "UNTRUSTED"
        weight = TRUST_WEIGHTS.get(tier, 0.2)
        ev_id = getattr(ev, "evidence_id", f"EV-{uuid4().hex[:6].upper()}")
        tool_name = getattr(ev, "source_tool", "unknown_tool")
        content = getattr(ev, "content", {})
        raw_str = float(getattr(ev, "raw_strength", 0.0))

        ev_record = Evidence(
            evidence_id=ev_id,
            alert_id=alert_id_str,
            tool_name=tool_name,
            evidence_type="AGENT_LOOKUP",
            content=json.dumps(content) if isinstance(content, dict) else str(content),
            evidence_score=raw_str,
            trust_tier=tier,
            trust_weight=weight,
            reason=f"Agent lookup via {tool_name}",
            raw_strength=raw_str,
            cited=(tool_name in raw_decision.cited_evidence or ev_id in raw_decision.cited_evidence),
            step_order=idx + 1
        )
        db.add(ev_record)
        db_evidence_list.append(ev_record)

    db_decision = DecisionRecord(
        alert_id=alert_id_str,
        confidence=raw_decision.confidence,
        llm_reported_confidence=raw_decision.llm_reported_confidence,
        classification=raw_decision.verdict.upper(),
        action=raw_decision.action.upper(),
        scoring_method=scoring_method,
        decision_reason=f"Evidence-gated investigation for {alert_id_str}: computed confidence {raw_decision.confidence:.2f} (LLM reported: {raw_decision.llm_reported_confidence:.2f}).",
        cited_evidence=json.dumps(raw_decision.cited_evidence),
        step_order=len(evidence_log) + 1
    )
    db.add(db_decision)
    db.flush()

    prev_audit = db.query(AuditTrailRow).order_by(AuditTrailRow.id.desc()).first()
    prev_hash = prev_audit.current_hash if prev_audit else "0000000000000000000000000000000000000000000000000000000000000000"
    payload = f"{alert_id_str}:{db_decision.id}:DECISION:{db_decision.decision_reason}:{prev_hash}"
    curr_hash = hashlib.sha256(payload.encode()).hexdigest()

    audit_entry = AuditTrailRow(
        audit_id=f"AUD-{uuid4().hex[:6].upper()}",
        alert_id=alert_id_str,
        decision_id=db_decision.id,
        event_type="DECISION_FINALIZED",
        reasoning_step=db_decision.decision_reason,
        evidence_ids=json.dumps([e.evidence_id for e in db_evidence_list]),
        event_content=json.dumps({"confidence": raw_decision.confidence, "llm_reported": raw_decision.llm_reported_confidence, "action": raw_decision.action}),
        previous_hash=prev_hash,
        current_hash=curr_hash,
        verification_status="VALID"
    )
    db.add(audit_entry)

    alert_record.status = "INVESTIGATED"
    db.commit()

    return {
        "confidence": raw_decision.confidence,
        "decision": db_decision,
        "evidence": db_evidence_list,
        "audit": audit_entry,
        "raw_decision": raw_decision,
        "evidence_log": evidence_log
    }
