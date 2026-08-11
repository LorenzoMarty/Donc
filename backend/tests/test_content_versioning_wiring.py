"""P2c Bloco 2 (REQ-7/REQ-8/REQ-9/REQ-10) — edicao pos-criacao de AIGeneratedGame,
AIGeneratedExercise/Exercise e EssayTheme grava versao anterior recuperavel."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIGeneratedGame, ContentVersion, Exercise, Lesson, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True, payload
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def test_editing_ai_generated_game_records_previous_version(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        game = api_data(
            client.post(
                "/api/v1/admin/ai-games/generate",
                json={"skill": "coesao", "category": "gramatica", "difficulty": "medium", "count": 3},
            )
        )
        game_id = game["id"]
        original_name = game["name"]

        update_resp = client.patch(f"/api/v1/admin/ai-games/{game_id}", json={"name": "Nome totalmente novo"})
        assert update_resp.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        versions = list(
            db.scalars(
                select(ContentVersion).where(
                    ContentVersion.content_type == "AIGeneratedGame", ContentVersion.content_id == game_id
                )
            )
        )
        assert len(versions) == 1
        assert versions[0].snapshot["name"] == original_name
        assert versions[0].edited_by is not None

        game_row = db.get(AIGeneratedGame, game_id)
        assert game_row.name == "Nome totalmente novo"
    finally:
        db.close()


def test_editing_exercise_after_approval_records_previous_version(client):
    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        module_id, lesson_id = lesson.module_id, lesson.id
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]
        api_data(
            client.post(f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review", json={"action": "approve", "targets": ["C3_LOW"]})
        )

        db = SessionLocal()
        try:
            exercise = db.scalars(select(Exercise).order_by(Exercise.id.desc())).first()
            exercise_id = exercise.id
            original_statement = exercise.statement
        finally:
            db.close()

        update_resp = client.patch(
            f"/api/v1/admin/activities/{exercise_id}",
            json={"statement": "Enunciado totalmente reescrito com mais de vinte caracteres."},
        )
        assert update_resp.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        versions = list(
            db.scalars(
                select(ContentVersion).where(
                    ContentVersion.content_type == "Exercise", ContentVersion.content_id == exercise_id
                )
            )
        )
        assert len(versions) == 1
        assert versions[0].snapshot["statement"] == original_statement
    finally:
        db.close()


def test_editing_essay_theme_records_previous_version(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = api_data(client.post("/api/v1/admin/essay-themes/generate", json={"focus": "meio ambiente"}))
        theme_id = theme["id"]
        original_title = theme["title"]

        update_resp = client.patch(f"/api/v1/admin/essay-themes/{theme_id}", json={"title": "Título totalmente novo e diferente"})
        assert update_resp.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        versions = list(
            db.scalars(
                select(ContentVersion).where(
                    ContentVersion.content_type == "EssayTheme", ContentVersion.content_id == theme_id
                )
            )
        )
        assert len(versions) == 1
        assert versions[0].snapshot["title"] == original_title
    finally:
        db.close()


def test_get_content_versions_endpoint_lists_history(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        theme = api_data(client.post("/api/v1/admin/essay-themes/generate", json={"focus": "cultura digital"}))
        theme_id = theme["id"]
        client.patch(f"/api/v1/admin/essay-themes/{theme_id}", json={"title": "Outro titulo totalmente diferente"})

        history = api_data(client.get(f"/api/v1/admin/content-versions/EssayTheme/{theme_id}"))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert len(history) == 1
    assert history[0]["snapshot"]["title"] == theme["title"]
