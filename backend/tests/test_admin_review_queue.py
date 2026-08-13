"""P3b REQ-4/REQ-9: fila de revisao unificada agregando jogo+exercicio+tema pendentes."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import Lesson, User
from src.models.essay import EssayTheme
from src.models.events import AIGeneratedExercise, AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_all_types():
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo pendente",
            category="argumentacao",
            skill="coesao",
            difficulty="medium",
            questions=[],
            status="pending",
            targets=["SHALLOW_ARGUMENTATION"],
        )
        lesson = db.scalar(select(Lesson))
        assert lesson is not None
        exercise = AIGeneratedExercise(
            module_id=lesson.module_id,
            lesson_id=lesson.id,
            statement="Exercicio pendente",
            options=["A", "B"],
            correct_answer="A",
            explanation="exp",
            skill="coesao",
            difficulty="hard",
            targets=["WEAK_REPERTOIRE"],
            status="pending",
        )
        theme = EssayTheme(
            title="Tema pendente sobre mobilidade urbana",
            context="Contexto suficientemente longo para validar o tema gerado por teste automatizado.",
            source="IA Donc",
            is_active=False,
            status="pending",
        )
        db.add_all([game, exercise, theme])
        db.commit()
        return {"game_id": game.id, "exercise_id": exercise.id, "theme_id": theme.id}
    finally:
        db.close()


def test_review_queue_aggregates_pending_across_types(client):
    ids = _seed_all_types()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/review-queue")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    items = api_data(response)
    by_type = {(item["content_type"], item["content_id"]) for item in items}
    assert ("game", ids["game_id"]) in by_type
    assert ("exercise", ids["exercise_id"]) in by_type
    assert ("theme", ids["theme_id"]) in by_type
    assert all(item["status"] == "pending" for item in items)


def test_review_queue_filters_by_content_type(client):
    ids = _seed_all_types()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/review-queue?content_type=theme")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    items = api_data(response)
    assert {item["content_type"] for item in items} == {"theme"}
    assert ids["theme_id"] in {item["content_id"] for item in items}


def test_review_queue_filters_by_target(client):
    ids = _seed_all_types()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/review-queue?target=WEAK_REPERTOIRE")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    items = api_data(response)
    assert ("exercise", ids["exercise_id"]) in {(item["content_type"], item["content_id"]) for item in items}
    assert all(item["content_type"] != "theme" for item in items)


def test_review_queue_filters_by_difficulty(client):
    ids = _seed_all_types()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/review-queue?difficulty=hard")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    items = api_data(response)
    assert ("exercise", ids["exercise_id"]) in {(item["content_type"], item["content_id"]) for item in items}
    assert all(item["content_type"] != "theme" for item in items)


def test_review_queue_filters_by_created_from(client):
    ids = _seed_all_types()
    app.dependency_overrides[require_admin] = override_admin
    try:
        future = api_data(client.get("/api/v1/admin/review-queue"))[0]["created_at"][:10]
        far_future_response = client.get(f"/api/v1/admin/review-queue?created_from=2999-01-01")
        matching_response = client.get(f"/api/v1/admin/review-queue?created_from={future}")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert api_data(far_future_response) == []
    matching_ids = {(item["content_type"], item["content_id"]) for item in api_data(matching_response)}
    assert ("theme", ids["theme_id"]) in matching_ids


def test_review_queue_requires_admin(client):
    response = client.get("/api/v1/admin/review-queue")
    assert response.status_code in (401, 403)
