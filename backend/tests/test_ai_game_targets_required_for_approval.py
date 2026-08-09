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
