# CAIRA Phase 2 Hardening - Design Document

## Overview

Phase 2 hardens the CAIRA architecture against 10 distinct vulnerabilities spanning evaluation isolation, concurrency safety, audit immutability, policy clarity, and decision architecture. The fixes are designed to be minimal, targeted, and fully backward compatible with Phase 1's 58 passing tests. All changes preserve existing investigation pipeline semantics while adding strict data isolation, transaction safety, and explicit policy governance.

The core insight is that evaluation runs should create a separate "evidence space" marked with `is_evaluation=true` and `evaluation_run_id`, preventing pollution of operational metrics. Concurrency safety is achieved through database transaction isolation and row-level locking on audit chain writes. Immutability is enforced at the API layer with explicit prohibition of UPDATE/DELETE on audit records. Policy clarity comes from centralizing all decision thresholds in a single `DecisionPolicy` constants module. And decision architecture is improved by separating confidence classification (pure output of evidence analysis) from action authorization (policy application layer).

## Glossary

- **Bug_Condition (C)**: The collection of 10 distinct vulnerabilities identified in Phase 2, each with specific trigger conditions (evaluation pollution, concurrent writes, audit mutation attempts, policy scatter, classification/action conflation, incomplete provenance, missing metrics, concurrent investigation races, partial failures, undocumented baseline).

- **Property (P)**: The expected correct behavior when bugs are fixed: evaluation records isolated with flags, audit chain linear under concurrency, audit records immutable via API, decision policy centralized, confidence and action separated, evidence provenance complete, metrics comprehensive, concurrent investigations safe, transactions atomic, baseline documented.

- **Preservation**: Existing investigation pipeline, decision logic, audit chain structure, and API response schemas remain unchanged. All 58 Phase 1 tests pass without modification. Decision thresholds retain existing values (0.40, 0.75). Action strings and classification outputs are semantically identical.

- **Alert**: Primary entity representing a security incident ingested into the system. Contains source_ip, target_asset, alert_type. Phase 2 adds `is_evaluation` flag and `evaluation_run_id` for isolation.

- **Evidence**: Supporting data collected by tools (Threat Intelligence, Log Lookup, Asset Criticality). Phase 2 adds `is_evaluation` and `evaluation_run_id` to track evaluation lineage.

- **Decision**: Classification (BENIGN/UNCERTAIN/MALICIOUS) and recommended action (NO ACTION / ESCALATE / SIMULATED CONTAINMENT). Phase 2 separates policy application into explicit decision layer.

- **AuditTrail**: Cryptographic hash chain recording investigation decisions. Phase 2 prevents mutation via API and enforces transaction-safe writes.

- **DecisionPolicy**: New constants module centralizing BENIGN_MAX (0.40), UNCERTAIN_MIN (0.40), UNCERTAIN_MAX (0.75), MALICIOUS_MIN (0.75). Single source of truth for decision thresholds.

- **SimulationContext**: Evaluation harness mechanism to override tool outputs per-scenario. Phase 2 ensures all evaluation records are marked with evaluation metadata.

- **Evaluation Run**: Distinct batch execution of evaluation scenarios. Phase 2 creates EvaluationRun model to track run_id, started_at, completed_at, scenario_count for history preservation.

- **is_evaluation flag**: Boolean indicating whether a record was created during evaluation (true) or real operation (false). Used to filter evaluation records from operational dashboards.

- **evaluation_run_id**: UUID linking all records created during a specific evaluation run, enabling run-level filtering and reconstruction.

## Bug Details

### Bug Condition

The bug condition encompasses 10 distinct vulnerabilities that collectively compromise data integrity, operational isolation, concurrency safety, and policy governance:

**1. Evaluation Pollution** (Reqs 1.1–1.2, 2.1–2.2)
- Evaluation runs create normal Alert, Evidence, Decision, AuditTrail records mixed with operational data
- No mechanism to distinguish synthetic from real incidents
- Metrics increase on repeated evaluation of identical scenarios

**2. Audit Chain Concurrency Race** (Reqs 1.3–1.4, 2.3–2.4)
- Concurrent audit writes read same previous_hash, compute ambiguous chain
- No database locking prevents multiple blocks with same parent_hash
- Chain verification fails or produces inconsistent state

**3. Audit Record Mutation** (Reqs 1.5–1.6, 2.5–2.6)
- AuditTrail model allows UPDATE via SQLAlchemy ORM
- API layer has no endpoint-level protection
- Unauthorized users can modify audit records post-hoc

**4. Decision Policy Scattered** (Reqs 1.7, 2.7–2.8)
- Thresholds 0.40, 0.75 hardcoded in decision_engine.py, evaluator.py, test files
- No single source of truth
- Changes require hunting across codebase

**5. Classification vs Action Conflated** (Reqs 1.8, 2.9–2.10)
- Confidence score used for both classification AND action authorization
- No separation between "what did we conclude" and "what are we allowed to do"
- Future policies (e.g., "MALICIOUS but don't isolate") impossible to implement

**6. Evidence Provenance Incomplete** (Reqs 1.9, 2.11)
- Evidence records lack is_evaluation, evaluation_run_id fields
- No explicit weighted_contribution tracking in decision output
- Cannot reconstruct which evidence influenced which decisions

**7. Evaluation Metrics Heuristic** (Reqs 1.12, 2.15)
- EGAR, audit_completeness are heuristic-based
- No confusion matrix, precision/recall, unsafe_containment tracking
- No per-bucket calibration statistics

**8. Concurrent Investigation Races** (Reqs 1.11, 2.14)
- No integration tests for concurrent investigations
- Audit chain could become corrupted under concurrent alert processing
- Alert status inconsistencies possible

**9. Partial Failure States** (Reqs 1.10, 2.12–2.13)
- Failed investigation leaves status="INVESTIGATING" with orphaned records
- No transaction boundaries ensure atomicity
- Decision without corresponding audit record possible

**10. Baseline Undocumented** (Reqs 1.13, 2.16)
- Baseline-Mock heuristics not documented
- Unclear what information it has access to vs CAIRA
- Cannot assess fairness of comparison

### Formal Specification

**Bug Condition Function** - Identifies inputs/operations that trigger each vulnerability:

```
FUNCTION isBugCondition(input)
  INPUT: input of type { operation_type, record_type, context }
  OUTPUT: boolean
  
  RETURN (
    // Evaluation Pollution
    (operation_type = "run_evaluation" AND evaluation records NOT marked with is_evaluation=true) OR
    
    // Audit Chain Concurrency Race
    (operation_type = "insert_audit" AND concurrent_requests > 1 AND no_database_locking_applied) OR
    
    // Audit Record Mutation
    (operation_type IN ["UPDATE", "DELETE"] AND record_type = "AuditTrail" AND no_api_protection) OR
    
    // Decision Policy Scattered
    (operation_type = "apply_decision" AND threshold_value hardcoded IN multiple_files) OR
    
    // Classification vs Action Conflated
    (operation_type = "make_decision" AND classification_confidence = action_authorization_confidence) OR
    
    // Evidence Provenance Incomplete
    (operation_type = "create_evidence" AND (is_evaluation NOT IN record OR evaluation_run_id NOT IN record)) OR
    
    // Evaluation Metrics Heuristic
    (operation_type = "compute_metrics" AND metrics_use_heuristics NOT derived_from_actual_results) OR
    
    // Concurrent Investigation Races
    (operation_type = "investigate_concurrent" AND no_test_coverage_exists) OR
    
    // Partial Failure States
    (operation_type = "investigate" AND no_transaction_boundaries) OR
    
    // Baseline Undocumented
    (operation_type = "use_baseline" AND baseline_heuristics_not_documented)
  )
END FUNCTION
```

### Examples

**Example 1 - Evaluation Pollution**
- Expected: Run evaluation harness twice → metrics unchanged (deterministic)
- Actual: Second run → EGAR_count increases, false_positive_count increases, audit_completeness metric differs
- Root cause: Evaluation records stored in operational tables without is_evaluation flag

**Example 2 - Audit Chain Race**
- Expected: Two concurrent alert investigations → audit chain linear, verification passes
- Actual: Two blocks both reference same previous_hash, chain has fork, verification fails on second block
- Root cause: No SELECT FOR UPDATE locking on audit write operation

**Example 3 - Audit Mutation**
- Expected: Audit records are immutable; UPDATE/DELETE rejected with 403
- Actual: PUT /api/audit/{id} succeeds, decision_reason modified, hash chain corrupted
- Root cause: No @app.http.route("audit", methods=["DELETE"]) protection; ORM allows UPDATE

**Example 4 - Policy Scatter**
- Expected: Change threshold from 0.40 to 0.35 in one place → all code uses new value
- Actual: Must edit decision_engine.py line 42, evaluator.py line 180, test_caira.py lines 230–250
- Root cause: Hardcoded constants, no centralized DecisionPolicy module

**Example 5 - Classification vs Action Conflated**
- Expected: confidence=0.85 → classification=MALICIOUS; future policy could deny containment for legal reasons
- Actual: confidence → used directly to determine containment action; policy changes require code restructuring
- Root cause: Decision engine conflates "what we concluded" with "what we're allowed to do"

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors - Investigation Pipeline:**
- Alert ingestion, tool execution, evidence collection flow identical
- Confidence calculation logic and aggregation method (WEIGHTED_TRUST, UNWEIGHTED_AVERAGE) unchanged
- Classification output (BENIGN/UNCERTAIN/MALICIOUS) semantic boundaries preserved
- Action strings (NO ACTION, ESCALATE TO HUMAN ANALYST, SIMULATED CONTAINMENT) identical
- Audit chain structure and hash computation algorithm unchanged
- Decision timestamps and reasoning payloads unchanged format

**Unchanged Behaviors - Evaluation Harness:**
- Evaluation harness produces identical predicted_class results
- Scenario definitions and evidence_manipulation logic unchanged
- Evaluation pipeline uses same investigation code as normal operation
- Deterministic seeding produces identical results across runs

**Unchanged Behaviors - API & Schemas:**
- Decision and Evidence JSON responses backward compatible
- New fields (is_evaluation, evaluation_run_id) are nullable with sensible defaults
- Existing queries on alerts/decisions/evidence continue to work
- Audit chain verification function and output unchanged

**Unchanged Behaviors - Tests:**
- All 58 Phase 1 tests pass without modification
- Test data structures, fixtures, and assertions remain compatible
- Audit chain verification tests produce identical results

**Scope - What Will Not Change:**
- Investigation flow: tool execution → evidence → trust → confidence → decision → audit
- Decision thresholds: BENIGN < 0.40, UNCERTAIN [0.40, 0.75], MALICIOUS >= 0.75
- Alert status transitions: INGESTED → INVESTIGATING → CLOSED/ESCALATED/CONTAINED
- Simulated containment banner and safety guards
- Trust tier assignment logic (VERIFIED=1.0, CORROBORATED=0.6, UNTRUSTED=0.2)

## Hypothesized Root Cause

### 1. Evaluation Pollution Root Cause

**Hypothesis**: Evaluation runs use the same operational investigation pipeline without any mechanism to tag generated records. The evaluator directly inserts Alert/Evidence/Decision/AuditTrail rows, which are then queried by dashboards without filtering.

**Location**: `backend/app/services/evaluator.py` - `run_evaluation_harness()` and `_run_caira_scenario()` create normal records without evaluation markers.

**Evidence**: 
- Evaluator calls `run_investigation_pipeline()` which creates Alert rows directly
- Dashboard queries `SELECT COUNT(*) FROM decisions` without `WHERE is_evaluation != true`
- Second evaluation run increases metric counters despite deterministic results

### 2. Audit Chain Concurrency Root Cause

**Hypothesis**: `investigation.py` performs non-atomic read-then-write of audit previous_hash:
```python
last_audit = db.query(AuditTrail).order_by(AuditTrail.id.desc()).first()
prev_hash = last_audit.current_hash if last_audit else GENESIS_HASH
# ... gap where another transaction can insert audit record
audit_record = AuditTrail(**audit_payload)
db.add(audit_record)
```

**Location**: `backend/app/services/investigation.py` - `run_investigation_pipeline()` line ~170.

**Evidence**:
- No `SELECT FOR UPDATE` or row-level locking on audit table
- Two concurrent requests both fetch `prev_hash`, compute different blocks, both insert
- Chain verification detects fork but cannot prevent it

### 3. Audit Record Mutation Root Cause

**Hypothesis**: `AuditTrail` model inherits full SQLAlchemy Base which allows all CRUD operations. No API layer validation prevents UPDATE/DELETE.

**Location**: `backend/app/models/domain.py` - `AuditTrail` class and `backend/app/api/` route handlers.

**Evidence**:
- Model has no `__table_args__` preventing updates
- No API layer route definition like `@router.delete("/audit/{id}")` with explicit 403
- SQLAlchemy ORM allows implicit UPDATE through session.commit()

### 4. Decision Policy Scatter Root Cause

**Hypothesis**: Decision thresholds hardcoded in multiple files as magic numbers without centralization.

**Location**:
- `backend/app/services/decision_engine.py` lines 42, 45: `if confidence >= 0.75:`, `elif confidence >= 0.40:`
- `backend/app/services/evaluator.py` similar threshold checks in `_run_baseline_scenario()`
- `backend/tests/test_caira.py` lines 230–250: assertion values hardcoded

**Evidence**:
- Grep for "0.40" and "0.75" yields 10+ results across codebase
- No centralized `constants.py` or `policy.py` module
- Difficult to reason about threshold semantics

### 5. Classification vs Action Conflated Root Cause

**Hypothesis**: `confidence_score` from evidence aggregation flows directly into decision engine for both classification AND action determination.

**Location**: `backend/app/services/decision_engine.py` - `evaluate_decision()` uses same `confidence` value for classification and action.

**Evidence**:
- Single threshold comparison determines both output and behavior
- No intermediate policy layer to decouple concerns
- Future flexibility requires architectural refactoring

### 6. Evidence Provenance Incomplete Root Cause

**Hypothesis**: `Evidence` model lacks is_evaluation and evaluation_run_id fields. Decision output does not preserve weighted_contribution per evidence item.

**Location**: 
- `backend/app/models/domain.py` - `Evidence` class definition
- `backend/app/services/investigation.py` - `run_investigation_pipeline()` creates Evidence without evaluation context

**Evidence**:
- Evidence table schema has no is_evaluation column
- Decision reason preserves reasoning_step but not evidence_trace with contributions
- Cannot reconstruct evaluation lineage

### 7. Evaluation Metrics Heuristic Root Cause

**Hypothesis**: `Evaluation` model stores heuristic-based metrics (EGAR, audit_completeness) that are not derived from actual classification results.

**Location**: `backend/app/models/domain.py` - `Evaluation` class; `backend/app/services/evaluator.py` - `_run_caira_scenario()`.

**Evidence**:
- No confusion matrix fields (true_positive, false_positive, etc.)
- EGAR computed by heuristic, not derived from actual containment action
- No unsafe_containment_count or per-bucket calibration statistics

### 8. Concurrent Investigation Races Root Cause

**Hypothesis**: No test coverage exists for concurrent investigations, so races are not detected.

**Location**: `backend/tests/test_caira.py` - no concurrent investigation test cases.

**Evidence**:
- Test file only covers sequential scenarios
- No threading or multiprocessing test fixtures
- Race conditions left undiscovered

### 9. Partial Failure States Root Cause

**Hypothesis**: Investigation pipeline does not use database transactions to ensure atomicity. Failed steps leave alert status unchanged but orphan evidence/tool_call records.

**Location**: `backend/app/services/investigation.py` - `run_investigation_pipeline()` uses explicit `db.add()` and `db.commit()` calls without transaction scope.

**Evidence**:
- Alert status set to "INVESTIGATING" early, not rolled back on failure
- Multiple `db.commit()` calls create partial commit boundaries
- Failed investigation leaves orphaned ToolCall or Evidence records

### 10. Baseline Undocumented Root Cause

**Hypothesis**: Baseline-Mock heuristics not documented; unclear what information it has access to compared to CAIRA.

**Location**: `backend/app/services/evaluator.py` - `_run_baseline_scenario()` uses keyword matching and rule-based heuristics with minimal comments.

**Evidence**:
- Function lacks docstring explaining heuristic logic
- No comparison document stating what information baseline has access to
- Cannot assess whether comparison is fair

## Correctness Properties

Property 1: Evaluation Isolation - Evaluation Pollution Fixed

_For any_ evaluation run execution, all generated alerts, evidence, and decisions SHALL have `is_evaluation=true` and `evaluation_run_id={run_id}`, ensuring they are excluded from operational dashboards and metrics. Running the same evaluation twice with identical scenarios SHALL NOT increase operational metric counters.

**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

Property 2: Audit Chain Concurrency Safety - Race Condition Fixed

_For any_ pair of concurrent alert investigations, the resulting audit chain SHALL remain linear with no ambiguous parent-hash references. Each audit block SHALL reference exactly one valid previous block. Database transaction isolation and SELECT FOR UPDATE locking SHALL prevent multiple blocks from claiming the same parent hash.

**Validates: Requirements 1.3, 1.4, 2.3, 2.4**

Property 3: Audit Record Immutability - Mutation Prevention

_For any_ UPDATE or DELETE request targeting an AuditTrail record via the API layer, the operation SHALL be rejected with HTTP 403 Forbidden and an error log entry SHALL be created. The AuditTrail model SHALL have no UPDATE method defined, and no API endpoint SHALL expose UPDATE/DELETE operations on audit records.

**Validates: Requirements 1.5, 1.6, 2.5, 2.6**

Property 4: Decision Policy Centralization - Single Source of Truth

_For any_ decision classification operation, the decision engine SHALL import thresholds from a centralized `DecisionPolicy` constants module with explicitly named constants: BENIGN_MAX, UNCERTAIN_MIN, UNCERTAIN_MAX, MALICIOUS_MIN. All code (decision_engine.py, evaluator.py, tests) SHALL use these constants, eliminating scattered hardcoded threshold values.

**Validates: Requirements 1.7, 2.7, 2.8**

Property 5: Classification and Action Separation - Architectural Clarity

_For any_ decision, the confidence engine SHALL output classification only (BENIGN/UNCERTAIN/MALICIOUS). The decision engine SHALL apply DecisionPolicy to determine action (NO ACTION / ESCALATE / SIMULATED CONTAINMENT), ensuring classification and action authorization are separate concerns enabling future policy flexibility.

**Validates: Requirements 1.8, 2.9, 2.10**

Property 6: Evidence Provenance Completeness - Evaluation Lineage Tracking

_For any_ evidence record created, it SHALL include `is_evaluation` flag and `evaluation_run_id` field to enable filtering and lineage reconstruction. Decision output SHALL preserve `evidence_trace` with weighted_contribution per evidence item, allowing reconstruction of how each evidence influenced the final confidence score.

**Validates: Requirements 1.9, 2.11**

Property 7: Evaluation Metrics Comprehensiveness - Data-Driven Calculation

_For any_ evaluation run, the system SHALL compute metrics derived directly from actual results: confusion matrix (TP, TN, FP, FN), accuracy, precision, recall, false_positive_count, false_negative_count, unsafe_containment_count, and per-bucket calibration statistics. No heuristic-based metrics shall substitute for derived values.

**Validates: Requirements 1.12, 2.15**

Property 8: Concurrent Investigation Safety - Race Test Coverage

_For any_ pair of concurrent alert investigations on different alerts, an integration test SHALL verify the resulting audit chain is linear, no decision records are lost, alert statuses are consistent, and chain verification succeeds. This test SHALL execute under realistic concurrency conditions (threading or multiprocessing).

**Validates: Requirements 1.11, 2.14**

Property 9: Investigation Atomicity - Transaction Safety

_For any_ investigation execution, all operations (tool execution, evidence creation, confidence calculation, decision, audit recording) SHALL occur within a database transaction. If any step fails, the entire investigation SHALL roll back atomically, leaving the alert status unchanged and no orphaned records.

**Validates: Requirements 1.10, 2.12, 2.13**

Property 10: Baseline Fairness - Documentation and Comparison

_For any_ baseline evaluation, the Baseline-Mock agent's documentation SHALL explicitly state what heuristics it employs, what information it has access to compared to CAIRA, and why it constitutes a fair comparison baseline. This documentation SHALL be embedded in code comments and reference materials.

**Validates: Requirements 1.13, 2.16**

## Fix Implementation

### Changes Required

**File 1**: `backend/app/models/domain.py`

**Changes**:
1. Add `is_evaluation: bool = False` column to Alert, Evidence, Decision tables
2. Add `evaluation_run_id: str = None` column to Alert, Evidence, Decision tables
3. Create new `EvaluationRun` model with fields: run_id, started_at, completed_at, scenario_count, agent_version
4. Modify `AuditTrail` model: 
   - Add `is_evaluation: bool = False` column
   - Add `evaluation_run_id: str = None` column
   - **CRITICAL**: Add `__table_args__` to prevent updates

**File 2**: `backend/app/core/policy.py` (NEW FILE)

**Create**:
- `DecisionPolicy` class with constants:
  - `BENIGN_MAX = 0.40`
  - `UNCERTAIN_MIN = 0.40`
  - `UNCERTAIN_MAX = 0.75`
  - `MALICIOUS_MIN = 0.75`
- Docstring explaining policy semantics and how thresholds map to classifications

**File 3**: `backend/app/services/decision_engine.py`

**Changes**:
1. Import `DecisionPolicy` from core.policy
2. Replace hardcoded 0.40 with `DecisionPolicy.UNCERTAIN_MIN`
3. Replace hardcoded 0.75 with `DecisionPolicy.MALICIOUS_MIN`
4. Refactor `evaluate_decision()` to separate classification (pure output) from action determination (policy application)
5. Add `evidence_trace` field to return dict with weighted_contribution per evidence item

**File 4**: `backend/app/services/investigation.py`

**Changes**:
1. Wrap `run_investigation_pipeline()` in database transaction context
2. Add `SELECT FOR UPDATE` lock on AuditTrail when reading previous_hash
3. Add try-except to roll back entire transaction on failure
4. Ensure Alert status is set atomically with all supporting records
5. Add is_evaluation and evaluation_run_id parameters (default False, None)

**File 5**: `backend/app/services/evaluator.py`

**Changes**:
1. Import DecisionPolicy constants
2. Create `EvaluationRun` record at start of `run_evaluation_harness()`
3. Pass `is_evaluation=true` and `evaluation_run_id={run_id}` to investigation pipeline
4. Modify `_run_caira_scenario()` and `_run_baseline_scenario()` to mark created records
5. Implement metric calculation: confusion matrix, accuracy, precision, recall, unsafe_containment_count
6. Add comprehensive baseline documentation in docstrings

**File 6**: `backend/app/api/audit.py` (NEW FILE or MODIFY existing route handler)

**Changes**:
1. Define route handlers for audit endpoints
2. Explicitly exclude UPDATE and DELETE operations (only GET and LIST allowed)
3. Return HTTP 403 Forbidden if DELETE or UPDATE attempted with descriptive error message
4. Log security audit entry for any mutation attempts

**File 7**: `backend/app/models/domain.py` - Modify AuditTrail

**Changes**:
1. Remove update capability: Add `__table_args__ = {'mysql_engine': 'InnoDB'}`  or similar comment indicating immutability intent
2. Add application-level protection in model: 
   ```python
   def __setattr__(self, key, value):
       if self.id is not None:
           raise ValueError("AuditTrail records are immutable after creation")
       super().__setattr__(key, value)
   ```

**File 8**: `backend/tests/test_caira.py`

**Changes**:
1. Import DecisionPolicy constants
2. Replace hardcoded 0.40 and 0.75 with policy constants throughout tests
3. Add new test class: `TestEvaluationIsolation` with tests for is_evaluation flag and evaluation_run_id
4. Add new test class: `TestAuditChainConcurrency` with concurrent investigation tests using threading
5. Add new test class: `TestAuditRecordImmutability` with tests for UPDATE/DELETE rejection
6. Add new test class: `TestTransactionSafety` with tests for investigation atomicity and rollback
7. All existing 58 tests pass without modification (only threshold values updated to use constants)

## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:
1. **Exploratory Bug Condition Tests** (Property-Based) - Verify bugs exist on unfixed code with concrete failing scenarios
2. **Preservation Tests** (Property-Based) - Verify existing investigation behavior is unchanged for non-evaluation operations
3. **Fix Validation Tests** (Unit + Integration) - Verify each fix resolves its corresponding bug

All tests are designed to run on both unfixed and fixed code, with expectations documented clearly.

### Exploratory Bug Condition Checking

**Goal**: Surface concrete counterexamples demonstrating each bug exists before implementing fixes. This confirms root cause analysis and guides implementation.

**Test Plan - Evaluation Pollution**:
- Run evaluation harness once → count evaluation records
- Count operational dashboard metrics
- Run same evaluation harness again
- Assert operational metrics unchanged (deterministic evaluation)
- Expected failure on unfixed code: metrics increase despite deterministic scenarios

**Test Plan - Audit Chain Concurrency**:
- Create two Alert records
- Launch two concurrent investigation tasks (threading.Thread)
- Each investigation calls run_investigation_pipeline()
- Fetch all AuditTrail records, verify chain linearity
- Expected failure on unfixed code: audit chain has fork, verification fails

**Test Plan - Audit Record Mutation**:
- Create Alert → run investigation → fetch Decision and AuditTrail records
- Attempt PUT request to modify AuditTrail.decision_reason
- Expected failure on unfixed code: request succeeds, record modified

**Test Plan - Decision Policy Scatter**:
- Grep codebase for hardcoded "0.40" and "0.75" threshold values
- Count occurrences across decision_engine.py, evaluator.py, test files
- Expected failure on unfixed code: multiple occurrences found

**Test Plan - Classification vs Action Conflated**:
- Inspect code: verify confidence_score used for both classification AND action
- Expected observation on unfixed code: same value determines both outputs

**Test Plan - Evidence Provenance Incomplete**:
- Create evaluation run → check Evidence records for is_evaluation and evaluation_run_id fields
- Expected failure on unfixed code: fields missing or NULL

**Test Plan - Evaluation Metrics Heuristic**:
- Run evaluation, inspect Evaluation records for confusion matrix fields
- Expected failure on unfixed code: confusion matrix fields empty or derived from heuristics

**Test Plan - Concurrent Investigation Races**:
- Query test file for concurrent investigation test cases
- Expected observation on unfixed code: no test cases exist

**Test Plan - Partial Failure States**:
- Create investigation that fails mid-pipeline (e.g., simulated tool failure)
- Check Alert status and orphaned records (ToolCall, Evidence without Decision)
- Expected failure on unfixed code: Alert status stuck at "INVESTIGATING", orphaned records present

**Test Plan - Baseline Undocumented**:
- Inspect _run_baseline_scenario() for documentation of heuristics
- Expected observation on unfixed code: minimal documentation

### Fix Checking

**Goal**: Verify that for all inputs where bug condition holds, fixed code produces expected behavior.

**Pseudocode for Bug Condition Tests**:

```
FOR ALL bug IN [EvaluationPollution, AuditRaceCondition, AuditMutation, PolicyScatter, ClassificationAction, ProvenanceIncomplete, MetricsHeuristic, ConcurrentInvestigationRace, PartialFailure, BaselineUndocumented] DO
  result_fixed := test_bug_fix(bug)
  ASSERT result_fixed = PASS (expected behavior achieved)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where bug condition does NOT hold, fixed code produces same result as unfixed code.

**Pseudocode for Preservation Tests**:

```
FOR ALL investigation IN [normal_operations] DO
  // Run investigation on unfixed code
  unfixed_result := investigation(unfixed_pipeline)
  
  // Run investigation on fixed code (without evaluation marking)
  fixed_result := investigation(fixed_pipeline, is_evaluation=false)
  
  ASSERT unfixed_result.alert_status = fixed_result.alert_status
  ASSERT unfixed_result.confidence = fixed_result.confidence
  ASSERT unfixed_result.classification = fixed_result.classification
  ASSERT unfixed_result.action = fixed_result.action
  ASSERT unfixed_result.audit_chain_verification = fixed_result.audit_chain_verification
END FOR
```

### Unit Tests

- Confidence engine produces identical results after policy centralization
- Trust tier assignment unchanged with new is_evaluation field
- Decision classification logic unchanged (0.40, 0.75 thresholds still apply)
- Audit hash computation unchanged
- Investigation pipeline structure preserved

### Property-Based Tests

- **Property 1** (Evaluation Isolation): For any evaluation run with is_evaluation=true, records are excluded from operational queries
- **Property 2** (Audit Chain Concurrency): For any concurrent pair of investigations, audit chain verification succeeds
- **Property 3** (Audit Immutability): For any UPDATE/DELETE attempt on AuditTrail, API returns 403 Forbidden
- **Property 4** (Policy Centralization): For any decision, threshold values are imported from DecisionPolicy constants
- **Property 5** (Classification/Action Separation): For any decision, confidence is output as classification, separate from action determination
- **Property 6** (Evidence Provenance): For any evidence record, is_evaluation and evaluation_run_id fields are populated
- **Property 7** (Metrics Comprehensiveness): For any evaluation run, metrics include confusion matrix derived from actual results
- **Property 8** (Concurrent Investigation Safety): For any concurrent investigation pair, audit chain is linear, records not lost
- **Property 9** (Investigation Atomicity): For any failed investigation, alert status unchanged, no orphaned records
- **Property 10** (Baseline Documentation): For any baseline evaluation, heuristics are documented

### Integration Tests

- Full alert ingestion → investigation → decision → audit pipeline with new is_evaluation isolation
- Evaluation harness runs twice → metrics unchanged, run_id tracked correctly
- Concurrent investigations on different alerts → audit chain linear, decisions recorded
- Investigation failure rollback → alert status unchanged, no orphaned records
- Decision policy change (update constants module) → all decisions use new thresholds automatically
