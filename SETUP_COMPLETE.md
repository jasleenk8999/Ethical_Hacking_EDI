# CAIRA Project Setup ✓

## Backend Setup Complete

- ✅ Python virtual environment created: `backend/venv/`
- ✅ All dependencies installed (FastAPI, SQLAlchemy, LangChain, LangGraph, etc.)
- ✅ Environment file created: `backend/.env`
- ✅ Config file ready: `backend/config.yaml`
  - Provider: **bharatcode** (Qwen model)
  - Database: **SQLite** (caira.db)

## Frontend Setup Complete

- ✅ All npm dependencies installed
- ✅ Next.js v16.3.0 configured
- ✅ React v19.2.8 ready
- ✅ Environment variables configured (`.env`)

## Configuration

| Setting | Value |
|---------|-------|
| Backend Port | 8000 |
| Frontend Port | 3000 |
| API URL | http://localhost:8000/api |
| LLM Provider | bharatcode (Qwen) |
| Database | SQLite (local) |

## Next Steps

### 1. Start Backend (Terminal 1)

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### 2. Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

### 4. (Optional) Switch LLM Provider

To use Anthropic Claude instead of BharatCode:

1. Edit `backend/config.yaml` and set `agent.provider: anthropic`
2. Add your API key to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. Restart the backend server

## Verification

All core dependencies are installed and verified:
- Backend: FastAPI, SQLAlchemy, LangChain, LangGraph ✓
- Frontend: Next.js, React ✓
