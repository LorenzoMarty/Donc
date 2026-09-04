"""REQ-3: aprovacao de jogo IA sem target e rejeitada; admin pode definir target no mesmo passo
da revisao e aprovar."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
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


def _seed_pending_game(*, targets=None) -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo pendente",
            category="argumentacao",
            skill="nao-aprofunda",
            difficulty="medium",
            questions=[],
            status="pending",
            targets=targets or [],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_approve_without_target_is_rejected(client):
    game_id = _seed_pending_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "approve"})
        assert response.status_code == 422
        assert response.json()["error"] == "game_target_required"
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_approve_with_target_in_same_request_succeeds(client):
    game_id = _seed_pending_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(
            f"/api/v1/admin/ai-games/{game_id}/review",
            json={"action": "approve", "targets": ["SHALLOW_ARGUMENTATION"]},
        )
        assert response.status_code == 200
        data = api_data(response)
        assert data["status"] == "approved"
        assert data["targets"] == ["SHALLOW_ARGUMENTATION"]
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_approve_with_preexisting_target_succeeds(client):
    game_id = _seed_pending_game(targets=["WEAK_REPERTOIRE"])
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "approve"})
        assert response.status_code == 200
        assert api_data(response)["status"] == "approved"
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_reject_does_not_require_target(client):
    game_id = _seed_pending_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "reject"})
        assert response.status_code == 200
        assert api_data(response)["status"] == "rejected"
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_reviewing_twice_returns_conflict(client):
    """Dois admins revisando o mesmo jogo pendente ao mesmo tempo — o segundo review nao pode
    sobrescrever silenciosamente o resultado do primeiro."""
    game_id = _seed_pending_game(targets=["WEAK_REPERTOIRE"])
    app.dependency_overrides[require_admin] = override_admin
    try:
        first = client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "approve"})
        assert first.status_code == 200

        second = client.post(f"/api/v1/admin/ai-games/{game_id}/review", json={"action": "reject"})
        assert second.status_code == 409
        assert second.json()["error"] == "already_reviewed"
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        game = db.get(AIGeneratedGame, game_id)
        assert game.status == "approved"
    finally:
        db.close()


def test_list_ai_games_reports_attempts_count(client):
    """AdminGameReviewService.list_ai_games anexa attempts_count — usado pra avisar o admin
    quantas tentativas de aluno dependem de um jogo antes de excluir (achado #9.2 da auditoria)."""
    from datetime import UTC, datetime

    from src.models import User
    from src.models.gamification import GameAttempt

    game_id = _seed_pending_game(targets=["WEAK_REPERTOIRE"])
    db = SessionLocal()
    try:
        student = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert student is not None
        now = datetime.now(UTC)
        db.add_all(
            [
                GameAttempt(user_id=student.id, game_id=f"ai-{game_id}", score=8, total=10, accuracy=80, duration_seconds=60, started_at=now, completed_at=now),
                GameAttempt(user_id=student.id, game_id=f"ai-{game_id}", score=9, total=10, accuracy=90, duration_seconds=55, started_at=now, completed_at=now),
            ]
        )
        db.commit()
    finally:
        db.close()

    app.dependency_overrides[require_admin] = override_admin
    try:
        listed = api_data(client.get("/api/v1/admin/ai-games"))
        row = next(g for g in listed if g["id"] == game_id)
        assert row["attempts_count"] == 2
    finally:
        app.dependency_overrides.pop(require_admin, None)
