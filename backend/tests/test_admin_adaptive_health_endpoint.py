"""P2c Bloco 4 (REQ-14) — GET /admin/adaptive-health."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True, payload
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_student_cannot_access_adaptive_health(client):
    response = client.get("/api/v1/admin/adaptive-health")
    assert response.status_code == 403


def test_admin_sees_adaptive_health_shape(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        data = api_data(client.get("/api/v1/admin/adaptive-health"))
        assert set(data) == {
            "students_without_diagnosis",
            "students_without_recommendation",
            "recommendations_without_content",
            "issues_without_content",
            "issues_without_progress",
        }
        assert isinstance(data["students_without_diagnosis"], list)
    finally:
        app.dependency_overrides.pop(require_admin, None)
