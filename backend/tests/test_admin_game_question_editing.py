"""P3a REQ-2/REQ-3/REQ-4/REQ-7/REQ-11: add/remove/reordenar pergunta de jogo, gravando
ContentVersion, endpoints require_admin."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import ContentVersion, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_game(questions=None) -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste",
            category="argumentacao",
            skill="teste",
            difficulty="medium",
            questions=questions
            or [
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


def test_add_question_appends_with_new_id(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/ai-games/{game_id}/questions",
            json={"prompt": "Pergunta nova", "options": ["x", "y"], "answer_index": 0, "explanation": "exp"},
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    assert len(data["questions"]) == 3
    new_q = data["questions"][-1]
    assert new_q["prompt"] == "Pergunta nova"
    assert new_q["id"] not in ("q1", "q2")


def test_remove_question_by_id(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.delete(f"/api/v1/admin/ai-games/{game_id}/questions/q1")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    ids = [q["id"] for q in data["questions"]]
    assert ids == ["q2"]


def test_remove_unknown_question_id_is_404(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.delete(f"/api/v1/admin/ai-games/{game_id}/questions/does-not-exist")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 404


def test_reorder_questions(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/ai-games/{game_id}/questions/reorder",
            json={"question_ids": ["q2", "q1"]},
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    assert [q["id"] for q in data["questions"]] == ["q2", "q1"]


def test_reorder_with_mismatched_ids_is_rejected(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/ai-games/{game_id}/questions/reorder",
            json={"question_ids": ["q1"]},
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 422


def test_add_question_records_content_version(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(
            f"/api/v1/admin/ai-games/{game_id}/questions",
            json={"prompt": "Pergunta nova", "options": ["x", "y"], "answer_index": 0, "explanation": "exp"},
        )
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        versions = db.scalars(
            select(ContentVersion).where(ContentVersion.content_type == "AIGeneratedGame", ContentVersion.content_id == game_id)
        ).all()
    finally:
        db.close()
    assert len(versions) == 1
    assert len(versions[0].snapshot["questions"]) == 2


def test_question_endpoints_require_admin(client):
    game_id = _seed_game()
    response = client.post(
        f"/api/v1/admin/ai-games/{game_id}/questions",
        json={"prompt": "Pergunta nova", "options": ["x", "y"], "answer_index": 0, "explanation": "exp"},
    )
    assert response.status_code in (401, 403)
