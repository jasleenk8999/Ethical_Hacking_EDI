# CAIRA LLM Architecture & BharatCode Integration

## Architecture Summary

**CAIRA uses actual LLM inference** — it's NOT hardcoded logic. Here's how it works:

### Evidence-Gated Reasoning Loop

1. **LLM (Real AI)** receives the alert and system prompt
2. **LLM decides** which of 3 tools to call:
   - `log_lookup_tool` — investigate user activity in logs
   - `threat_intel_tool` — check IP reputation
   - `asset_criticality_tool` — check asset value
3. **LLM calls tools** via LangGraph/LangChain tool binding
4. **Each tool** queries the SQLite database for real data
5. **LLM analyzes** returned evidence and decides next action
6. **LLM submits decision** via `submit_decision_tool` with reasoning

### Why This Matters

- The LLM genuinely reasons about the evidence
- Tool results are real database queries (not fake data)
- The agent can handle unexpected evidence or conflicting signals
- Different LLMs may arrive at different conclusions

---

## BharatCode Configuration (Already Set Up ✓)

### Current Configuration

Your project is **already configured for BharatCode**:

```yaml
# backend/config.yaml
agent:
  provider: bharatcode
  bharatcode:
    model: bharatcode:qwen36-35b-q6-256k-vision
    base_url: https://bharatcode.ai/api/model/v1
```

```bash
# backend/.env
BHARATCODE_API_KEY=bc_live_9d6d8182decf4436b8fecfa2128145ba_GFDNHs4ofmKEwCzulHOQ276h87pJW6FPmF6dyRHoNho
```

### How It Works

When you start the backend:

```python
# From app/agent/graph.py :: build_llm()
if provider == "bharatcode":
    key = os.getenv("BHARATCODE_API_KEY")  # ← Reads from .env
    return ChatOpenAI(
        model=settings.agent.bharatcode.model,            # Qwen model
        api_key=key,
        base_url=settings.agent.bharatcode.base_url,      # BharatCode endpoint
        temperature=0.0,  # Deterministic responses
    )
```

**The ChatOpenAI client is OpenAI API-compatible**, so it works seamlessly with BharatCode's endpoint.

---

## Testing BharatCode Integration

### 1. Verify API Key is Loaded

```bash
cd backend
source venv/bin/activate
python -c "import os; from app.core.config import get_settings; s = get_settings(); print(f'Provider: {s.agent.provider}'); print(f'API Key present: {bool(os.getenv(\"BHARATCODE_API_KEY\"))}')"
```

Expected output:
```
Provider: bharatcode
API Key present: True
```

### 2. Test LLM Build (Optional)

```bash
python -c "from app.agent.graph import build_llm; llm = build_llm(); print(f'LLM built: {llm}')"
```

### 3. Start the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — if the API starts without `RuntimeError`, the API key was accepted.

---

## If You See `BHARATCODE_API_KEY Required` Error

This means:

1. The `.env` file is not being read, OR
2. The API key is blank

**Fix:**

```bash
# Ensure backend/.env exists
cat backend/.env | grep BHARATCODE

# Should show:
# BHARATCODE_API_KEY=bc_live_...

# If blank, update it:
echo 'BHARATCODE_API_KEY=bc_live_9d6d8182decf4436b8fecfa2128145ba_GFDNHs4ofmKEwCzulHOQ276h87pJW6FPmF6dyRHoNho' >> backend/.env
```

---

## Switching Providers

### To Use Anthropic Claude Instead

1. **Edit config.yaml:**
   ```yaml
   agent:
     provider: anthropic  # Change from bharatcode
   ```

2. **Set API key in .env:**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Restart backend:**
   ```bash
   # Ctrl+C to stop
   uvicorn app.main:app --reload --port 8000
   ```

---

## Architecture Diagram

```
┌─────────────────┐
│  Frontend       │  (Next.js app)
│  http://3000    │
└────────┬────────┘
         │
         │ API calls (POST /api/investigate)
         ▼
┌─────────────────────────────────────────┐
│  FastAPI Backend (Port 8000)            │
│                                         │
│  1. load config.yaml                    │
│  2. build_llm() ─────────────────┐      │
│     ├─ Check provider (bharatcode)     │
│     ├─ Load BHARATCODE_API_KEY ──┐     │
│     └─ ChatOpenAI(model, key,    │     │
│        base_url)                 │     │
│                                  │     │
│  3. LangGraph agent             │     │
│     ├─ call_agent() ◄──────────LLM    │
│     │  (LLM reasons)                  │
│     ├─ execute_tool()                 │
│     │  (Query database)               │
│     └─ repeat until decision          │
└─────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  SQLite DB       │  (Evidence queries)
│  caira.db        │
└──────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ BharatCode API (External)                │
│ https://bharatcode.ai/api/model/v1       │
│                                          │
│ Qwen 36B LLM (Inference)                │
└──────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/config.yaml` | Provider & model configuration |
| `backend/.env` | API keys (not in git) |
| `app/agent/graph.py` | LangGraph agent + LLM build logic |
| `app/core/config.py` | Settings loader (config.yaml → Pydantic) |
| `app/services/tools.py` | Real tool implementations (DB queries) |

---

## Next Steps

1. **Verify BharatCode is working:** Start backend and check logs
2. **Send an investigation:** POST to `/api/investigate` with an alert ID
3. **Monitor LLM reasoning:** View evidence log and confidence scores in the response

Your setup is **ready to use BharatCode** — just start the backend!
