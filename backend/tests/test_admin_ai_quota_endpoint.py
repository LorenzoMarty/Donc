"""P2b Bloco 2 (REQ-6) — GET /admin/ai-quota."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import get_db
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


def test_student_cannot_access_ai_quota_status(client):
    response = client.get("/api/v1/admin/ai-quota")
    assert response.status_code == 403


def test_admin_sees_ai_quota_status_shape(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        data = api_data(client.get("/api/v1/admin/ai-quota"))
        assert set(data) == {
            "daily_limit_micro_usd_per_user",
            "daily_limit_micro_usd_per_workflow",
            "per_user_today",
            "per_workflow_today",
        }
    finally:
        app.dependency_overrides.pop(require_admin, None)
