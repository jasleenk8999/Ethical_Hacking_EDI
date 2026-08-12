# CAIRA — Confidence-aware Adaptive Incident Response Agent

**CAIRA** is an AI-powered cybersecurity incident response and evaluation platform designed for Security Operations Centers (SOCs). 

It enforces an **evidence-gated reasoning architecture**: instead of taking immediate automated action on raw alerts, CAIRA annotates evidence with trust levels, calculates aggregated confidence scores, makes controlled decisions against strict safety thresholds, maintains a tamper-evident SHA-256 audit trail, and benchmarks agent reliability across adversarial evaluation scenarios.

> [!IMPORTANT]
> **Safety Guarantee**: All containment actions (host isolation, IP blocking, account quarantine) within CAIRA are strictly simulated ("SIMULATION MODE — NO REAL INFRASTRUCTURE MODIFIED").

---

## Key Features

1. **Evidence-Gated Reasoning Loop**:
   - **Log Lookup Tool**: Searches internal SIEM telemetry.
   - **Threat Intelligence Tool**: Queries global IP reputation & campaign feeds.
   - **Asset Criticality Tool**: Checks CMDB business impact and asset classification.

2. **Evidence Trust System**:
   - **VERIFIED** (Weight = 1.0): Verified Threat Intel feeds & signature DBs.
   - **CORROBORATED** (Weight = 0.6): Internal SOC logs & CMDB databases.
   - **UNTRUSTED** (Weight = 0.2): Unverified user reports or noisy telemetry.

3. **Deterministic Action Thresholds**:
   - $\text{Confidence} \ge 0.75 \longrightarrow$ **MALICIOUS** $\longrightarrow$ **SIMULATED CONTAINMENT**
   - $0.40 \le \text{Confidence} < 0.75 \longrightarrow$ **UNCERTAIN** $\longrightarrow$ **HUMAN ANALYST ESCALATION**
   - $\text{Confidence} < 0.40 \longrightarrow$ **BENIGN** $\longrightarrow$ **NO ACTION (MONITOR ONLY)**

4. **Cryptographic SHA-256 Audit Trail**:
   - Every reasoning step, tool call, and decision is linked in a block-by-block SHA-256 hash chain with live integrity verification.

5. **Adversarial Evaluation Harness**:
   - Tests agent performance across 8 benchmark scenarios (misleading threat intel, conflicting telemetry, untrusted injection, false positives).
   - Computes EGAR (Evidence-Gated Action Rate), False Positive Containment Rate, TTFC, and compares CAIRA vs Baseline Hasty Agent.

---

## Application Structure

- `/dashboard`: SOC Incident Command Center with 9 top metrics, 7 distribution charts, and recent incidents feed.
- `/alerts`: Heterogeneous Alert Ingestion supporting JSON upload, paste, sample generator, and schema normalizer.
- `/investigate/[id]`: Step-by-step visual pipeline investigation with tool outputs and decision modal.
- `/evidence`: Evidence Explorer & Trust System with interactive Evidence Graph.
- `/reasoning`: Transparent math breakdown for Weighted Score vs Unweighted Score.
- `/decisions`: Decision Center with interactive confidence gauge & simulation safeguards.
- `/audit`: Cryptographic SHA-256 Audit Trail with live integrity verifier.
- `/evaluation`: Evaluation Harness running 8 benchmark scenarios and Baseline comparison.
- `/scenarios`: Adversarial Scenario Generator.
- `/schema`: Relational Database Schema visualizer.
- `/workflow`: End-to-End System Workflow Map.
- `/reports`: Formatted CSV Report Exporters for Incidents, Audits, Evaluations, and Scenarios.

---

## Quick Start (Local Setup)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & npm

### 1. Start Backend Server (FastAPI)
```bash
cd caira/backend
# Create virtual environment (if not already created)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
*Backend API docs available at:* `http://localhost:8000/docs`

### 2. Start Frontend App (Next.js)
```bash
cd caira/frontend
npm install
npm run dev
```
*Frontend interface available at:* `http://localhost:3000`

---

## End-to-End Demo Flow

1. Open `http://localhost:3000` to view the **CAIRA Landing Page & System Architecture Map**.
2. Click **Launch SOC Dashboard** to view live metrics and distributions.
3. Select incident **ALT-001 (Brute Force Attack)** and click **Start Investigation**.
4. Watch the 10-stage pipeline execute, inspect the 3 tool lookups, view trust tier badges, and examine the decision modal.
5. Navigate to **Audit Trail** and click **Verify Audit Integrity** to recompute SHA-256 hashes across all blocks.
6. Navigate to **Evaluation Harness** and click **Run Evaluation Suite** to compare CAIRA against the Baseline Agent.
# Ethical_Hacking_EDI
# Ethical_Hacking_EDI
# Ethical_Hacking_EDI
# Ethical_Hacking_EDI
# Ethical_Hacking_EDI
# CAIRA_1
# CAIRA_1
