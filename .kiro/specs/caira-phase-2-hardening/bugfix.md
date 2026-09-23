# CAIRA Phase 2 Hardening - Bugfix Requirements

## Introduction

Phase 2 of CAIRA hardening addresses critical vulnerabilities in data isolation, concurrency safety, audit immutability, policy clarity, and decision architecture. Phase 1 achieved 58 passing tests with real evaluation, decision-gated containment, deterministic evaluation, and timezone-aware auditing. Phase 2 builds on this foundation by eliminating evaluation pollution, fixing audit chain races, preventing audit mutation, centralizing decision policy, separating classification from action authorization, and improving concurrent investigation safety.

These fixes are essential for operational integrity, reproducibility, and confidence in the evidence-gated investigation system.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN evaluation runs execute THEN evaluation-generated alerts, evidence, and decisions are stored in the same operational tables as real incidents, polluting metrics and dashboards

1.2 WHEN evaluation runs execute twice with identical scenarios THEN metric counters increase even though results are deterministically identical, making it impossible to distinguish synthetic from real incident counts

1.3 WHEN two concurrent requests insert audit records THEN both read the same previous_hash value, both compute next blocks referencing that hash, resulting in an ambiguous chain with multiple blocks claiming the same parent hash

1.4 WHEN two concurrent investigations execute for different alerts THEN audit chain can become corrupted with out-of-order blocks or missing cross-references, breaking chain verification

1.5 WHEN an audit record exists in the database THEN an unauthorized user can issue UPDATE/DELETE API requests to modify or remove audit records, bypassing immutability guarantees

1.6 WHEN normal API endpoints handle audit records THEN UPDATE and DELETE operations succeed on audit records, allowing post-hoc modification of decision evidence

1.7 WHEN decision thresholds are hardcoded as 0.40, 0.75 across decision_engine.py and evaluator.py THEN changing policy requires editing multiple files and hunting for scattered constants, increasing risk of inconsistency

1.8 WHEN evidence confidence scores are computed THEN the same score is used both as classification output ("how likely is this malicious?") and as action authorization ("should we containment?"), preventing future policies like "MALICIOUS but don't isolate"

1.9 WHEN evidence records are created THEN they do not preserve `is_evaluation` or `evaluation_run_id` metadata, making it impossible to filter evaluation runs from operational dashboards without external context

1.10 WHEN an investigation fails mid-execution THEN the alert status can be left at "INVESTIGATING" with orphaned tool calls, partial evidence, or a decision without corresponding audit record

1.11 WHEN two investigations run concurrently on different alerts THEN there are no tests to verify audit chain remains linear, decision records are not lost, and alert status remains consistent

1.12 WHEN evaluation runs are executed THEN evaluation metrics (EGAR, audit_completeness) are heuristic-based, with no confusion matrix, calibration statistics, or unsafe_containment tracking

1.13 WHEN the Baseline-Mock agent executes THEN it is undocumented what heuristics or information sources it uses, making it impossible to assess fairness of the comparison

### Expected Behavior (Correct)

2.1 WHEN evaluation runs execute THEN all created alerts, evidence, and decisions have `is_evaluation=true` and `evaluation_run_id={run_id}`, isolating them from operational dashboards and metrics

2.2 WHEN evaluation runs execute twice with identical scenarios THEN operational metric counters do not increase, because evaluation records are excluded from operational queries

2.3 WHEN two concurrent requests insert audit records THEN only one thread/process successfully writes the next audit block, enforcing linear chain ordering through database transaction isolation and row-level locking

2.4 WHEN two concurrent investigations execute THEN audit chain remains linear with no ambiguous parent-hash references, verified by integrity check after concurrent operations

2.5 WHEN an audit record exists in the database THEN the API layer rejects UPDATE and DELETE requests with HTTP 403 Forbidden, and the model has no UPDATE method defined

2.6 WHEN an unauthorized user attempts UPDATE/DELETE on audit records via API THEN the operation is rejected and an error log entry is created for security audit

2.7 WHEN decision policy is needed THEN thresholds are centralized in a single DecisionPolicy constants module, with BENIGN_MAX, UNCERTAIN_MIN, UNCERTAIN_MAX, MALICIOUS_MIN explicitly defined

2.8 WHEN decision policy is used THEN all code (decision_engine.py, evaluator.py, tests) imports and uses the same constants from DecisionPolicy, ensuring single source of truth

2.9 WHEN evidence confidence is computed THEN the confidence engine outputs a classification (BENIGN/UNCERTAIN/MALICIOUS) as pure data, separate from action authorization logic

2.10 WHEN decision policy is applied THEN a separate decision engine layer determines actions (NO ACTION / ESCALATE / SIMULATE CONTAINMENT) based on classification, enabling future policies like "MALICIOUS but don't isolate"

2.11 WHEN evidence records are created THEN they include `is_evaluation` flag and `evaluation_run_id` field for lineage tracking, allowing evaluation runs to be filtered from operational queries

2.12 WHEN an investigation begins THEN all operations execute within a database transaction; if any step fails, the entire investigation rolls back, leaving alert status unchanged and no orphaned records

2.13 WHEN an investigation completes THEN alert status is updated atomically with all supporting records (evidence, decision, audit), ensuring no partially committed states

2.14 WHEN two concurrent investigations execute on different alerts THEN an integration test verifies audit chain is linear, decision records are not lost, and alert statuses are consistent after both complete

2.15 WHEN evaluation metrics are computed THEN they include confusion matrix (TP, TN, FP, FN), accuracy, precision, recall, unsafe_containment_count, and per-bucket calibration statistics

2.16 WHEN the Baseline-Mock agent is used THEN its documentation explicitly states what heuristics it employs, what information it has access to compared to CAIRA, and why it is a fair comparison baseline

### Unchanged Behavior (Regression Prevention)

3.1 WHEN alerts are ingested and investigated using the normal pipeline THEN alerts, evidence, decisions, and audit records are created with identical structure and timestamps as Phase 1 (backward compatible)

3.2 WHEN decision thresholds are applied in normal operation THEN classification outputs remain BENIGN/UNCERTAIN/MALICIOUS with the same semantic boundaries (0.40, 0.75) as before

3.3 WHEN decision actions are determined THEN action strings remain identical: "NO ACTION", "ESCALATE TO HUMAN ANALYST", "SIMULATED CONTAINMENT — ..." for backward compatibility with existing dashboards

3.4 WHEN evaluation scenarios are executed THEN the evaluation harness produces identical predicted_class results to Phase 1, because evaluation logic is unchanged (only data isolation changes)

3.5 WHEN existing API endpoints return Decision or Evidence records THEN the JSON schema remains compatible (no required fields removed, new fields nullable/defaulted)

3.6 WHEN existing tests query audit chains THEN the audit chain structure and verification logic remain identical, tests pass with updated data isolation only

3.7 WHEN the 58 existing Phase 1 tests execute THEN all pass without modification, because decision logic, confidence calculation, and audit verification are unchanged

3.8 WHEN investigation pipelines execute in normal operation THEN investigation flow (tool execution → evidence trust → confidence → decision → audit) remains identical

3.9 WHEN decision policy constants are introduced THEN they are initialized to the existing thresholds (0.40, 0.75), so all decisions produce identical results to Phase 1

3.10 WHEN audit records are queried in normal operation THEN the chain verification function produces identical results, because hash computation and chain validation logic are unchanged
