"""P2c Bloco 3 (REQ-11/REQ-12/REQ-13) — status ARCHIVED reversivel, some da listagem do aluno,
continua no banco."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIGeneratedGame, Difficulty, Exercise, Module, User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True, payload
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_exercise() -> int:
    db = SessionLocal()
    try:
        module = db.scalar(select(Module))
        exercise = Exercise(
            module_id=module.id,
            statement="Enunciado valido para teste de arquivamento de exercicio real.",
            options=["A", "B", "C", "D", "E"],
            correct_answer="A",
            explanation="Explicacao valida com mais de vinte caracteres.",
            skill="c3",
            difficulty=Difficulty.MEDIUM,
        )
        db.add(exercise)
        db.commit()
        db.refresh(exercise)
        return exercise.id
    finally:
        db.close()


def test_archive_game_removes_it_from_published_list_but_keeps_row(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        game = api_data(
            client.post(
                "/api/v1/admin/ai-games/generate",
                json={"skill": "coesao", "category": "gramatica", "difficulty": "medium", "count": 3},
            )
        )
        game_id = game["id"]
        client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "approve", "targets": ["C3_LOW"]})

        published_before = api_data(client.get("/api/v1/games/published"))
        assert any(g["id"] == game_id for g in published_before)

        archive_resp = client.post(f"/api/v1/admin/ai-games/{game_id}/archive")
        assert archive_resp.status_code == 200

        published_after = api_data(client.get("/api/v1/games/published"))
        assert all(g["id"] != game_id for g in published_after)
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        row = db.get(AIGeneratedGame, game_id)
        assert row is not None
        assert row.status == "archived"
    finally:
        db.close()


def test_unarchive_game_restores_it_to_published_list(client):
    app.dependency_overrides[require_admin] = override_admin
    try:
        game = api_data(
            client.post(
                "/api/v1/admin/ai-games/generate",
                json={"skill": "coesao", "category": "gramatica", "difficulty": "medium", "count": 3},
            )
        )
        game_id = game["id"]
        client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "approve", "targets": ["C3_LOW"]})
        client.post(f"/api/v1/admin/ai-games/{game_id}/archive")

        unarchive_resp = client.post(f"/api/v1/admin/ai-games/{game_id}/unarchive")
        assert unarchive_resp.status_code == 200

        published = api_data(client.get("/api/v1/games/published"))
        assert any(g["id"] == game_id for g in published)
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_archive_exercise_removes_it_from_student_listing_but_keeps_row(client):
    exercise_id = _seed_exercise()

    before = api_data(client.get("/api/v1/exercises"))
    assert any(e["id"] == exercise_id for e in before)

    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/activities/{exercise_id}/archive")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    after = api_data(client.get("/api/v1/exercises"))
    assert all(e["id"] != exercise_id for e in after)

    db = SessionLocal()
    try:
        row = db.get(Exercise, exercise_id)
        assert row is not None
        assert row.archived is True
    finally:
        db.close()


def test_unarchive_exercise_restores_student_listing(client):
    exercise_id = _seed_exercise()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/activities/{exercise_id}/archive")
        response = client.post(f"/api/v1/admin/activities/{exercise_id}/unarchive")
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    after = api_data(client.get("/api/v1/exercises"))
    assert any(e["id"] == exercise_id for e in after)
