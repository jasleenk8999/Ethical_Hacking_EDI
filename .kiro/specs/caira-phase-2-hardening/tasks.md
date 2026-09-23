# CAIRA Phase 2 Hardening - Implementation Plan

## Overview

This implementation plan follows the exploratory bugfix workflow:
1. Write exploration tests on unfixed code to surface each vulnerability
2. Write preservation tests to verify existing behavior is unchanged
3. Implement fixes based on understanding from exploration phase
4. Verify exploration tests pass (confirming fix works)
5. Verify preservation tests still pass (confirming no regressions)

**CRITICAL**: Tasks 1 and 2 must be completed BEFORE implementing fixes. These tests demonstrate the bugs exist and establish baseline behavior for preservation verification.

---

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - CAIRA Phase 2 Vulnerabilities
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms vulnerabilities exist
  - **DO NOT attempt to fix the test or code when it fails**
  - **GOAL**: Surface concrete counterexamples demonstrating each vulnerability
  - **Scoped PBT Approach**: For each of the 10 bugs, create a deterministic test case that demonstrates the specific failure mode
  
  Test implementation details from Bug Condition specification in design:
  
  **Evaluation Pollution Test**: 
  - Create evaluation run #1 → count operational metrics
  - Run same evaluation again → verify operational metric counters unchanged (must fail on unfixed)
  - Expected: Count increases on unfixed code (evaluation records not marked)
  
  **Audit Chain Concurrency Test**:
  - Launch two concurrent investigations (threading.Thread)
  - Fetch all AuditTrail records
  - Run verify_audit_chain() → must succeed on fixed code
  - Expected: Audit chain has fork or verification fails on unfixed code
  
  **Audit Record Mutation Test**:
  - Create investigation → fetch AuditTrail record
  - Attempt PUT request to modify audit_record.decision_reason
  - Expected: Request succeeds on unfixed code (should fail on fixed)
  
  **Decision Policy Scatter Test**:
  - Grep source code for hardcoded "0.40" and "0.75" occurrences
  - Count files where thresholds appear
  - Expected: Multiple occurrences on unfixed code (single file on fixed)
  
  **Classification vs Action Conflated Test**:
  - Inspect decision_engine code: same confidence used for both outputs
  - Expected: Code inspection shows conflation on unfixed, separation on fixed
  
  **Evidence Provenance Test**:
  - Create evaluation evidence → check is_evaluation and evaluation_run_id fields
  - Expected: Fields missing or NULL on unfixed code
  
  **Evaluation Metrics Test**:
  - Run evaluation → inspect Evaluation records
  - Check for confusion matrix fields (true_positive, false_positive, etc.)
  - Expected: Fields missing or heuristic-based on unfixed code
  
  **Concurrent Investigation Safety Test**:
  - Query test file for concurrent investigation test cases
  - Count existing test cases
  - Expected: Zero test cases on unfixed code
  
  **Partial Failure Test**:
  - Create investigation that fails mid-pipeline
  - Check Alert status and orphaned records
  - Expected: Status stuck at "INVESTIGATING", orphaned records on unfixed code
  
  **Baseline Documentation Test**:
  - Inspect _run_baseline_scenario() docstring
  - Check for explanation of heuristics
  - Expected: Minimal documentation on unfixed code
  
  Run tests on UNFIXED code
  **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves vulnerabilities exist)
  Document counterexamples found for each bug to understand root causes
  Mark task complete when tests are written, run, and all failures documented
  _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Investigation Pipeline and Decision Logic Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Observe behavior on UNFIXED code for normal (non-evaluation) operations, then write tests to verify fixed code preserves that behavior
  
  Observe on UNFIXED code for normal investigations:
  - Normal alert ingestion → investigation pipeline produces Alert, Evidence, Decision, AuditTrail
  - Confidence calculation produces identical results across multiple runs
  - Alert status transitions: INGESTED → INVESTIGATING → CLOSED/ESCALATED/CONTAINED
  - Audit chain verification passes for all historical chains
  - Decision thresholds: confidence < 0.40 → BENIGN, 0.40-0.74 → UNCERTAIN, >= 0.75 → MALICIOUS
  - Action strings (NO ACTION, ESCALATE TO HUMAN ANALYST, SIMULATED CONTAINMENT) remain identical
  
  Write property-based tests capturing observed behavior:
  - For any normal investigation (is_evaluation=false), confidence output = identical to unfixed pipeline
  - For any normal alert, alert status transitions match unfixed behavior
  - For any normal audit chain, verification succeeds with identical result
  - For any normal decision, classification and action match unfixed pipeline
  
  Property-based testing generates many test cases for stronger guarantees that behavior is preserved across all normal operations
  Run tests on UNFIXED code
  **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  Mark task complete when tests are written, run, and passing on unfixed code
  _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 3. Fix CAIRA Phase 2 Vulnerabilities

  - [ ] 3.1 Centralize decision policy in DecisionPolicy constants module
    - Create new file: `backend/app/core/policy.py`
    - Define DecisionPolicy class with constants:
      - `BENIGN_MAX = 0.40`
      - `UNCERTAIN_MIN = 0.40`
      - `UNCERTAIN_MAX = 0.75`
      - `MALICIOUS_MIN = 0.75`
    - Add comprehensive docstring explaining policy semantics
    - _Bug_Condition: Decision thresholds scattered across multiple files_
    - _Expected_Behavior: Single source of truth for policy constants_
    - _Preservation: Decision logic unchanged, only constants centralized_
    - _Requirements: 1.7, 2.7, 2.8_

  - [ ] 3.2 Update decision_engine.py to use DecisionPolicy constants
    - Import DecisionPolicy from core.policy
    - Replace hardcoded 0.40 with `DecisionPolicy.UNCERTAIN_MIN`
    - Replace hardcoded 0.75 with `DecisionPolicy.MALICIOUS_MIN`
    - Verify no other hardcoded thresholds remain
    - _Bug_Condition: Thresholds hardcoded in multiple files_
    - _Expected_Behavior: All thresholds imported from DecisionPolicy_
    - _Preservation: Decision classification logic unchanged_
    - _Requirements: 1.7, 2.7, 2.8_

  - [ ] 3.3 Separate classification output from action authorization in decision_engine.py
    - Refactor evaluate_decision() to separate concerns:
      - Confidence → classification (pure output)
      - DecisionPolicy + classification → action (authorization layer)
    - Add `evidence_trace` field to decision return dict with weighted_contribution per evidence
    - Document the separation in function docstring
    - _Bug_Condition: Confidence used for both classification AND action authorization_
    - _Expected_Behavior: Confidence outputs classification only; action determined separately_
    - _Preservation: Action strings remain identical_
    - _Requirements: 1.8, 2.9, 2.10_

  - [ ] 3.4 Add is_evaluation and evaluation_run_id columns to models
    - Modify `backend/app/models/domain.py`:
      - Add `is_evaluation: bool = False` to Alert, Evidence, Decision
      - Add `evaluation_run_id: str = None` to Alert, Evidence, Decision
      - Add `is_evaluation: bool = False` to AuditTrail
      - Add `evaluation_run_id: str = None` to AuditTrail
      - Create new EvaluationRun model with: run_id, started_at, completed_at, scenario_count, agent_version
    - Use database migration to add columns (or schema update script)
    - _Bug_Condition: Evaluation records not marked; no lineage tracking_
    - _Expected_Behavior: All evaluation records have is_evaluation=true and evaluation_run_id_
    - _Preservation: Normal operation records have is_evaluation=false (backward compatible)_
    - _Requirements: 1.1, 1.9, 2.1, 2.11_

  - [ ] 3.5 Prevent AuditTrail record mutation
    - Modify `backend/app/models/domain.py` - AuditTrail class:
      - Add immutability enforcement: prevent __setattr__ after creation
      - Add comment documenting immutability intent
    - Create/modify API route handlers in `backend/app/api/` (or main.py):
      - Ensure no DELETE endpoint for AuditTrail
      - Ensure no PUT/PATCH endpoint for AuditTrail
      - If mutation attempted, return HTTP 403 Forbidden with descriptive error
      - Log security audit entry for any mutation attempts
    - _Bug_Condition: UPDATE and DELETE allowed on audit records_
    - _Expected_Behavior: UPDATE/DELETE rejected with 403; immutable at model level_
    - _Preservation: GET and audit chain verification unchanged_
    - _Requirements: 1.5, 1.6, 2.5, 2.6_

  - [ ] 3.6 Fix audit chain concurrency with transaction isolation and locking
    - Modify `backend/app/services/investigation.py` - run_investigation_pipeline():
      - Add `SELECT FOR UPDATE` lock on AuditTrail when reading previous_hash:
        ```python
        last_audit = db.query(AuditTrail).with_for_update().order_by(AuditTrail.id.desc()).first()
        ```
      - Wrap entire function in database transaction context
      - Verify no other concurrent access patterns exist
    - _Bug_Condition: Concurrent audit writes read same previous_hash, creating fork_
    - _Expected_Behavior: Only one writer can obtain lock; audit chain linear_
    - _Preservation: Single-threaded execution unchanged; no new latency_
    - _Requirements: 1.3, 1.4, 2.3, 2.4_

  - [ ] 3.7 Mark evaluation records during evaluation harness execution
    - Modify `backend/app/services/evaluator.py`:
      - At start of run_evaluation_harness(): create EvaluationRun record
      - Pass is_evaluation=true and evaluation_run_id={run_id} to investigation pipeline
      - Ensure all created Alert, Evidence, Decision, AuditTrail records get these fields
      - Modify _run_caira_scenario() and _run_baseline_scenario() to accept and use evaluation markers
    - _Bug_Condition: Evaluation records mixed with operational data_
    - _Expected_Behavior: All evaluation records marked with is_evaluation=true and run_id_
    - _Preservation: Investigation logic unchanged; only marking added_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.11_

  - [ ] 3.8 Implement transaction safety for investigation pipeline
    - Modify `backend/app/services/investigation.py`:
      - Wrap run_investigation_pipeline() in database transaction with try-except
      - On failure, rollback entire transaction atomically
      - Ensure Alert status is set atomically with all supporting records
      - Test rollback behavior: failed investigation leaves no orphaned records
    - _Bug_Condition: Investigation failures leave status="INVESTIGATING" with orphaned records_
    - _Expected_Behavior: Failed investigation rolls back completely; status unchanged_
    - _Preservation: Successful investigations unchanged_
    - _Requirements: 1.10, 2.12, 2.13_

  - [ ] 3.9 Update evaluator.py to compute comprehensive evaluation metrics
    - Modify `backend/app/services/evaluator.py`:
      - Calculate confusion matrix fields: TP, TN, FP, FN
      - Calculate accuracy, precision, recall from actual classification results
      - Calculate false_positive_count and false_negative_count
      - Calculate unsafe_containment_count (decisions that attempted containment on uncertain/benign)
      - Calculate per-bucket calibration statistics
      - Store all metrics in Evaluation records (add missing columns to Evaluation model)
    - _Bug_Condition: Metrics heuristic-based, no confusion matrix_
    - _Expected_Behavior: Metrics derived from actual results with full confusion matrix_
    - _Preservation: Evaluation logic unchanged; only metrics enhanced_
    - _Requirements: 1.12, 2.15_

  - [ ] 3.10 Document Baseline-Mock heuristics and fairness comparison
    - Modify `backend/app/services/evaluator.py`:
      - Add comprehensive docstring to _run_baseline_scenario() explaining:
        - What heuristics baseline uses (keyword matching, rule-based logic)
        - What information baseline has access to vs CAIRA (same alert data, no tool execution)
        - Why baseline constitutes fair comparison (deterministic, reproducible, reasonable heuristics)
      - Add reference documentation in comments
    - _Bug_Condition: Baseline heuristics undocumented_
    - _Expected_Behavior: Clear documentation of baseline strategy and fairness rationale_
    - _Preservation: Baseline logic unchanged; only documentation added_
    - _Requirements: 1.13, 2.16_

  - [ ] 3.11 Update all existing tests to use DecisionPolicy constants
    - Modify `backend/tests/test_caira.py`:
      - Import DecisionPolicy from core.policy
      - Replace all hardcoded 0.40 with DecisionPolicy.UNCERTAIN_MIN
      - Replace all hardcoded 0.75 with DecisionPolicy.MALICIOUS_MIN
      - Verify no hardcoded thresholds remain
      - _Bug_Condition: Hardcoded thresholds in test assertions_
      - _Expected_Behavior: All tests use centralized policy constants_
      - _Preservation: Test logic unchanged; only threshold values sourced from constants_
      - _Requirements: 1.7, 2.7, 2.8_

  - [ ] 3.12 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - CAIRA Phase 2 Vulnerabilities Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms each vulnerability is fixed
    - Run bug condition exploration tests from step 1 on FIXED code
    - Expected outcomes for each test:
      - Evaluation Pollution: Operational metrics unchanged after second run
      - Audit Chain Concurrency: Audit chain linear, verification passes
      - Audit Record Mutation: PUT request rejected with 403 Forbidden
      - Decision Policy Scatter: All thresholds imported from single DecisionPolicy module
      - Classification vs Action Separated: Confidence and action separate in code
      - Evidence Provenance: is_evaluation and evaluation_run_id fields populated
      - Evaluation Metrics: Confusion matrix and derived statistics present
      - Concurrent Investigation Safety: Audit chain linear after concurrent runs
      - Partial Failure: Alert status unchanged, no orphaned records on failure
      - Baseline Documentation: Baseline heuristics explained in docstrings
    - **EXPECTED OUTCOME**: All tests PASS (confirms all vulnerabilities fixed)
    - _Requirements: 2.1, 2.3, 2.5, 2.7, 2.9, 2.11, 2.15, 2.14, 2.12, 2.16_

  - [ ] 3.13 Verify preservation tests still pass
    - **Property 2: Preservation** - Investigation Pipeline Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2 on FIXED code
    - Confirm all tests still pass after fixes (no regressions)
    - If any test fails: investigate regression, fix it before proceeding
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

- [ ] 4. Run all 58 existing Phase 1 tests to verify backward compatibility
  - Run full test suite: `pytest backend/tests/test_caira.py -v`
  - All 58 tests must pass without modification (only constants updated)
  - If any test fails: investigate why, fix carefully to maintain backward compatibility
  - Confirm no regressions to existing functionality
  - _Requirements: 3.7_

- [ ] 5. Add new test cases for Phase 2 vulnerabilities
  - Add test class: `TestEvaluationIsolation`
    - Test evaluation run creates records with is_evaluation=true
    - Test evaluation run #2 doesn't increase operational metrics
    - Test query filtering by is_evaluation=false excludes evaluation records
  
  - Add test class: `TestAuditChainConcurrency`
    - Test concurrent investigations produce linear audit chain
    - Test verify_audit_chain() passes after concurrent writes
    - Test no ambiguous parent-hash references
  
  - Add test class: `TestAuditRecordImmutability`
    - Test DELETE request on audit record returns 403
    - Test PUT request on audit record returns 403
    - Test API returns error message with immutability explanation
    - Test security audit log created for mutation attempt
  
  - Add test class: `TestTransactionSafety`
    - Test failed investigation rolls back completely
    - Test Alert status unchanged after failed investigation
    - Test no orphaned ToolCall or Evidence records
    - Test no Decision record without audit trail
  
  - Add test class: `TestDecisionPolicyConstants`
    - Test DecisionPolicy module exports required constants
    - Test all code imports from DecisionPolicy (no hardcoded values)
    - Test threshold values match expected semantics
  
  - Add test class: `TestClassificationActionSeparation`
    - Test confidence engine outputs classification only
    - Test decision engine applies policy to determine action
    - Test action determination independent of confidence value
  
  - Add test class: `TestEvaluationMetrics`
    - Test confusion matrix fields present in Evaluation records
    - Test metrics derived from actual results, not heuristics
    - Test unsafe_containment_count calculated correctly
    - Test per-bucket calibration statistics computed
  
  - _Requirements: All Phase 2 requirements (1.1-1.13, 2.1-2.16, 3.1-3.10)_

- [ ] 6. Final checkpoint - ensure all tests pass
  - Run full test suite: `pytest backend/tests/test_caira.py -v`
  - Verify all 58 Phase 1 tests pass
  - Verify all new Phase 2 tests pass
  - Verify no warnings or deprecation notices
  - All tests should pass; ask the user if any questions arise
  - _Requirements: All requirements_

---

## Notes on Test Execution

- **Before Implementation** (Tasks 1-2): Tests MUST FAIL on unfixed code. This confirms bugs exist and establishes baseline behavior.
- **After Implementation** (Tasks 3+): Same tests MUST PASS on fixed code. This confirms fixes work and behavior is preserved.
- **Property-Based Testing**: Use Hypothesis or similar library to generate test cases automatically. This provides stronger guarantees than manual unit tests.
- **Concurrency Testing**: Use threading.Thread to simulate concurrent investigations. Ensure tests can reliably trigger race conditions if they exist.
- **Database Isolation**: Use in-memory SQLite for tests to avoid external dependencies. Ensure each test starts with clean DB state.
- **No Production Changes**: All tests run on local test database only. No modifications to production schema or data.
