"""P2b Bloco 3 (REQ-8) — idempotency key real nos 3 endpoints de geracao admin."""

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIGeneratedGame, AIInteractionLog, EssayTheme, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_repeated_game_generation_with_same_key_does_not_duplicate(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        payload = {
            "skill": "coesao textual",
            "category": "gramatica",
            "difficulty": "medium",
            "count": 3,
            "idempotency_key": "test-game-key-1",
        }
        first = api_data(client.post("/api/v1/admin/ai-games/generate", json=payload))
        second = api_data(client.post("/api/v1/admin/ai-games/generate", json=payload))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert first["id"] == second["id"]

    db = SessionLocal()
    try:
        game_count = db.scalar(select(func.count()).select_from(AIGeneratedGame).where(AIGeneratedGame.id == first["id"]))
        log_count = db.scalar(
            select(func.count()).select_from(AIInteractionLog).where(AIInteractionLog.idempotency_key == "test-game-key-1")
        )
    finally:
        db.close()
    assert game_count == 1
    assert log_count == 1


def test_different_key_generates_a_new_game(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        first = api_data(
            client.post(
                "/api/v1/admin/ai-games/generate",
                json={"skill": "coesao textual", "category": "gramatica", "difficulty": "medium", "count": 3, "idempotency_key": "key-a"},
            )
        )
        second = api_data(
            client.post(
                "/api/v1/admin/ai-games/generate",
                json={"skill": "coesao textual", "category": "gramatica", "difficulty": "medium", "count": 3, "idempotency_key": "key-b"},
            )
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert first["id"] != second["id"]


def test_repeated_theme_generation_with_same_key_does_not_duplicate(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        payload = {"focus": "meio ambiente urbano", "idempotency_key": "test-theme-key-1"}
        first = api_data(client.post("/api/v1/admin/essay-themes/generate", json=payload))
        second = api_data(client.post("/api/v1/admin/essay-themes/generate", json=payload))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert first["id"] == second["id"]

    db = SessionLocal()
    try:
        theme_count = db.scalar(select(func.count()).select_from(EssayTheme).where(EssayTheme.id == first["id"]))
    finally:
        db.close()
    assert theme_count == 1
