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
