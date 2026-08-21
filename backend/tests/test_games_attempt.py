from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import get_current_user
from src.main import app
from src.models import GameAttempt, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _other_student() -> User:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user
    finally:
        db.close()


def _override_user(email: str):
    def _dep(db: Session = Depends(get_db)) -> User:
        user = db.scalar(select(User).where(User.email == email))
        assert user is not None
        return user

    return _dep


def _valid_payload(**overrides):
    payload = {
        "game_id": "fallacy-hunt",
        "score": 7,
        "total": 10,
        "duration_seconds": 90,
        "cognitive_outcomes": [
            {"hub": "introducao-sem-tese", "event": "SHARP_THESIS", "severity": 0.6}
        ],
    }
    payload.update(overrides)
    return payload


def test_complete_game_persists_attempt_and_updates_progress(client):
    response = client.post("/api/v1/games/complete", json=_valid_payload())
    assert response.status_code == 200
    data = api_data(response)
    assert data["game_id"] == "fallacy-hunt"
    assert data["score"] == 7
    assert data["total"] == 10
    assert data["accuracy"] == 70

    db = SessionLocal()
    try:
        row = db.scalar(select(GameAttempt).where(GameAttempt.game_id == "fallacy-hunt"))
        assert row is not None
        assert row.score == 7
        assert row.accuracy == 70
        assert row.cognitive_outcomes[0]["hub"] == "introducao-sem-tese"
    finally:
        db.close()

    progress_response = client.get("/api/v1/games/progress")
    progress = next(p for p in api_data(progress_response) if p["game_id"] == "fallacy-hunt")
    assert progress["best_score"] == 7
    assert progress["plays"] == 1


def test_complete_game_rejects_score_above_total(client):
    response = client.post("/api/v1/games/complete", json=_valid_payload(score=50, total=10))
    assert response.status_code == 422


def test_complete_game_rejects_absurd_total(client):
    response = client.post("/api/v1/games/complete", json=_valid_payload(total=999999, score=999999))
    assert response.status_code == 422


def test_complete_game_rejects_absurd_duration(client):
    response = client.post("/api/v1/games/complete", json=_valid_payload(duration_seconds=999999))
    assert response.status_code == 422


def test_complete_game_rejects_unknown_cognitive_hub(client):
    response = client.post(
        "/api/v1/games/complete",
        json=_valid_payload(cognitive_outcomes=[{"hub": "hub-que-nao-existe", "event": "X", "severity": 0.5}]),
    )
    assert response.status_code == 422


def test_complete_game_rejects_unpublished_ai_game(client):
    db = SessionLocal()
    try:
        game = AIGeneratedGame(name="Pendente", category="repertorio", skill="x", difficulty="medium", questions=[], status="pending")
        db.add(game)
        db.commit()
        db.refresh(game)
        game_id = game.id
    finally:
        db.close()

    response = client.post("/api/v1/games/complete", json=_valid_payload(game_id=f"ai-{game_id}", cognitive_outcomes=[]))
    assert response.status_code == 404
    assert response.json()["error"] == "game_not_found"


def test_complete_game_accepts_approved_ai_game(client):
    db = SessionLocal()
    try:
        game = AIGeneratedGame(name="Aprovado", category="repertorio", skill="x", difficulty="medium", questions=[], status="approved")
        db.add(game)
        db.commit()
        db.refresh(game)
        game_id = game.id
    finally:
        db.close()

    response = client.post("/api/v1/games/complete", json=_valid_payload(game_id=f"ai-{game_id}", cognitive_outcomes=[]))
    assert response.status_code == 200


def test_user_cannot_read_another_users_attempt(client):
    complete_response = client.post("/api/v1/games/complete", json=_valid_payload())
    attempt_id = api_data(complete_response)["attempt_id"]

    original_override = app.dependency_overrides[get_current_user]
    app.dependency_overrides[get_current_user] = _override_user("admin@demo.com")
    try:
        response = client.get(f"/api/v1/games/attempts/{attempt_id}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides[get_current_user] = original_override


def test_complete_game_ignores_extra_fields_trying_to_set_profile_directly(client):
    payload = _valid_payload(cognitive_outcomes=[])
    payload["cognitive_issues"] = {"WEAK_THESIS": {"state": "MASTERED"}}
    payload["weak_competencies"] = {"c3": 999}

    response = client.post("/api/v1/games/complete", json=payload)
    assert response.status_code == 200

    profile = client.get("/api/v1/ai/learning-profile").json()["data"]
    assert profile["cognitive_issues"].get("WEAK_THESIS", {}).get("state") != "MASTERED"
    assert profile["weak_competencies"].get("c3") != 999
