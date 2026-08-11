"""P2b Bloco 4 (REQ-11/REQ-12) — GET /admin/ai-quality (backend only, sem UI)."""

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


def test_student_cannot_access_ai_quality_report(client):
    response = client.get("/api/v1/admin/ai-quality")
    assert response.status_code == 403


def test_admin_sees_ai_quality_report_after_generating_a_game(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(
            "/api/v1/admin/ai-games/generate",
            json={"skill": "coesao textual", "category": "gramatica", "difficulty": "medium", "count": 3},
        )
        report = api_data(client.get("/api/v1/admin/ai-quality"))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    row = next(item for item in report if item["content_type"] == "AIGeneratedGame")
    assert row["generated"] >= 1
