"""P2b Bloco 1 (REQ-1) — geracao de AIGeneratedGame linka content_id no AIInteractionLog."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIInteractionLog, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_generate_game_links_content_id_in_interaction_log(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            "/api/v1/admin/ai-games/generate",
            json={"skill": "coesao textual", "category": "gramatica", "difficulty": "medium", "count": 3},
        )
        assert response.status_code == 200
        game = api_data(response)
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        log = db.scalar(
            select(AIInteractionLog)
            .where(AIInteractionLog.workflow == "admin_game_generation")
            .order_by(AIInteractionLog.id.desc())
        )
    finally:
        db.close()
    assert log is not None
    assert log.content_id == game["id"]
    assert log.content_type == "AIGeneratedGame"
