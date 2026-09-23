"""
Pytest configuration for backend tests.
"""

import pytest
from app.database import get_db, engine, Base
from app.main import app
from fastapi.testclient import TestClient


@pytest.fixture(scope="function")
def test_db():
    """Create a fresh test database for each test."""
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal
    db = SessionLocal()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_client_with_deterministic_investigation(test_db, monkeypatch):
    """
    FastAPI TestClient where investigation calls use test seam for determinism.
    
    This patches the investigation pipeline at module import time to ensure
    the TestClient sees the deterministic behavior without needing environment
    variables or production code changes.
    """
    def override_get_db():
        return test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Patch run_investigation_pipeline_integrated to use test seam
    from app.services.investigation_integrated import run_investigation_pipeline_integrated as original_pipeline
    from app.services.investigation_test_seam import run_deterministic_investigation
    
    def deterministic_pipeline(db, alert_id, scoring_method="WEIGHTED_TRUST", use_test_seam=False):
        # Always use deterministic path for testing
        return run_deterministic_investigation(db, alert_id, scoring_method)
    
    # Patch at the router module level so TestClient sees it
    import app.api.router as router_module
    monkeypatch.setattr(router_module, "run_investigation_pipeline_integrated", deterministic_pipeline)
    
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def test_client(test_db):
    """
    FastAPI TestClient with normal (production) investigation path.
    
    Tests using this fixture will call the real investigation pipeline,
    which requires LLM/agent infrastructure (unlikely to work in test env).
    
    Prefer test_client_with_deterministic_investigation for most tests.
    """
    def override_get_db():
        return test_db
    
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def mock_investigation_with_test_seam(test_db, monkeypatch):
    """
    Fixture that patches run_investigation_pipeline_integrated to use test seam.
    
    This is useful when calling the service directly (not via TestClient).
    
    Usage:
        def test_something(test_db, mock_investigation_with_test_seam):
            from app.services.investigation_integrated import run_investigation_pipeline_integrated
            result = run_investigation_pipeline_integrated(test_db, "alert-123")
            # Will use deterministic test seam
    """
    from app.services.investigation_integrated import run_investigation_pipeline_integrated
    from app.services.investigation_test_seam import run_deterministic_investigation
    
    def mock_pipeline(db, alert_id, scoring_method="WEIGHTED_TRUST", use_test_seam=False):
        return run_deterministic_investigation(db, alert_id, scoring_method)
    
    monkeypatch.setattr(
        "app.services.investigation_integrated.run_investigation_pipeline_integrated",
        mock_pipeline
    )
    
    yield
