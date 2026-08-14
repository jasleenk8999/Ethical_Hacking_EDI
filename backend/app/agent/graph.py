import json
import os
from typing import Literal, Dict, Any, List, Optional
from uuid import uuid4

from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool

from app.schemas.schemas import Alert, EvidenceItem, Decision
from app.services.tools import log_lookup, threat_intel_lookup, asset_criticality_lookup
from app.core.config import get_settings

# ── System prompt ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are CAIRA, a SOC incident response agent. Investigate security alerts 
using three tools: log_lookup, threat_intel_lookup, and asset_criticality_lookup.

## INVESTIGATION PROTOCOL (MANDATORY)
1. Call log_lookup → check user activity
2. Call threat_intel_lookup → check IP reputation  
3. Call asset_criticality_lookup → check target value
4. ONLY THEN submit_decision with your analysis

## REASONING FORMAT
Before calling submit_decision, output your analysis in this structure:
- Evidence summary (what each tool returned)
- Threat assessment (why this is/isn't malicious)
- Confidence calculation (weighted score)
- Alternative hypotheses considered

## CRITICAL RULES
- NEVER submit a decision with fewer than 3 tool calls
- NEVER skip any tool — all 3 are required
- If evidence conflicts, note it explicitly
- Do NOT make up evidence. If a tool returns "no record found", note this honestly.
- The LLM's self-reported confidence (llm_reported_confidence) must NOT be used for the 
  final decision or action. Store it separately and only report it in the response metadata.
- For action decisions: >=0.75 malicious/isolate_host, 0.40-0.75 uncertain/escalate, 
  <0.40 benign/none.
- Cap the investigation at 15 tool calls total to prevent infinite loops.
"""

# ── LLM factory (provider-switched) ─────────────────────────────────────────────

def build_llm():
    """
    Build the LLM from config.yaml agent.provider.
    Fails fast if the required env var for the configured provider is missing.
    """
    settings = get_settings()
    provider = settings.agent.provider

    if provider == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY required when agent.provider=anthropic")
        return ChatAnthropic(
            model=settings.agent.anthropic.model,
            anthropic_api_key=key,
            temperature=0.0,
        )

    elif provider == "bharatcode":
        key = os.getenv("BHARATCODE_API_KEY")
        if not key:
            raise RuntimeError("BHARATCODE_API_KEY required when agent.provider=bharatcode")
        return ChatOpenAI(
            model=settings.agent.bharatcode.model,
            api_key=key,
            base_url=settings.agent.bharatcode.base_url,
            temperature=0.0,
        )

    else:
        raise RuntimeError(f"Unknown agent.provider: {provider!r}. Valid values: 'anthropic', 'bharatcode'")


# ── Lazy LLM initialization ─────────────────────────────────────────────────────
# Starts as None so tests can patch `llm` before it's built.
# Built on first real use (call_agent), not at import time.
llm: Any = None

# ── Real tools (bound to DB session) ──────────────────────────────────────────

@tool
def log_lookup_tool(user: str) -> Dict[str, Any]:
    """Real log lookup — queries the SQLite DB via log_lookup()."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        result = log_lookup(db, user)
        return result.model_dump()
    finally:
        db.close()


@tool
def threat_intel_tool(ip: str) -> Dict[str, Any]:
    """Real threat intel lookup — queries the SQLite DB via threat_intel_lookup()."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        result = threat_intel_lookup(db, ip)
        return result.model_dump()
    finally:
        db.close()


@tool
def asset_criticality_tool(user_or_asset: str) -> Dict[str, Any]:
    """Real asset criticality lookup — queries the SQLite DB via asset_criticality_lookup()."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        result = asset_criticality_lookup(db, user_or_asset)
        return result.model_dump()
    finally:
        db.close()


@tool
def submit_decision_tool(
    verdict: Literal["benign", "uncertain", "malicious"] = "uncertain",
    confidence: float = 0.0,
    action: Literal["none", "escalate", "isolate_host", "block_ip"] = "escalate",
    cited_evidence: str = "",
    reasoning: str = "",
    llm_reported_confidence: float = 0.0,
) -> Dict[str, Any]:
    """
    Tool the LLM calls to submit its decision.
    """
    cited_list = [c.strip() for c in cited_evidence.split(",") if c.strip()] if isinstance(cited_evidence, str) else []
    return {
        "verdict": verdict,
        "confidence": confidence,
        "llm_reported_confidence": llm_reported_confidence or confidence,
        "action": action,
        "cited_evidence": cited_list,
        "reasoning": reasoning,
    }


# ── State ────────────────────────────────────────────────────────────────────────

class AgentState(dict):
    """CAIRA agent state — stored as key/value pairs."""
    alert: Alert
    evidence_log: List[EvidenceItem]
    tool_call_count: int
    unique_tools_called: List[str]  # Track which unique tools have been called
    final_decision: Optional[Decision]
    llm_reported_confidence: float
    step: str
    messages: List[Any]


# ── Node: Agent (LLM + tool calls) ────────────────────────────────────────────

def call_agent(state: AgentState) -> dict:
    """
    The LLM reads the current state + system prompt, decides which tool to call next,
    or calls submit_decision when investigation is complete.
    """
    # Lazy build: only construct LLM on first real use (not at import time).
    global llm
    if llm is None:
        llm = build_llm()

    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    if state.get("alert"):
        a = state["alert"]
        alert_id = getattr(a, "alert_id", a.get("alert_id", "") if isinstance(a, dict) else "")
        alert_type = getattr(a, "alert_type", a.get("alert_type", "") if isinstance(a, dict) else "")
        source_ip = getattr(a, "source_ip", a.get("source_ip", "") if isinstance(a, dict) else "")
        target_user = getattr(a, "target_user", a.get("target_user", "") if isinstance(a, dict) else "")
        messages.append(
            HumanMessage(
                content=f"Alert ID: {alert_id}, Type: {alert_type}, Source IP: {source_ip}, Target: {target_user}"
            )
        )

    if state.get("evidence_log"):
        ev_lines = []
        for e in state["evidence_log"]:
            tool_name = getattr(e, "source_tool", e.get("source_tool", "") if isinstance(e, dict) else "")
            tier = getattr(e, "trust_tier", e.get("trust_tier", "") if isinstance(e, dict) else "")
            strength = float(getattr(e, "raw_strength", e.get("raw_strength", 0.0) if isinstance(e, dict) else 0.0))
            ev_lines.append(f"- {tool_name}: tier={tier}, strength={strength:.2f}")
        messages.append(HumanMessage(content="Evidence gathered so far:\n" + "\n".join(ev_lines)))

    messages.append(
        HumanMessage(content=f"Tool call count: {state.get('tool_call_count', 0)}/15")
    )

    state_msgs = state.get("messages", [])
    if state_msgs:
        messages.extend(state_msgs)

    bound_llm = llm.bind_tools([log_lookup_tool, threat_intel_tool, asset_criticality_tool, submit_decision_tool])
    result = bound_llm.invoke(messages)
    
    new_messages = list(state_msgs) + [result]
    return {
        "messages": new_messages,
        "step": "decide" if getattr(result, "tool_calls", None) else "investigate"
    }


# ── Node: Execute whatever tool the LLM called ─────────────────────────────────

def execute_tool(state: AgentState) -> dict:
    """Run the tool call the LLM made, update evidence_log or final_decision."""
    messages = state.get("messages", [])
    if not messages:
        return {}

    last_msg = messages[-1]
    tool_calls = getattr(last_msg, "tool_calls", [])
    if not tool_calls:
        return {}

    tool_call = tool_calls[0]
    tool_name = tool_call["name"]
    args = tool_call.get("args", {})

    # Special case submit_decision_tool — enforce minimum tool calls before allowing decision
    if tool_name == "submit_decision_tool":
        current_count = state.get("tool_call_count", 0)
        unique_tools = list(state.get("unique_tools_called", []))
        if len(unique_tools) < 2:
            # Track this tool call attempt so the LLM sees progress
            if "submit_decision_tool" not in unique_tools:
                unique_tools.append("submit_decision_tool")
            # Reject premature decision — force more investigation
            state_msgs = list(state.get("messages", []))
            return {
                "messages": state_msgs + [
                    HumanMessage(content=f"[SYSTEM] REJECTED: You must call at least 2 different investigation tools (log_lookup, threat_intel, asset_criticality) before submitting a decision. You have only called: {', '.join(unique_tools)}. Continue investigating.")
                ],
                "unique_tools_called": unique_tools,
                "tool_call_count": current_count + 1,
                "step": "investigate",
            }
        
        verdict_val = args.get("verdict", "uncertain")
        conf_val = float(args.get("confidence", 0.0))
        llm_conf_val = float(args.get("llm_reported_confidence", conf_val))
        action_val = args.get("action", "escalate")
        cited_ev = args.get("cited_evidence", "")
        if isinstance(cited_ev, str):
            cited_list = [c.strip() for c in cited_ev.split(",") if c.strip()]
        elif isinstance(cited_ev, list):
            cited_list = [str(c) for c in cited_ev]
        else:
            cited_list = []

        alert_obj = state.get("alert")
        alert_id_val = getattr(alert_obj, "alert_id", alert_obj.get("alert_id", "") if isinstance(alert_obj, dict) else "")

        dec = Decision(
            alert_id=alert_id_val,
            verdict=verdict_val if verdict_val in ["benign", "uncertain", "malicious"] else "uncertain",
            confidence=conf_val,
            llm_reported_confidence=llm_conf_val,
            action=action_val if action_val in ["none", "escalate", "isolate_host", "block_ip"] else "escalate",
            cited_evidence=cited_list,
        )

        return {
            "final_decision": dec,
            "step": "end",
        }

    tools_map = {
        "log_lookup_tool": log_lookup_tool,
        "threat_intel_tool": threat_intel_tool,
        "asset_criticality_tool": asset_criticality_tool,
    }

    if tool_name not in tools_map:
        # Invalid tool name — reject and ask LLM to retry
        state_msgs = list(state.get("messages", []))
        return {
            "messages": state_msgs + [
                HumanMessage(content=f"[ERROR] Unknown tool '{tool_name}'. Available tools: log_lookup_tool, threat_intel_tool, asset_criticality_tool, submit_decision_tool. Retry with a valid tool.")
            ],
            "step": "investigate",
        }

    # Validate tool arguments before execution
    if tool_name == "log_lookup_tool" and "user" not in args:
        state_msgs = list(state.get("messages", []))
        return {
            "messages": state_msgs + [
                HumanMessage(content=f"[ERROR] log_lookup_tool requires 'user' argument. You provided: {args}. Retry with correct arguments.")
            ],
            "step": "investigate",
        }
    
    if tool_name == "threat_intel_tool" and "ip" not in args:
        state_msgs = list(state.get("messages", []))
        return {
            "messages": state_msgs + [
                HumanMessage(content=f"[ERROR] threat_intel_tool requires 'ip' argument. You provided: {args}. Retry with correct arguments.")
            ],
            "step": "investigate",
        }
    
    if tool_name == "asset_criticality_tool" and "user_or_asset" not in args:
        state_msgs = list(state.get("messages", []))
        return {
            "messages": state_msgs + [
                HumanMessage(content=f"[ERROR] asset_criticality_tool requires 'user_or_asset' argument. You provided: {args}. Retry with correct arguments.")
            ],
            "step": "investigate",
        }

    func = tools_map[tool_name]
    
    # Retry logic: if tool call fails, retry up to 2 times
    max_retries = 2
    result = None
    for attempt in range(max_retries):
        try:
            result = func.invoke(args)
            break
        except Exception as e:
            if attempt == max_retries - 1:
                # All retries failed — reject and ask LLM to retry
                state_msgs = list(state.get("messages", []))
                return {
                    "messages": state_msgs + [
                        HumanMessage(content=f"[ERROR] Tool {tool_name} failed after {max_retries} attempts: {str(e)}. Please retry with a different tool or submit your decision with available evidence.")
                    ],
                    "step": "investigate",
                }
            # Retry after brief pause (handled by langchain internally)

    evidence_item = EvidenceItem(
        source_tool=tool_name,
        trust_tier=result.get("trust_tier", "corroborated"),
        content=result.get("content", {}) if isinstance(result.get("content"), dict) else {"data": str(result.get("content", ""))},
        raw_strength=float(result.get("raw_strength", 0.0)),
    )
    evidence_item.evidence_id = f"EV-{uuid4().hex[:6].upper()}"

    existing_log = list(state.get("evidence_log", []))
    existing_log.append(evidence_item)
    new_count = state.get("tool_call_count", 0) + 1
    
    # Track unique tools called
    existing_tools = list(state.get("unique_tools_called", []))
    if tool_name not in existing_tools:
        existing_tools.append(tool_name)

    return {
        "evidence_log": existing_log,
        "tool_call_count": new_count,
        "unique_tools_called": existing_tools,
    }


# ── Routing Logic & Graph Compilation ──────────────────────────────────────────

def route_after_agent(state: AgentState) -> str:
    messages = state.get("messages", [])
    if not messages:
        return "agent"
    last_msg = messages[-1]
    tool_calls = getattr(last_msg, "tool_calls", None)
    if not tool_calls:
        return "agent"  # nudge if LLM replied without tool calls
    return "execute_tool"


def route_after_execute(state: AgentState) -> str:
    if state.get("final_decision") is not None or state.get("step") == "end":
        # Hard enforcement: require at least 2 unique tools called before allowing decision
        unique_tools = state.get("unique_tools_called", [])
        if len(unique_tools) >= 2:
            return END
        else:
            # Force another iteration — LLM must call more tools
            return "agent"
    return "agent"


_graph_builder = StateGraph(AgentState)
_graph_builder.add_node("agent", call_agent)
_graph_builder.add_node("execute_tool", execute_tool)
_graph_builder.set_entry_point("agent")

_graph_builder.add_conditional_edges(
    "agent",
    route_after_agent,
    {
        "execute_tool": "execute_tool",
        "agent": "agent",
    }
)
_graph_builder.add_conditional_edges(
    "execute_tool",
    route_after_execute,
    {
        "agent": "agent",
        END: END,
    }
)

compiled_graph = _graph_builder.compile()


# ── Force decision when LLM fails to submit one ──────────────────────────────────

def force_decision(alert_id: str, evidence_log: List[EvidenceItem], force_recalc: bool = False) -> Decision:
    """
    Generate a decision when LLM fails to submit one or submits too early.
    Uses computed confidence from evidence and provides structured reasoning.
    """
    from app.services.investigation import compute_confidence
    from app.services.decision import resolve_action, resolve_verdict
    
    if not evidence_log:
        return Decision(
            alert_id=alert_id,
            verdict="uncertain",
            confidence=0.5,
            llm_reported_confidence=0.5,
            action="escalate",
            cited_evidence=[],
        )
    
    # Compute confidence from evidence
    computed_confidence = compute_confidence(evidence_log)
    
    # Build detailed reasoning from evidence
    reasoning_parts = []
    cited_evidence = []
    for i, ev in enumerate(evidence_log, 1):
        reasoning_parts.append(
            f"{i}. {ev.source_tool}: {ev.trust_tier} (strength: {ev.raw_strength:.2f})"
        )
        cited_evidence.append(ev.evidence_id if hasattr(ev, 'evidence_id') else f"EV-{i}")
    
    reasoning = "Evidence-gated investigation:\n" + "\n".join(reasoning_parts)
    
    # Determine action and verdict from computed confidence
    action = resolve_action(computed_confidence)
    verdict = resolve_verdict(computed_confidence)
    
    # If force_recalc, override LLM's self-reported confidence
    llm_reported = computed_confidence if force_recalc else computed_confidence
    
    return Decision(
        alert_id=alert_id,
        verdict=verdict,
        confidence=computed_confidence,
        llm_reported_confidence=llm_reported,
        action=action,
        cited_evidence=cited_evidence,
        decision_reason=reasoning,
    )


# ── Real investigation entrypoint ──────────────────────────────────────────────

def run_agent_investigation(db, alert_id_str: str):
    """
    Executes the LangGraph investigation agent for a given alert ID.
    Calculates weighted confidence based on evidence and overrides LLM self-reports.
    """
    from app.models.domain import AlertRecord
    from app.schemas.schemas import Alert, Decision
    from app.services.investigation import compute_confidence
    from app.services.decision import resolve_action, resolve_verdict

    alert_record = db.query(AlertRecord).filter(AlertRecord.alert_id == alert_id_str).first()
    if not alert_record:
        raise ValueError(f"Alert {alert_id_str} not found")

    alert = Alert(
        alert_id=alert_record.alert_id,
        alert_type=alert_record.type,
        source_ip=alert_record.source_ip,
        target_user=alert_record.target_asset,
        timestamp=str(alert_record.timestamp),
    )

    initial_state = {
        "alert": alert,
        "evidence_log": [],
        "tool_call_count": 0,
        "unique_tools_called": [],
        "messages": [],
        "final_decision": None,
        "step": "investigate",
    }

    # Hard limit: 10 tool calls max (was 15, too generous for smaller models)
    result = compiled_graph.invoke(initial_state, config={"recursion_limit": 20})

    evidence_log = result.get("evidence_log", [])
    raw_decision = result.get("final_decision")

    # Force decision if LLM failed to submit one (timeout or loop detected)
    if not raw_decision:
        raw_decision = force_decision(alert_id_str, evidence_log)
    elif len(evidence_log) < 2:
        # LLM submitted too early — regenerate with better reasoning
        raw_decision = force_decision(alert_id_str, evidence_log, force_recalc=True)

    # CRITICAL: Override the LLM's self-reported confidence with the computed trust formula
    computed_confidence = compute_confidence(evidence_log)
    llm_reported = raw_decision.confidence  # LLM's self-reported confidence

    final_action = resolve_action(computed_confidence)
    final_verdict = resolve_verdict(computed_confidence)

    raw_decision.confidence = computed_confidence
    raw_decision.llm_reported_confidence = llm_reported
    raw_decision.action = final_action
    raw_decision.verdict = final_verdict
    raw_decision.alert_id = alert_id_str

    return raw_decision, evidence_log
