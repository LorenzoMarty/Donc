"""Spec admin-reorganizacao-ux (3o ajuste pos-review): "gerar com IA" pros engines nao-quiz —
anexa rodada/caso/escada/item novo ao `payload` existente, sem exigir aprovacao do jogo inteiro
(so as perguntas de quiz continuam com revisao granular propria)."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import AIInteractionLog, ContentVersion, User
from src.models.events import AIGeneratedGame


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_game(*, engine: str, payload: dict | None) -> int:
    db = SessionLocal()
    try:
        game = AIGeneratedGame(
            name="Jogo teste payload",
            category="argumentacao",
            skill="coesao textual",
            difficulty="medium",
            engine=engine,
            questions=[],
            payload=payload,
            status="approved",
            targets=["WEAK_THESIS"],
        )
        db.add(game)
        db.commit()
        db.refresh(game)
        return game.id
    finally:
        db.close()


def test_generate_payload_items_appends_round_for_order_engine(client):
    game_id = _seed_game(engine="order", payload={"rounds": [{"id": "r1", "instruction": "ja existe", "items": ["a", "b"], "explanation": "e"}]})
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/payload-items/generate", json={"count": 2})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    rounds = data["payload"]["rounds"]
    assert len(rounds) == 3  # 1 existente + 2 geradas (fallback determinístico sem OPENAI_API_KEY)
    assert rounds[0]["id"] == "r1"
    assert all(r["id"] != "r1" for r in rounds[1:])
    assert data["edited_after_generation"] is True


def test_generate_payload_items_requires_admin(client):
    game_id = _seed_game(engine="order", payload={"rounds": []})
    response = client.post(f"/api/v1/admin/ai-games/{game_id}/payload-items/generate", json={"count": 1})
    assert response.status_code in (401, 403)


def test_generate_payload_items_logs_ai_interaction_and_version(client):
    game_id = _seed_game(engine="duel", payload={"rounds": []})
    app.dependency_overrides[require_admin] = override_admin
    try:
        client.post(f"/api/v1/admin/ai-games/{game_id}/payload-items/generate", json={"count": 1})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    db = SessionLocal()
    try:
        log = db.scalar(
            select(AIInteractionLog).where(AIInteractionLog.workflow == "admin_game_payload_generation").order_by(AIInteractionLog.id.desc())
        )
        versions = db.scalars(
            select(ContentVersion).where(ContentVersion.content_type == "AIGeneratedGame", ContentVersion.content_id == game_id)
        ).all()
    finally:
        db.close()
    assert log is not None
    assert log.content_id == game_id
    assert len(versions) == 1


def test_generate_payload_items_rejects_question_based_engine(client):
    game_id = _seed_game(engine="quiz", payload=None)
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/payload-items/generate", json={"count": 1})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 422
    assert response.json()["error"] == "unsupported_engine_for_ai_generation"


def test_generate_payload_items_rejects_survival_engine():
    """`survival` nao guarda conteudo proprio (so referencia outros jogos) — nao ha o que gerar."""
    game_id = _seed_game(engine="survival", payload={"poolGameIds": []})
    from src.middlewares.errors import AppError
    from src.services.admin_game_review_service import AdminGameReviewService

    db = SessionLocal()
    try:
        try:
            AdminGameReviewService(db).generate_payload_items(game_id, count=1, admin_user_id=1)
            assert False, "esperava AppError"
        except AppError as exc:
            assert exc.status_code == 422
            assert exc.code == "unsupported_engine_for_ai_generation"
    finally:
        db.close()


def test_generate_payload_items_classify_reuses_existing_buckets(client):
    game_id = _seed_game(
        engine="classify",
        payload={"instruction": "x", "buckets": [{"id": "b1", "label": "Categoria A"}], "items": []},
    )
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.post(f"/api/v1/admin/ai-games/{game_id}/payload-items/generate", json={"count": 1})
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    data = api_data(response)
    valid_bucket_ids = {b["id"] for b in data["payload"]["buckets"]}
    assert all(item["bucketId"] in valid_bucket_ids for item in data["payload"]["items"])
