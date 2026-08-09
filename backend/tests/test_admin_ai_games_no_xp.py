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


def _seed_game() -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo de teste",
            category="repertorio",
            skill="repertorio-nao-encaixa",
            difficulty="medium",
            questions=[],
            status="pending",
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_ai_games_list_has_no_xp_reward_field(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/ai-games")
        assert response.status_code == 200
        games = api_data(response)
        game = next(g for g in games if g["id"] == game_id)
        assert "xp_reward" not in game
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_ai_games_update_ignores_and_does_not_return_xp_reward(client):
    game_id = _seed_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.patch(
            f"/api/v1/admin/ai-games/{game_id}",
            json={"name": "Jogo renomeado", "xp_reward": 999},
        )
        assert response.status_code == 200
        updated = api_data(response)
        assert updated["name"] == "Jogo renomeado"
        assert "xp_reward" not in updated
    finally:
        app.dependency_overrides.pop(require_admin, None)
