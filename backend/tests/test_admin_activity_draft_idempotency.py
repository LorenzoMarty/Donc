"""P2b Bloco 3 (REQ-8) — idempotency key na geração de exercício IA. Desde P2c Bloco 1, a
geração persiste AIGeneratedExercise (não é mais draft efêmero) — chave repetida retorna as
mesmas linhas via find_cached_generation, sem gerar duas vezes."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIInteractionLog, Lesson, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_repeated_activity_draft_generation_with_same_key_returns_same_drafts(client):
    from src.database.session import SessionLocal

    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        module_id = lesson.module_id
        lesson_id = lesson.id
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        payload = {"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1, "idempotency_key": "draft-key-1"}
        first = api_data(client.post(f"/api/v1/admin/modules/{module_id}/activities/generate", json=payload))
        second = api_data(client.post(f"/api/v1/admin/modules/{module_id}/activities/generate", json=payload))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert first == second

    db = SessionLocal()
    try:
        log_count = len(
            list(db.scalars(select(AIInteractionLog).where(AIInteractionLog.idempotency_key == "draft-key-1")))
        )
    finally:
        db.close()
    assert log_count == 1
