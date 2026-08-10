from sqlalchemy import select

from src.database.session import SessionLocal
from src.memory.profile import get_or_create_learning_profile
from src.models import User


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def _reset_all_cognitive_issues() -> None:
    """O usuario demo e compartilhado por toda a suite — outros testes podem ter deixado issues
    em estados que competem em prioridade com o que este teste cria. `recommend()` so retorna
    acoes para o issue mais prioritario, entao um issue orfao de outro teste pode vencer o C3_LOW
    criado aqui. Zera tudo antes de agir."""
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        profile = get_or_create_learning_profile(db, user.id)
        profile.cognitive_issues = {}
        db.commit()
    finally:
        db.close()


def test_recommended_actions_defaults_to_essay_when_no_active_issue(client):
    _reset_all_cognitive_issues()
    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert len(actions) >= 1
    assert all("type" in a and "reason" in a for a in actions)


def test_recommended_actions_targets_detected_issue(client):
    _reset_all_cognitive_issues()
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "rec-endpoint-drill",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert any(a["target_issue"] == "C3_LOW" for a in actions)


def test_recommended_actions_targeting_issue_expose_confidence_level(client):
    _reset_all_cognitive_issues()
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "rec-endpoint-confidence",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    targeted = [a for a in actions if a["target_issue"] == "C3_LOW"]
    assert targeted
    assert all(a["confidence"] in ("low", "medium", "high") for a in targeted)


def test_recommended_actions_expose_recommendation_log_id_and_are_recorded_as_shown(client):
    from src.models import RecommendationLog

    _reset_all_cognitive_issues()
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "rec-endpoint-log",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert all(a["recommendation_log_id"] is not None for a in actions)

    db = SessionLocal()
    try:
        log_ids = [a["recommendation_log_id"] for a in actions]
        rows = db.query(RecommendationLog).filter(RecommendationLog.id.in_(log_ids)).all()
        assert len(rows) == len(log_ids)
        assert all(row.shown_at is not None for row in rows)
        assert all(row.started_at is None for row in rows)
    finally:
        db.close()


def test_start_recommendation_marks_started_at(client):
    from src.models import RecommendationLog

    _reset_all_cognitive_issues()
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "rec-endpoint-start",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )
    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    log_id = actions[0]["recommendation_log_id"]

    started = api_data(client.post(f"/api/v1/ai/recommendations/{log_id}/start"))
    assert started is True

    db = SessionLocal()
    try:
        row = db.get(RecommendationLog, log_id)
        assert row.started_at is not None
    finally:
        db.close()


def test_start_recommendation_with_unknown_id_does_not_fail(client):
    response = client.post("/api/v1/ai/recommendations/999999999/start")
    assert response.status_code == 200
    assert api_data(response) is False
