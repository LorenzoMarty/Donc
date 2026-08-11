"""P2b Bloco 2 (REQ-4) — quota diaria de custo bloqueia geracao nova no nivel HTTP."""

from sqlalchemy import select

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models import User


def _demo_user_id() -> int:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == "aluno@demo.com"))
        assert user is not None
        return user.id
    finally:
        db.close()


def test_daily_quota_blocks_generation_when_reached(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 1)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 0)

    from src.models import AIInteractionLog

    db = SessionLocal()
    try:
        db.add(
            AIInteractionLog(
                user_id=_demo_user_id(), workflow="rewrite_evaluation", agent="X", status="success", cost_micro_usd=100
            )
        )
        db.commit()
    finally:
        db.close()

    response = client.post(
        "/api/v1/ai/evaluate-rewrite",
        json={"original": "Texto original de teste com tamanho suficiente.", "rewritten": "Texto reescrito de teste."},
    )
    assert response.status_code == 429
    assert response.json()["error"] == "ai_daily_quota_exceeded"


def test_daily_quota_does_not_block_when_under_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 999_999_999)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 999_999_999)

    response = client.post(
        "/api/v1/ai/evaluate-rewrite",
        json={"original": "Texto original de teste com tamanho suficiente.", "rewritten": "Texto reescrito de teste."},
    )
    assert response.status_code == 200
