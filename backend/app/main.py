from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.api.router import api_router
from app.services.seeder import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

# Initialize seed data
db_session = SessionLocal()
try:
    seed_database(db_session)
finally:
    db_session.close()

app = FastAPI(
    title="CAIRA — Confidence-aware Adaptive Incident Response Agent API",
    description="Evidence-gated AI cybersecurity incident response and evaluation platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "status": "ONLINE",
        "system": "CAIRA — Confidence-aware Adaptive Incident Response Agent",
        "version": "1.0.0",
        "docs": "/docs",
        "safety_guard": "SIMULATION MODE ACTIVE — NO REAL INFRASTRUCTURE MODIFIED"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
