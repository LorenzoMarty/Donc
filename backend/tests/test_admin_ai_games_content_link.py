"""P2b Bloco 1 (REQ-1) — geracao de conteudo pra AIGeneratedGame linka content_id no
AIInteractionLog. Jogos nao sao mais criados via IA (admin-reorganizacao-ux) — a acao de IA que
restou pra jogo (adicionar pergunta) e testada aqui no lugar da criacao."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIInteractionLog, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_approved_quiz_game() -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste content link",
            category="argumentacao",
            skill="coesao textual",
            difficulty="medium",
            questions=[],
            status="approved",
            targets=["WEAK_THESIS"],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_generate_more_questions_links_content_id_in_interaction_log(client):
    game_id = _seed_approved_quiz_game()
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/questions/generate", json={"count": 2})
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        log = db.scalar(
            select(AIInteractionLog)
            .where(AIInteractionLog.workflow == "admin_game_question_addition")
            .order_by(AIInteractionLog.id.desc())
        )
    finally:
        db.close()
    assert log is not None
    assert log.content_id == game_id
    assert log.content_type == "AIGeneratedGame"
