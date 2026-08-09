"""REQ-29/31: GET /admin/content-quality agrega conteudo sem target, nunca usado, jogos IA
rejeitados/editados apos geracao, e contagem de conteudo por CognitiveIssue."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import Lesson, Module, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_lesson_without_target() -> int:
    db = SessionLocal()
    try:
        module = db.scalar(select(Module))
        assert module is not None
        lesson = Lesson(
            module_id=module.id,
            title="Aula sem target de teste",
            description="Descricao.",
            thumbnail_url="https://example.com/t.jpg",
            video_url="https://example.com/v.mp4",
            summary="Resumo.",
            order=999,
            targets=[],
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        return lesson.id
    finally:
        db.close()


def test_student_cannot_access_content_quality_report(client):
    response = client.get("/api/v1/admin/content-quality")
    assert response.status_code == 403


def test_content_quality_lists_lesson_without_target(client):
    lesson_id = _seed_lesson_without_target()
    app.dependency_overrides[require_admin] = override_admin
    try:
        report = api_data(client.get("/api/v1/admin/content-quality"))
        ids = [item["id"] for item in report["lessons_without_target"]]
        assert lesson_id in ids
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_content_quality_lists_rejected_and_edited_games(client):
    db = SessionLocal()
    try:
        rejected = AIGeneratedGame(name="Rejeitado", category="c", skill="s", difficulty="medium", questions=[], status="rejected", targets=["C3_LOW"])
        edited = AIGeneratedGame(
            name="Editado",
            category="c",
            skill="s",
            difficulty="medium",
            questions=[],
            status="approved",
            targets=["C3_LOW"],
            edited_after_generation=True,
        )
        db.add_all([rejected, edited])
        db.commit()
        db.refresh(rejected)
        db.refresh(edited)
        rejected_id, edited_id = rejected.id, edited.id
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        report = api_data(client.get("/api/v1/admin/content-quality"))
        assert rejected_id in [item["id"] for item in report["rejected_games"]]
        assert edited_id in [item["id"] for item in report["edited_games"]]
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_content_quality_counts_content_by_issue(client):
    lesson_id = _seed_lesson_without_target()
    db = SessionLocal()
    try:
        lesson = db.get(Lesson, lesson_id)
        assert lesson is not None
        lesson.targets = ["C3_LOW"]
        db.commit()
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        report = api_data(client.get("/api/v1/admin/content-quality"))
        c3_row = next(row for row in report["content_by_issue"] if row["code"] == "C3_LOW")
        assert c3_row["lessons"] >= 1
    finally:
        app.dependency_overrides.pop(require_admin, None)
