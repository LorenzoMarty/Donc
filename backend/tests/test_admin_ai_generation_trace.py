"""P2b Bloco 1 (REQ-3) — reconstruir origem de um conteudo IA via GET /admin/ai-generations."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_approved_quiz_game() -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste trace",
            category="argumentacao",
            skill="coesao textual",
            difficulty="medium",
            questions=[],
            status="approved",
            targets=["WEAK_THESIS"],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_student_cannot_access_ai_generation_trace(client):
    response = client.get("/api/v1/admin/ai-generations/AIGeneratedGame/1")
    assert response.status_code == 403


def test_trace_reconstructs_who_when_and_cost_of_a_generated_game(client):
    game_id = _seed_approved_quiz_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 2})

        trace = api_data(client.get(f"/api/v1/admin/ai-generations/AIGeneratedGame/{game_id}"))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert len(trace) == 1
    entry = trace[0]
    assert entry["workflow"] == "admin_game_question_addition"
    assert entry["agent"] == "GameGeneratorAgent"
    assert entry["user_id"] is not None
    assert entry["created_at"] is not None
    assert "skill" in entry["meta"]


def test_trace_empty_for_unknown_content(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        trace = api_data(client.get("/api/v1/admin/ai-generations/AIGeneratedGame/999999999"))
    finally:
        app.dependency_overrides.pop(require_admin, None)
    assert trace == []
