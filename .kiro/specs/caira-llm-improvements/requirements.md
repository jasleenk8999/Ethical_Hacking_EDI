# Requirements Document

## Introduction

This document specifies requirements for systematically improving CAIRA's (SOC incident response agent) LLM-driven investigation capabilities. CAIRA currently uses LangGraph with BharatCode/Anthropic LLMs to investigate security alerts through evidence-gated reasoning, calling three investigation tools (log_lookup, threat_intel_lookup, asset_criticality_lookup) and computing trust-weighted confidence scores to make containment decisions.

The improvements focus on six key areas:
1. Enhanced LLM prompt engineering for better reasoning
2. Parallel tool execution for performance
3. Evidence correlation and contradiction detection
4. Adaptive confidence scoring with Bayesian updating
5. Asset-aware dynamic decision thresholds
6. Caching and optimization for efficiency

These enhancements aim to reduce false positive rates by 40%, improve confidence calibration by 30%, and reduce investigation time by 50% while maintaining audit trail integrity and backward compatibility.

## Glossary

- **CAIRA_Agent**: The AI-powered SOC incident response agent that investigates security alerts
- **Investigation_Tool**: One of three evidence-gathering functions: log_lookup, threat_intel_lookup, or asset_criticality_lookup
- **Evidence_Item**: A structured record containing tool output, trust tier, and raw strength score
- **Trust_Tier**: Classification of evidence reliability (VERIFIED, CORROBORATED, UNTRUSTED)
- **Confidence_Score**: Aggregated numeric score (0.0-1.0) representing investigation certainty
- **Decision_Record**: Final verdict containing confidence, action, and cited evidence
- **Chain_of_Thought**: Explicit reasoning steps the LLM outputs before making decisions
- **Bayesian_Update**: Statistical method for revising confidence as new evidence arrives
- **Asset_Criticality**: Business value classification (CRITICAL, HIGH, MEDIUM, LOW) of target systems
- **Audit_Trail**: SHA-256-chained immutable log of investigation steps
- **Evidence_Correlation**: Cross-referencing multiple evidence items to detect patterns or contradictions
- **Confidence_Calibration**: Alignment between predicted confidence and actual accuracy
- **Investigation_Cache**: Temporary storage for tool results to avoid redundant lookups
- **System_Prompt**: Instructions provided to the LLM defining its role and reasoning protocol
- **Tool_Call_Budget**: Maximum number of investigation tool invocations allowed (15)
- **False_Positive_Rate**: Percentage of benign alerts incorrectly classified as malicious
- **Decision_Threshold**: Confidence level triggering specific actions (0.75 for isolate, 0.40 for escalate)
- **Alternative_Hypothesis**: Competing explanation for observed evidence that LLM considers
- **Evidence_Contradiction**: Situation where two evidence items provide conflicting signals

## Requirements

### Requirement 1: Enhanced Chain-of-Thought Prompting

**User Story:** As a security analyst, I want CAIRA to show explicit reasoning steps, so that I can understand and trust its decision-making process.

#### Acceptance Criteria

1. WHEN the CAIRA_Agent receives an alert, THE System_Prompt SHALL instruct the LLM to output reasoning in three phases: evidence summary, threat assessment, and confidence calculation
2. WHEN computing confidence, THE CAIRA_Agent SHALL instruct the LLM to enumerate alternative hypotheses and explain why each was accepted or rejected
3. WHEN evidence items conflict, THE CAIRA_Agent SHALL require the LLM to explicitly identify the contradiction and explain resolution logic
4. THE System_Prompt SHALL include 2-3 few-shot examples demonstrating proper chain-of-thought reasoning for benign, uncertain, and malicious cases
5. WHEN the LLM submits a decision, THE Decision_Record SHALL capture the complete reasoning chain in a structured format (JSON with reasoning_steps field)
6. FOR ALL investigation runs, outputting the reasoning chain then computing the decision SHALL produce the same decision as directly computing without chain-of-thought (logical consistency property)

### Requirement 2: Parallel Tool Execution

**User Story:** As a SOC operator, I want investigations to complete faster, so that I can respond to threats quickly.

#### Acceptance Criteria

1. WHEN the CAIRA_Agent determines which Investigation_Tools to call, THE Agent SHALL execute all tools with independent inputs concurrently
2. WHEN log_lookup, threat_intel_lookup, and asset_criticality_lookup have their required parameters, THE Agent SHALL invoke all three in parallel within the same execution step
3. WHEN all parallel tool calls complete, THE Agent SHALL aggregate results into the evidence_log before proceeding
4. THE Agent SHALL complete a full investigation (3 tool calls + decision) in under 10 seconds for 95% of cases
5. WHILE maintaining parallel execution, THE Audit_Trail SHALL preserve logical ordering using step_order integers
6. IF any tool call fails during parallel execution, THEN THE Agent SHALL proceed with available evidence and record the failure in the audit log

### Requirement 3: Evidence Correlation Engine

**User Story:** As a security analyst, I want CAIRA to identify patterns across evidence sources, so that complex attack scenarios are detected.

#### Acceptance Criteria

1. WHEN the CAIRA_Agent collects multiple Evidence_Items, THE Agent SHALL compare timestamps to detect temporal correlations (events within 5 minutes)
2. WHEN threat_intel_lookup returns "malicious" AND log_lookup shows recent user activity from that IP, THE Agent SHALL increase confidence by 0.15 (corroborating evidence bonus)
3. WHEN asset_criticality_lookup returns "CRITICAL" AND threat_intel_lookup shows "benign", THE Agent SHALL flag this as a high-priority monitoring case regardless of low confidence
4. THE Agent SHALL detect and flag evidence contradictions where trust_tier is "VERIFIED" but raw_strength scores differ by >0.4 between tools
5. WHEN evidence contradiction is detected, THE Agent SHALL invoke an evidence_reconciliation step that re-queries the conflicting tool with additional context
6. FOR ALL evidence pairs, applying correlation logic in either order SHALL produce the same confidence adjustment (commutative property)

### Requirement 4: Bayesian Confidence Updating

**User Story:** As a security analyst, I want confidence scores to improve as more evidence arrives, so that decisions reflect cumulative information quality.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL maintain a prior confidence distribution initialized to Beta(2, 2) representing uncertainty
2. WHEN each Evidence_Item is collected, THE Agent SHALL update the confidence distribution using Bayesian updating based on trust_tier and raw_strength
3. WHEN computing the final Confidence_Score, THE Agent SHALL use the posterior mean of the Beta distribution
4. THE Agent SHALL compute and store confidence intervals (95% credible interval) in the Decision_Record metadata
5. WHEN evidence items are all low-strength (<0.3), THE Confidence_Score SHALL remain near 0.5 with wide confidence intervals (>0.3 width)
6. FOR ALL evidence sequences, adding evidence in different orders then computing posterior SHALL produce the same final confidence distribution (order-invariant property)

### Requirement 5: Asset-Aware Dynamic Thresholds

**User Story:** As a security operations manager, I want high-value assets protected with faster response times, so that critical systems are prioritized.

#### Acceptance Criteria

1. WHEN asset_criticality_lookup returns "CRITICAL", THE CAIRA_Agent SHALL reduce the isolation threshold from 0.75 to 0.60
2. WHEN asset_criticality_lookup returns "LOW", THE Agent SHALL increase the isolation threshold from 0.75 to 0.85
3. WHEN asset_criticality_lookup returns "HIGH", THE Agent SHALL reduce the escalation threshold from 0.40 to 0.30
4. THE Agent SHALL log the applied thresholds in the Decision_Record for audit purposes
5. WHILE using dynamic thresholds, THE Audit_Trail SHALL record both the original confidence and the adjusted action
6. WHERE the asset_criticality_lookup fails or returns null, THE Agent SHALL fall back to default thresholds (0.75, 0.40)

### Requirement 6: Investigation Result Caching

**User Story:** As a system administrator, I want to reduce redundant API calls, so that investigations are faster and more cost-efficient.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL implement an Investigation_Cache with 5-minute TTL for tool results
2. WHEN log_lookup is called with a user parameter previously queried within 5 minutes, THE Agent SHALL return the cached result
3. WHEN threat_intel_lookup is called with an IP address previously queried within 5 minutes, THE Agent SHALL return the cached result
4. THE Agent SHALL invalidate cache entries after 5 minutes or when a cache_flush event occurs
5. WHEN returning cached results, THE Audit_Trail SHALL record "CACHE_HIT" with the original query timestamp
6. FOR ALL cached queries, the returned result SHALL be identical to a fresh query at the time of caching (idempotent property)

### Requirement 7: Alternative Hypothesis Generation

**User Story:** As a security analyst, I want CAIRA to consider multiple explanations, so that premature conclusions are avoided.

#### Acceptance Criteria

1. WHEN the CAIRA_Agent has collected at least 2 Evidence_Items, THE Agent SHALL generate at least 2 alternative hypotheses (e.g., "benign scheduled task" vs "lateral movement")
2. WHEN evaluating hypotheses, THE Agent SHALL assign a likelihood score (0.0-1.0) to each based on evidence fit
3. THE Agent SHALL select the hypothesis with the highest likelihood as the primary explanation
4. WHEN the top two hypotheses have likelihood scores within 0.2 of each other, THE Agent SHALL classify the verdict as "uncertain"
5. THE Decision_Record SHALL store all generated hypotheses with their likelihood scores in a hypotheses_considered field
6. FOR ALL evidence sets, generating hypotheses then selecting the highest SHALL produce a decision consistent with the confidence-threshold mapping (monotonicity property)

### Requirement 8: Known Benign Pattern Detection

**User Story:** As a SOC analyst, I want common false positives filtered out, so that I focus on real threats.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL maintain a Known_Benign_Patterns database containing IP ranges, user patterns, and scheduled task signatures
2. WHEN threat_intel_lookup returns an IP matching a whitelisted VPN range, THE Agent SHALL set trust_tier to "VERIFIED" and raw_strength to 0.0
3. WHEN log_lookup returns user activity matching a scheduled task pattern (e.g., "backup_service at 02:00"), THE Agent SHALL reduce the alert's raw_strength by 0.3
4. THE Agent SHALL log all benign pattern matches in the Evidence_Item with reason field explaining the match
5. WHERE an analyst marks a decision as "false positive", THE Agent SHALL store the alert signature in Known_Benign_Patterns for future reference
6. FOR ALL benign pattern matches, applying the pattern filter SHALL never increase the Confidence_Score (non-increasing property)

### Requirement 9: Confidence Calibration Tracking

**User Story:** As a security operations manager, I want to measure CAIRA's accuracy, so that I can trust its confidence scores.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL maintain a Calibration_History table storing predicted confidence, actual outcome (analyst verdict), and calibration error
2. WHEN an analyst provides feedback on a Decision_Record, THE Agent SHALL compute calibration error as |predicted_confidence - actual_outcome| where actual is 1.0 for true positive, 0.0 for false positive
3. THE Agent SHALL compute weekly calibration metrics: mean absolute error, Brier score, and reliability diagram data
4. WHEN calibration error exceeds 0.3 for 10+ consecutive cases, THE Agent SHALL log a "CALIBRATION_DRIFT" alert
5. THE Agent SHALL expose a /calibration/metrics endpoint returning current calibration statistics
6. FOR ALL confidence predictions in [0.0, 0.1], the actual positive rate SHALL be within 0.15 of the predicted confidence (calibration property)

### Requirement 10: Early Stopping for High Confidence

**User Story:** As a system administrator, I want investigations to stop when confidence is already definitive, so that resources are conserved.

#### Acceptance Criteria

1. WHEN the Confidence_Score reaches 0.95 after 2 Evidence_Items, THE CAIRA_Agent SHALL skip remaining tool calls and submit the decision
2. WHEN the Confidence_Score remains below 0.10 after 2 Evidence_Items AND all tools return "no threats found", THE Agent SHALL submit a "benign" verdict early
3. THE Agent SHALL log early stopping events in the Audit_Trail with reason "EARLY_STOP_HIGH_CONFIDENCE" or "EARLY_STOP_LOW_CONFIDENCE"
4. WHILE using early stopping, THE Agent SHALL ensure at least 2 Investigation_Tools have been called before stopping
5. WHEN early stopping occurs, THE Decision_Record SHALL include a flag indicating incomplete investigation
6. IF early stopping is triggered, THEN the investigation SHALL complete in under 5 seconds (performance property)

### Requirement 11: Evidence Source Reliability Tracking

**User Story:** As a security analyst, I want CAIRA to learn which tools are most accurate, so that confidence scores improve over time.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL maintain a Tool_Reliability_History table tracking each Investigation_Tool's historical accuracy
2. WHEN an analyst confirms or rejects a decision, THE Agent SHALL update reliability scores for all tools cited in that decision
3. WHEN threat_intel_lookup has a reliability score below 0.6, THE Agent SHALL reduce its trust_weight by 0.2
4. THE Agent SHALL compute tool reliability as: (true_positives + true_negatives) / total_cited_decisions
5. THE Agent SHALL recalculate trust_weights monthly based on rolling 90-day reliability history
6. FOR ALL tools with reliability > 0.8, their Evidence_Items SHALL receive trust_weight bonus of +0.1 (reliability-based weighting property)

### Requirement 12: LLM Provider Fallback

**User Story:** As a system administrator, I want CAIRA to remain operational if one LLM provider fails, so that investigations continue uninterrupted.

#### Acceptance Criteria

1. WHEN the BharatCode API returns an error or timeout, THE CAIRA_Agent SHALL automatically retry with the Anthropic provider
2. THE Agent SHALL attempt the primary provider (configured in config.yaml) first, then fall back to the secondary provider
3. WHEN a provider fails, THE Agent SHALL log the failure in the Audit_Trail with error details
4. THE Agent SHALL complete provider failover within 3 seconds
5. WHEN using the fallback provider, THE Decision_Record SHALL record which provider was used in a metadata field
6. IF both providers fail, THEN THE Agent SHALL return a "SYSTEM_ERROR" verdict with confidence 0.0 and action "escalate" (graceful degradation property)

### Requirement 13: Enhanced System Prompt with Few-Shot Examples

**User Story:** As a machine learning engineer, I want CAIRA's prompts optimized for reasoning quality, so that LLM performance improves.

#### Acceptance Criteria

1. THE System_Prompt SHALL include a "Reasoning Framework" section with explicit instructions for threat assessment methodology
2. THE System_Prompt SHALL include 3 few-shot examples: one benign case (confidence <0.40), one uncertain case (0.40-0.75), and one malicious case (>0.75)
3. WHEN presenting examples, THE System_Prompt SHALL show the complete chain-of-thought reasoning for each case
4. THE System_Prompt SHALL instruct the LLM to quantify uncertainty by listing confidence intervals and alternative hypotheses
5. THE System_Prompt SHALL prohibit the LLM from using vague language ("maybe", "possibly") and require specific confidence values
6. FOR ALL example cases in the System_Prompt, following the demonstrated reasoning SHALL produce the correct verdict classification (example consistency property)

### Requirement 14: Evidence Contradiction Resolution Protocol

**User Story:** As a security analyst, I want conflicting evidence handled systematically, so that decisions are defensible.

#### Acceptance Criteria

1. WHEN two Evidence_Items have trust_tier "VERIFIED" but raw_strength differs by >0.4, THE CAIRA_Agent SHALL flag an Evidence_Contradiction
2. WHEN Evidence_Contradiction is detected, THE Agent SHALL invoke a reconciliation step that re-queries both conflicting tools with enhanced parameters
3. THE Agent SHALL apply a conflict resolution rule: if re-query results agree within 0.2, use the average; otherwise, escalate to "uncertain" verdict
4. THE Decision_Record SHALL document all contradictions and resolution outcomes in a contradictions_log field
5. WHEN contradictions remain unresolved after re-query, THE Agent SHALL set Confidence_Score to 0.5 regardless of other evidence
6. FOR ALL contradiction cases, applying the resolution protocol SHALL never produce confidence >0.75 (cautious resolution property)

### Requirement 15: Temporal Correlation Detection

**User Story:** As a threat hunter, I want CAIRA to detect time-based attack patterns, so that multi-stage attacks are identified.

#### Acceptance Criteria

1. WHEN multiple Evidence_Items have timestamps within 5 minutes of each other, THE CAIRA_Agent SHALL compute a temporal_correlation_score
2. WHEN log_lookup shows user login AND threat_intel_lookup shows malicious IP activity within the same 5-minute window, THE Agent SHALL increase confidence by 0.2
3. THE Agent SHALL detect sequences matching known attack patterns (e.g., reconnaissance → exploitation → lateral movement)
4. THE Agent SHALL store temporal correlation findings in the Evidence_Item content field as "temporal_pattern_detected"
5. WHEN temporal correlation score exceeds 0.7, THE Agent SHALL prioritize the case by reducing escalation threshold by 0.1
6. FOR ALL evidence pairs with timestamps T1 and T2, temporal correlation SHALL be symmetric: corr(T1, T2) = corr(T2, T1) (symmetry property)

### Requirement 16: Confidence Interval Estimation

**User Story:** As a security analyst, I want to see confidence ranges, so that I understand decision uncertainty.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL compute 95% confidence intervals for all Confidence_Scores using the Beta posterior distribution
2. WHEN the Decision_Record is created, THE Agent SHALL include confidence_interval_lower and confidence_interval_upper fields
3. WHEN the confidence interval width exceeds 0.4, THE Agent SHALL classify the verdict as "uncertain" regardless of point estimate
4. THE Agent SHALL display confidence intervals in the decision reasoning output as "[lower, upper]"
5. WHEN evidence count is <3, THE confidence interval width SHALL be >0.3 (high uncertainty)
6. FOR ALL confidence intervals, the point estimate SHALL lie within [lower, upper] bounds (interval containment property)

### Requirement 17: Risk-Adjusted Decision Framework

**User Story:** As a CISO, I want decisions to consider both threat likelihood and asset value, so that risk is properly managed.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL compute a Risk_Score as: Confidence_Score × Asset_Criticality_Weight where weights are CRITICAL=1.0, HIGH=0.7, MEDIUM=0.5, LOW=0.3
2. WHEN Risk_Score exceeds 0.60, THE Agent SHALL recommend "isolate_host" action
3. WHEN Risk_Score is between 0.30 and 0.60, THE Agent SHALL recommend "escalate" action
4. THE Decision_Record SHALL store both Confidence_Score and Risk_Score for audit purposes
5. THE Agent SHALL apply risk-adjusted thresholds only when Asset_Criticality is available; otherwise use confidence-only thresholds
6. FOR ALL cases where Risk_Score > 0.60, the action SHALL be at least "escalate" (risk-proportionate response property)

### Requirement 18: Multi-Stage Investigation Protocol

**User Story:** As a SOC analyst, I want quick initial scans followed by deep dives for unclear cases, so that resources are used efficiently.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL implement a two-stage investigation: Stage 1 (quick scan with 2 tools) and Stage 2 (deep dive with all tools + re-queries)
2. WHEN Stage 1 Confidence_Score is >0.85 or <0.15, THE Agent SHALL skip Stage 2 and finalize the decision
3. WHEN Stage 1 Confidence_Score is between 0.15 and 0.85, THE Agent SHALL proceed to Stage 2 investigation
4. THE Audit_Trail SHALL record stage transitions with timestamps and confidence at each stage
5. THE Agent SHALL complete Stage 1 in under 5 seconds and Stage 2 in under 15 seconds
6. FOR ALL cases, Stage 2 confidence SHALL have narrower intervals than Stage 1 confidence (progressive refinement property)

### Requirement 19: Explainability Scoring

**User Story:** As a security analyst, I want to measure decision explainability, so that I can trust CAIRA's reasoning.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL compute an Explainability_Score (0.0-1.0) based on: reasoning completeness, evidence citation, hypothesis generation, and contradiction handling
2. WHEN the Decision_Record includes all reasoning chain steps, THE Explainability_Score SHALL be at least 0.7
3. WHEN reasoning is incomplete or vague, THE Explainability_Score SHALL be below 0.5
4. THE Agent SHALL store Explainability_Score in the Decision_Record metadata
5. WHEN Explainability_Score is below 0.4, THE Agent SHALL log a warning and recommend human review
6. FOR ALL decisions with confidence >0.75, the Explainability_Score SHALL be >0.6 (high-confidence requires high-explainability property)

### Requirement 20: Feedback Loop Integration

**User Story:** As a SOC analyst, I want to correct CAIRA's mistakes, so that the system learns from experience.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL provide an /feedback endpoint accepting analyst verdict corrections (true_positive, false_positive, false_negative, true_negative)
2. WHEN feedback is received, THE Agent SHALL store it in a Feedback_History table linked to the Decision_Record
3. THE Agent SHALL use feedback data to retrain trust_weights monthly using logistic regression on historical accuracy
4. WHEN a false positive pattern is identified (3+ similar cases), THE Agent SHALL suggest adding it to Known_Benign_Patterns
5. THE Agent SHALL compute a Feedback_Alignment_Score showing agreement rate between CAIRA verdicts and analyst feedback
6. FOR ALL feedback corrections, the system SHALL update within 24 hours and log the change in the Audit_Trail (timely learning property)

### Requirement 21: Parser and Decision Serialization

**User Story:** As a developer, I want investigation results serialized consistently, so that external systems can consume them reliably.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL implement a Decision_Serializer that formats Decision_Records into JSON conforming to a defined schema
2. THE Decision_Serializer SHALL include all fields: alert_id, confidence, confidence_interval, verdict, action, cited_evidence, reasoning_steps, explainability_score
3. THE Agent SHALL implement a Decision_Parser that parses JSON back into Decision objects
4. THE Agent SHALL implement a Decision_Pretty_Printer that formats decisions as human-readable markdown
5. FOR ALL valid Decision objects D, parsing the serialized form SHALL produce an equivalent object: parse(serialize(D)) ≅ D (round-trip property)
6. THE Pretty_Printer output SHALL include confidence intervals, cited evidence with trust tiers, and reasoning chain formatted as numbered steps

### Requirement 22: Performance Monitoring and Alerting

**User Story:** As a DevOps engineer, I want real-time performance metrics, so that I can detect system degradation quickly.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL expose a /metrics endpoint returning: average_investigation_time, tool_call_success_rate, llm_response_time, cache_hit_rate
2. THE Agent SHALL compute and log performance metrics every 100 investigations
3. WHEN average_investigation_time exceeds 15 seconds, THE Agent SHALL log a "PERFORMANCE_DEGRADATION" alert
4. WHEN tool_call_success_rate drops below 90%, THE Agent SHALL trigger a "TOOL_FAILURE" alert
5. THE Agent SHALL track LLM provider response times and automatically switch providers if one exceeds 5 seconds consistently
6. FOR ALL 100-investigation windows, the average_investigation_time SHALL be under 10 seconds for 95% of windows (sustained performance property)

### Requirement 23: Simulation Mode Enhanced Logging

**User Story:** As a security researcher, I want detailed simulation logs, so that I can analyze CAIRA's behavior safely.

#### Acceptance Criteria

1. WHEN the CAIRA_Agent runs in simulation mode, THE Agent SHALL log all LLM prompts, tool calls, and reasoning steps to a simulation_log file
2. THE Agent SHALL record the complete LangGraph state at each node transition
3. WHEN simulation mode is enabled, THE Agent SHALL prefix all Decision_Records with "SIMULATION:" in the decision_reason field
4. THE Agent SHALL provide a /simulation/replay endpoint that re-runs a previous investigation using recorded state
5. THE simulation_log SHALL include timestamps, LLM token usage, and performance metrics for each step
6. FOR ALL simulation runs, replaying the investigation SHALL produce identical decisions given the same tool responses (deterministic replay property)

### Requirement 24: Audit Trail Integrity Verification

**User Story:** As a compliance officer, I want to verify investigation integrity, so that audit trails are trustworthy.

#### Acceptance Criteria

1. THE CAIRA_Agent SHALL verify the SHA-256 chain integrity before each investigation by validating previous_hash linkage
2. WHEN a hash mismatch is detected, THE Agent SHALL log a "INTEGRITY_VIOLATION" alert and halt the investigation
3. THE Agent SHALL compute a chain_integrity_score by checking the last 100 audit entries for hash consistency
4. THE verify_completeness function SHALL validate that all cited evidence exists in the evidence_log
5. THE Agent SHALL run integrity checks every 1000 investigations and log results
6. FOR ALL audit trail entries, computing SHA-256(entry_N || previous_hash_N) SHALL equal current_hash_N+1 (chain integrity property)

