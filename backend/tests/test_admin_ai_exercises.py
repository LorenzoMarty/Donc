"""P2c Bloco 1 (REQ-1..5) — fila de revisao real do AIGeneratedExercise, substitui o draft
efemero anterior do module builder."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIGeneratedExercise, Exercise, Lesson, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True, payload
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_lesson():
    db = SessionLocal()
    try:
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        return lesson.module_id, lesson.id
    finally:
        db.close()


def test_student_cannot_generate_ai_exercise(client):
    module_id, lesson_id = _seed_lesson()
    response = client.post(
        f"/api/v1/admin/modules/{module_id}/activities/generate",
        json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
    )
    assert response.status_code == 403


def test_generate_persists_pending_ai_generated_exercise(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert len(generated) == 1
    item = generated[0]
    assert item["status"] == "pending"
    assert item["id"] > 0

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedExercise, item["id"])
        assert row is not None
        assert row.status == "pending"
        assert row.module_id == module_id
    finally:
        db.close()


def test_list_ai_exercises_filters_by_status(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        pending_list = api_data(client.get("/api/v1/admin/ai-exercises?status=pending"))
        approved_list = api_data(client.get("/api/v1/admin/ai-exercises?status=approved"))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert any(item["status"] == "pending" for item in pending_list)
    assert all(item["status"] == "approved" for item in approved_list)


def test_approve_creates_real_exercise_and_marks_approved(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]

        db = SessionLocal()
        try:
            exercise_count_before = len(list(db.scalars(select(Exercise))))
        finally:
            db.close()

        review_response = client.post(
            f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review",
            json={"action": "approve", "targets": ["C3_LOW"]},
        )
        assert review_response.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedExercise, ai_exercise_id)
        assert row.status == "approved"
        assert row.reviewed_at is not None
        assert row.reviewed_by is not None

        exercise_count_after = len(list(db.scalars(select(Exercise))))
        assert exercise_count_after == exercise_count_before + 1

        new_exercise = db.scalars(select(Exercise).order_by(Exercise.id.desc())).first()
        assert new_exercise.module_id == module_id
        assert new_exercise.targets == ["C3_LOW"]
    finally:
        db.close()


def test_reviewing_twice_does_not_duplicate_exercise(client):
    """Dois admins (ou duplo-clique) revisando o mesmo AIGeneratedExercise pendente — sem a
    checagem de status em review_ai_exercise, o segundo approve criaria um segundo Exercise
    publicado a partir do mesmo item."""
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]

        db = SessionLocal()
        try:
            exercise_count_before = len(list(db.scalars(select(Exercise))))
        finally:
            db.close()

        first = client.post(
            f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review",
            json={"action": "approve", "targets": ["C3_LOW"]},
        )
        assert first.status_code == 200

        second = client.post(
            f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review",
            json={"action": "approve", "targets": ["C3_LOW"]},
        )
        assert second.status_code == 409
        assert second.json()["error"] == "already_reviewed"
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        exercise_count_after = len(list(db.scalars(select(Exercise))))
        assert exercise_count_after == exercise_count_before + 1
    finally:
        db.close()


def test_reject_does_not_create_exercise(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]

        db = SessionLocal()
        try:
            exercise_count_before = len(list(db.scalars(select(Exercise))))
        finally:
            db.close()

        client.post(f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review", json={"action": "reject"})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedExercise, ai_exercise_id)
        assert row.status == "rejected"
        exercise_count_after = len(list(db.scalars(select(Exercise))))
        assert exercise_count_after == exercise_count_before
    finally:
        db.close()


def test_editing_content_on_approve_marks_edited_after_generation(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]

        client.post(
            f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review",
            json={
                "action": "approve",
                "statement": "Enunciado totalmente reescrito pelo admin com mais de vinte caracteres.",
                "targets": ["C3_LOW"],
            },
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedExercise, ai_exercise_id)
        assert row.edited_after_generation is True
        assert row.statement == "Enunciado totalmente reescrito pelo admin com mais de vinte caracteres."
    finally:
        db.close()


def test_approve_without_editing_does_not_mark_edited(client):
    module_id, lesson_id = _seed_lesson()
    app.dependency_overrides[require_admin] = override_admin
    try:
        generated = api_data(
            client.post(
                f"/api/v1/admin/modules/{module_id}/activities/generate",
                json={"lesson_ids": [lesson_id], "difficulty": "medium", "count": 1},
            )
        )
        ai_exercise_id = generated[0]["id"]

        client.post(f"/api/v1/admin/ai-exercises/{ai_exercise_id}/review", json={"action": "approve", "targets": ["C3_LOW"]})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedExercise, ai_exercise_id)
        assert row.edited_after_generation is False
    finally:
        db.close()
