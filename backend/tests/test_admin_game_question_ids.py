"""P3a REQ-1/REQ-12: perguntas de jogo gerado por IA tem id estavel; jogos antigos sem id
(pre-migracao) continuam funcionando na leitura."""

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
            name="Jogo teste",
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


def test_generated_game_questions_have_stable_ids(client):
    game_id = _seed_approved_quiz_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 3})
        game = api_data(response)
    finally:
        app.dependency_overrides.pop(require_admin, None)

    ids = [q["id"] for q in game["questions"]]
    assert all(ids)
    assert len(ids) == len(set(ids))


def test_legacy_game_without_question_ids_still_reads_fine(client):
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo legado",
            category="argumentacao",
            skill="teste",
            difficulty="medium",
            questions=[{"prompt": "P1", "options": ["a", "b"], "answer_index": 0, "explanation": "..."}],
            status="pending",
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        game_id = game.id
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/ai-games")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    games = api_data(response)
    target = next(g for g in games if g["id"] == game_id)
    assert target["questions"][0]["id"]
