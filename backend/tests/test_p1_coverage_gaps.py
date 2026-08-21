"""P1 Bloco 12 — testes obrigatorios que ainda nao tinham arquivo proprio:
- RecommendationEngine e determinístico (mesmo profile -> mesma recomendacao)
- Games: recomendacao muda quando um resultado de jogo move o issue mais prioritario
- Admin/Games: conteudo IA pendente/rejeitado nao aparece em /games/published (so aprovado)
"""

from sqlalchemy import select

from src.database.session import SessionLocal
from src.memory.profile import get_or_create_learning_profile
from src.models import LearningOutcome, StudentLearningProfile, User
from src.models.events import AIGeneratedGame
from src.services.recommendation_service import RecommendationEngine


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_issues(user_id: int) -> None:
    db = SessionLocal()
    try:
        profile = get_or_create_learning_profile(db, user_id)
        profile.cognitive_issues = {}
        # P2a/Bloco 4 (REQ-11): recommend() considera o LearningOutcome mais recente de cada
        # issue pra desempate — precisa ser limpo tambem, senao evidencia de outro teste (usuario
        # demo e compartilhado por toda a suite) vaza pro ranking deste teste.
        db.query(LearningOutcome).filter(LearningOutcome.user_id == user_id).delete()
        db.commit()
    finally:
        db.close()


def _demo_user_id() -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user.id
    finally:
        db.close()


def test_recommendation_engine_is_deterministic_for_same_profile(client):  # noqa: ARG001
    user_id = _demo_user_id()
    _reset_issues(user_id)
    db = SessionLocal()
    try:
        profile = db.scalar(select(StudentLearningProfile).where(StudentLearningProfile.user_id == user_id))
        profile.cognitive_issues = {"WEAK_THESIS": {"state": "DETECTED", "negative_count": 3, "positive_streak": 0}}
        db.commit()

        engine = RecommendationEngine(db)
        first = engine.recommend(profile, user_id=user_id)
        second = engine.recommend(profile, user_id=user_id)

        assert [(a.type, a.target_issue, a.target) for a in first] == [(a.type, a.target_issue, a.target) for a in second]
    finally:
        db.close()
    _reset_issues(user_id)


def test_recommendation_changes_after_game_outcome_moves_top_issue(client):
    user_id = _demo_user_id()
    _reset_issues(user_id)

    # C3_LOW fica DETECTED com prioridade baixa (1 sinal negativo).
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "cultural-bridge",
            "score": 3,
            "total": 10,
            "duration_seconds": 40,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.6}],
        },
    )
    before = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert before[0]["target_issue"] == "C3_LOW"

    # WEAK_THESIS entra com mais sinais negativos -> deveria assumir a prioridade.
    for _ in range(3):
        client.post(
            "/api/v1/games/complete",
            json={
                "game_id": "repertoire-rush",
                "score": 2,
                "total": 10,
                "duration_seconds": 40,
                "cognitive_outcomes": [{"hub": "introducao-sem-tese", "event": "VAGUE_THESIS", "severity": 0.7}],
            },
        )
    after = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert after[0]["target_issue"] == "WEAK_THESIS"

    _reset_issues(user_id)


def test_pending_ai_game_does_not_appear_in_published_list(client):
    from fastapi import Depends
    from sqlalchemy.orm import Session

    from src.database.session import get_db
    from src.dependencies import require_admin
    from src.main import app

    def override_admin(db: Session = Depends(get_db)) -> User:
        user = db.scalar(select(User).where(User.email == "admin@demo.com"))
        assert user is not None
        return user

    db = SessionLocal()
    try:
        pending = AIGeneratedGame(name="Pendente P1", category="c", skill="s", difficulty="medium", questions=[], status="pending", targets=[])
        rejected = AIGeneratedGame(name="Rejeitado P1", category="c", skill="s", difficulty="medium", questions=[], status="rejected", targets=[])
        approved = AIGeneratedGame(name="Aprovado P1", category="c", skill="s", difficulty="medium", questions=[], status="approved", targets=["C3_LOW"])
        db.add_all([pending, rejected, approved])
        db.commit()
        for game in (pending, rejected, approved):
            db.refresh(game)
        pending_id, rejected_id, approved_id = pending.id, rejected.id, approved.id
    finally:
        db.close()

    published = api_data(client.get("/api/v1/games/published"))
    published_ids = {g["id"] for g in published}
    assert pending_id not in published_ids
    assert rejected_id not in published_ids
    assert approved_id in published_ids

    app.dependency_overrides[require_admin] = override_admin
    try:
        pending_list = api_data(client.get("/api/v1/admin/ai-games?status=pending"))
        assert any(g["id"] == pending_id for g in pending_list)
        assert all(g["id"] != approved_id for g in pending_list)
    finally:
        app.dependency_overrides.pop(require_admin, None)
