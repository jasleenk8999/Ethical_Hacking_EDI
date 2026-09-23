def test_app_startup():
    from app.main import app
    assert app is not None
