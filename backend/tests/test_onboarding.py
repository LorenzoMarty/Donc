def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_onboarding_defaults_to_valid_empty_shape_when_not_completed(client):
    data = api_data(client.get("/api/v1/auth/onboarding"))
    assert data["completed"] is False
    assert data["goal"] is None
    assert data["level"] is None


def test_onboarding_persists_goal_and_level(client):
    response = client.put("/api/v1/auth/onboarding", json={"goal": "900+", "level": "iniciante"})
    assert response.status_code == 200
    data = api_data(response)
    assert data["goal"] == "900+"
    assert data["level"] == "iniciante"
    assert data["completed"] is True

    fetched = api_data(client.get("/api/v1/auth/onboarding"))
    assert fetched["goal"] == "900+"
    assert fetched["level"] == "iniciante"
    assert fetched["completed"] is True


def test_onboarding_rejects_unknown_goal_value(client):
    response = client.put("/api/v1/auth/onboarding", json={"goal": "nao-existe", "level": "iniciante"})
    assert response.status_code == 422



def test_onboarding_belongs_to_the_correct_user(client):
    from fastapi import Depends
    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from src.database.session import get_db
    from src.dependencies import get_current_user
    from src.main import app
    from src.models import User

    client.put("/api/v1/auth/onboarding", json={"goal": "900+", "level": "avancado"})

    def _override_admin(db: Session = Depends(get_db)) -> User:
        user = db.scalar(select(User).where(User.email == "admin@demo.com"))
        assert user is not None
        return user

    original_override = app.dependency_overrides[get_current_user]
    app.dependency_overrides[get_current_user] = _override_admin
    try:
        other_data = api_data(client.get("/api/v1/auth/onboarding"))
        assert other_data["goal"] is None
        assert other_data["completed"] is False
    finally:
        app.dependency_overrides[get_current_user] = original_override
