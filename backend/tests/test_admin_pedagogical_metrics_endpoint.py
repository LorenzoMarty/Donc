"""P2a Bloco 6 (REQ-19/REQ-20) — GET /admin/pedagogical-metrics."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_student_cannot_access_pedagogical_metrics(client):
    response = client.get("/api/v1/admin/pedagogical-metrics")
    assert response.status_code == 403


def test_admin_sees_pedagogical_metrics_shape(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        data = api_data(client.get("/api/v1/admin/pedagogical-metrics"))
        assert set(data) == {
            "shown",
            "started",
            "completed",
            "start_rate",
            "completion_rate",
            "avg_completion_seconds_by_type",
            "before_after_by_issue",
        }
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_admin_sees_shown_count_reflects_recommended_actions_calls(client):
    from src.memory.profile import get_or_create_learning_profile

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        profile = get_or_create_learning_profile(db, user.id)
        profile.cognitive_issues = {}
        db.commit()
    finally:
        db.close()

    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "admin-metrics-seed",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )
    client.get("/api/v1/ai/recommended-actions")

    app.dependency_overrides[require_admin] = override_admin
    try:
        data = api_data(client.get("/api/v1/admin/pedagogical-metrics"))
        assert data["shown"] >= 1
    finally:
        app.dependency_overrides.pop(require_admin, None)
