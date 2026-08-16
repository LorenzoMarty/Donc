"""Spec migrar-jogos-estaticos-para-banco REQ-3: API expoe engine/payload/copy curada."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import get_current_user, require_admin
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


def _override_user(email: str):
    def _dep(db: Session = Depends(get_db)) -> User:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        return user

    return _dep


def _seed_classify_game() -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Classifique",
            category="repertorio",
            skill="Repertorio",
            difficulty="easy",
            engine="classify",
            status="approved",
            targets=["WEAK_REPERTOIRE"],
            payload={"instruction": "Arraste.", "buckets": [{"id": "b1", "label": "Filosofia"}], "items": [{"id": "i1", "text": "Kant", "bucketId": "b1"}]},
            description="Descricao curada.",
            thumbnail="repertorio-classify",
            estimated_time="4 min",
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_admin_list_returns_engine_and_payload(client):
    game_id = _seed_classify_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/ai-games")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    game = next(g for g in data if g["id"] == game_id)
    assert game["engine"] == "classify"
    assert game["payload"]["buckets"][0]["id"] == "b1"
    assert game["description"] == "Descricao curada."
    assert game["thumbnail"] == "repertorio-classify"
    assert game["estimated_time"] == "4 min"


def test_published_returns_engine_payload_and_curated_copy(client):
    game_id = _seed_classify_game()
    original_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = _override_user("aluno@demo.com")
    try:
        response = client.get("/api/v1/games/published")
    finally:
        if original_override is not None:
            app.dependency_overrides[get_current_user] = original_override
        else:
            app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    data = api_data(response)
    game = next(g for g in data if g["id"] == game_id)
    assert game["engine"] == "classify"
    assert game["payload"]["items"][0]["text"] == "Kant"
    assert game["description"] == "Descricao curada."


def test_quiz_game_published_without_payload_field_populated(client):
    """Engine quiz continua servido via `questions`; `payload` fica None, sem regressao."""
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Quiz normal",
            category="argumentacao",
            skill="Tese",
            difficulty="medium",
            engine="quiz",
            status="approved",
            targets=["WEAK_THESIS"],
            questions=[{"id": "q1", "prompt": "p", "options": ["a", "b"], "answer_index": 0, "explanation": "e", "status": "approved"}],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        game_id = game.id
    finally:
        db.close()

    original_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = _override_user("aluno@demo.com")
    try:
        response = client.get("/api/v1/games/published")
    finally:
        if original_override is not None:
            app.dependency_overrides[get_current_user] = original_override
        else:
            app.dependency_overrides.pop(get_current_user, None)

    data = api_data(response)
    game = next(g for g in data if g["id"] == game_id)
    assert game["engine"] == "quiz"
    assert game["payload"] is None
    assert len(game["questions"]) == 1


def test_admin_can_update_payload_of_non_quiz_game(client):
    """Spec migrar-jogos-estaticos-para-banco REQ-5: editor dedicado salva `payload` via PATCH,
    igual ao que ja acontece com `questions` pro engine quiz."""
    game_id = _seed_classify_game()
    new_payload = {
        "instruction": "Nova instrucao.",
        "buckets": [{"id": "b1", "label": "Filosofia"}, {"id": "b2", "label": "Sociologia"}],
        "items": [{"id": "i1", "text": "Kant", "bucketId": "b1"}, {"id": "i2", "text": "Weber", "bucketId": "b2"}],
    }
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.patch(f"/api/v1/admin/ai-games/{game_id}", json={"payload": new_payload})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    assert data["payload"]["buckets"] == new_payload["buckets"]
    assert data["edited_after_generation"] is True
