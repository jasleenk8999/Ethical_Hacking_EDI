# BharatCode LLM Integration Guide

## ✅ Status: Ready to Use

Your CAIRA project is **fully configured for BharatCode** with the Qwen 36B model. Everything has been verified and is working correctly.

---

## What is CAIRA Using?

### NOT Hardcoded Logic
CAIRA **uses actual LLM inference** from BharatCode's Qwen 36B model. The system is not hardcoded.

### How It Works

```
1. Alert arrives at backend
   ↓
2. LLM (Qwen on BharatCode) receives alert + system prompt
   ↓
3. LLM decides which tool to call:
   - log_lookup_tool (check user logs)
   - threat_intel_tool (check IP reputation)
   - asset_criticality_tool (check asset value)
   ↓
4. LLM analyzes evidence returned from database
   ↓
5. LLM submits decision with confidence score and reasoning
   ↓
6. Backend applies trust-weighted confidence calculation
   ↓
7. Action: ISOLATED/ESCALATE/MONITOR based on thresholds
```

The LLM genuinely reasons about evidence. Different alerts and evidence combinations produce different LLM outputs.

---

## Configuration Files

### `backend/config.yaml` (Provider Settings)

```yaml
agent:
  provider: bharatcode              # ← Using BharatCode
  max_iterations: 15
  bharatcode:
    model: bharatcode:qwen36-35b-q6-256k-vision
    base_url: https://bharatcode.ai/api/model/v1
```

### `backend/.env.local` (API Key)

```bash
export BHARATCODE_API_KEY=bc_live_9d6d8182decf4436b8fecfa2128145ba_GFDNHs4ofmKEwCzulHOQ276h87pJW6FPmF6dyRHoNho
```

This is automatically sourced by the startup script.

---

## Starting the System

### Option A: Using Startup Scripts (Recommended)

**Terminal 1 — Backend:**
```bash
cd backend
./run.sh
```

**Terminal 2 — Frontend:**
```bash
cd frontend
./run.sh
```

### Option B: Manual Startup

**Terminal 1 — Backend:**
```bash
cd backend
source .env.local
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

---

## Verification

### Check BharatCode Configuration

```bash
cd backend
source .env.local
source venv/bin/activate

python << 'EOF'
from app.core.config import get_settings
import os

settings = get_settings()
api_key = os.getenv("BHARATCODE_API_KEY")

print(f"Provider: {settings.agent.provider}")
print(f"Model: {settings.agent.bharatcode.model}")
print(f"API Key Set: {bool(api_key)}")
print(f"Base URL: {settings.agent.bharatcode.base_url}")
EOF
```

Expected output:
```
Provider: bharatcode
Model: bharatcode:qwen36-35b-q6-256k-vision
API Key Set: True
Base URL: https://bharatcode.ai/api/model/v1
```

### Check API Endpoint

Once backend is running, visit:
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/

Should return:
```json
{
  "status": "ONLINE",
  "system": "CAIRA — Confidence-aware Adaptive Incident Response Agent",
  "version": "1.0.0",
  "docs": "/docs",
  "safety_guard": "SIMULATION MODE ACTIVE — NO REAL INFRASTRUCTURE MODIFIED"
}
```

---

## Testing the LLM Integration

### 1. Send a Test Alert

```bash
curl -X POST http://localhost:8000/api/investigate \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "ALT-001"
  }'
```

### 2. Monitor Logs

Watch the backend terminal for LLM reasoning output:

```
[LLM Decision] Analyzing alert ALT-001
[Tool Call] Executing log_lookup_tool with user=...
[Evidence] Received log data with trust_tier=CORROBORATED
[Tool Call] Executing threat_intel_tool with ip=...
[Evidence] Received threat intel with trust_tier=VERIFIED
[Decision] Confidence: 0.82 → Action: ISOLATE_HOST
```

### 3. View Investigation Details

Frontend at http://localhost:3000 shows:
- Evidence chain with trust tiers
- LLM reasoning breakdown
- Confidence calculation
- Action recommendation

---

## Switching Providers (If Needed)

### Switch to Anthropic Claude

1. **Edit `backend/config.yaml`:**
   ```yaml
   agent:
     provider: anthropic  # Change this
   ```

2. **Update `backend/.env.local`:**
   ```bash
   # Comment out or remove:
   # export BHARATCODE_API_KEY=...
   
   # Add:
   export ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Restart backend:**
   ```bash
   cd backend
   ./run.sh  # Will use Anthropic instead
   ```

### Switch Back to BharatCode

Reverse the steps above.

---

## Troubleshooting

### Error: "BHARATCODE_API_KEY required when agent.provider=bharatcode"

**Solution:** Ensure `.env.local` exists and is sourced:

```bash
cd backend
source .env.local
source venv/bin/activate
./run.sh
```

### Error: Connection refused to BharatCode API

**Possible causes:**
1. Network firewall blocking `bharatcode.ai`
2. API key is invalid or expired
3. BharatCode service is down

**Check:**
```bash
curl -X GET https://bharatcode.ai/api/model/v1/models \
  -H "Authorization: Bearer <your_key>"
```

### Backend starts but LLM calls fail silently

**Solution:** Check backend logs for API errors:

```bash
# Tail logs while running
uvicorn app.main:app --reload --port 8000 --log-level debug
```

### Frontend can't reach backend

**Check:**
1. Backend is running on port 8000
2. Frontend `.env` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
3. CORS is enabled (it is by default in `app/main.py`)

---

## Architecture Overview

```
BharatCode API
https://bharatcode.ai/api/model/v1
        ↑
        │ (ChatOpenAI client)
        │ Model: Qwen 36B
        │ Key: BHARATCODE_API_KEY
        │
┌───────┴─────────────────────────┐
│  FastAPI Backend (Port 8000)    │
│                                 │
│  LangGraph Agent Graph          │
│  ├─ call_agent()               │
│  │   (LLM reasoning)           │
│  ├─ execute_tool()             │
│  │   (Tool calls)              │
│  └─ route logic                │
│                                 │
│  Tools:                         │
│  ├─ log_lookup_tool            │
│  ├─ threat_intel_tool          │
│  ├─ asset_criticality_tool     │
│  └─ submit_decision_tool       │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
   SQLite       Next.js
   Database     Frontend
   (caira.db)   (Port 3000)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/config.yaml` | Provider & model config |
| `backend/.env.local` | API keys (sourced by run.sh) |
| `backend/run.sh` | Startup script with env loading |
| `app/agent/graph.py` | LangGraph + LLM build logic |
| `app/core/config.py` | Config loader (YAML → Pydantic) |

---

## Next Steps

1. **Start the system:**
   ```bash
   cd backend && ./run.sh
   # In another terminal:
   cd frontend && ./run.sh
   ```

2. **Access the app:** http://localhost:3000

3. **Run an investigation:** Click "Launch SOC Dashboard" → Select "ALT-001" → "Start Investigation"

4. **Monitor the LLM:** Watch the backend logs as the LLM reasons about the alert

---

## Support

- **Config Issues:** Check `backend/config.yaml` and `backend/.env.local`
- **API Errors:** Check backend logs: `--log-level debug`
- **LLM Timeouts:** Increase `max_iterations` in `config.yaml` (default: 15)
- **Database Issues:** Reset with `rm backend/caira.db` (data will be reseeded)

You're all set! 🚀
