"""P3a REQ-5/REQ-6/REQ-7/REQ-11: regeneracao granular de 1 pergunta via IA, preservando
competencia/dificuldade do jogo, sem afetar as demais perguntas."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIInteractionLog, ContentVersion, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_game() -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste",
            category="argumentacao",
            skill="coesao textual",
            difficulty="medium",
            questions=[
                {"id": "q1", "prompt": "Pergunta 1", "options": ["a", "b"], "answer_index": 0, "explanation": "e1"},
                {"id": "q2", "prompt": "Pergunta 2", "options": ["a", "b"], "answer_index": 1, "explanation": "e2"},
            ],
            status="pending",
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_regenerate_replaces_only_target_question(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q1/regenerate")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    ids = [q["id"] for q in data["questions"]]
    assert ids == ["q1", "q2"]
    q2 = next(q for q in data["questions"] if q["id"] == "q2")
    assert q2["prompt"] == "Pergunta 2"


def test_regenerate_unknown_question_is_404(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/does-not-exist/regenerate")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 404


def test_regenerate_records_content_version_and_marks_edited(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q1/regenerate")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        versions = db.scalars(
            select(ContentVersion).where(ContentVersion.content_type == "AIGeneratedGame", ContentVersion.content_id == game_id)
        ).all()
        game = db.get(AIGeneratedGame, game_id)
    finally:
        db.close()
    assert len(versions) == 1
    assert game.edited_after_generation is True


def test_regenerate_logs_ai_interaction(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q1/regenerate")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        log = db.scalar(
            select(AIInteractionLog)
            .where(AIInteractionLog.workflow == "admin_game_question_regeneration")
            .order_by(AIInteractionLog.id.desc())
        )
    finally:
        db.close()
    assert log is not None
    assert log.content_id == game_id
    assert log.content_type == "AIGeneratedGame"


def test_regenerate_requires_admin(client):
    game_id = _seed_game()
    response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/q1/regenerate")
    assert response.status_code in (401, 403)
