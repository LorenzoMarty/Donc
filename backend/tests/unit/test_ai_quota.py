"""P2b Bloco 2 (REQ-4/REQ-5) — quota diaria de custo de IA por usuario e por workflow."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.middlewares.errors import AppError
from src.models import AIInteractionLog, User, UserRole
from src.utils.ai_quota import check_ai_daily_quota

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="ai-quota-test@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def _add_log(db, *, user_id: int, workflow: str, cost_micro_usd: int, created_at=None) -> None:
    db.add(
        AIInteractionLog(
            user_id=user_id,
            workflow=workflow,
            agent="TestAgent",
            status="success",
            cost_micro_usd=cost_micro_usd,
            created_at=created_at or datetime.now(UTC),
        )
    )
    db.flush()


def test_under_limit_does_not_raise(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 1_000_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 500_000)
    db = _session()
    user_id = _make_user(db)
    _add_log(db, user_id=user_id, workflow="essay_correction", cost_micro_usd=1000)
    db.commit()

    check_ai_daily_quota(db, user_id=user_id, workflow="essay_correction")


def test_per_user_limit_blocks_when_reached(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 1_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 0)
    db = _session()
    user_id = _make_user(db)
    _add_log(db, user_id=user_id, workflow="essay_correction", cost_micro_usd=1000)
    db.commit()

    with pytest.raises(AppError) as exc_info:
        check_ai_daily_quota(db, user_id=user_id, workflow="essay_correction")
    assert exc_info.value.code == "ai_daily_quota_exceeded"


def test_per_workflow_limit_blocks_independently_of_user_total(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 100_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 500)
    db = _session()
    user_id = _make_user(db)
    _add_log(db, user_id=user_id, workflow="admin_game_generation", cost_micro_usd=500)
    db.commit()

    with pytest.raises(AppError) as exc_info:
        check_ai_daily_quota(db, user_id=user_id, workflow="admin_game_generation")
    assert exc_info.value.code == "ai_daily_quota_exceeded"


def test_other_workflow_not_blocked_by_a_different_workflows_usage(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 100_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 500)
    db = _session()
    user_id = _make_user(db)
    _add_log(db, user_id=user_id, workflow="admin_game_generation", cost_micro_usd=500)
    db.commit()

    check_ai_daily_quota(db, user_id=user_id, workflow="rewrite_evaluation")


def test_other_user_not_blocked_by_this_users_usage(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 1_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 0)
    db = _session()
    heavy_user = _make_user(db, email="heavy@test.com")
    other_user = _make_user(db, email="other@test.com")
    _add_log(db, user_id=heavy_user, workflow="essay_correction", cost_micro_usd=5000)
    db.commit()

    check_ai_daily_quota(db, user_id=other_user, workflow="essay_correction")


def test_usage_from_yesterday_does_not_count_toward_todays_quota(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 1_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 0)
    db = _session()
    user_id = _make_user(db)
    _add_log(
        db, user_id=user_id, workflow="essay_correction", cost_micro_usd=5000, created_at=datetime.now(UTC) - timedelta(days=1, hours=1)
    )
    db.commit()

    check_ai_daily_quota(db, user_id=user_id, workflow="essay_correction")


def test_limit_zero_disables_the_check(monkeypatch):
    from src.config.settings import settings

    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 0)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 0)
    db = _session()
    user_id = _make_user(db)
    _add_log(db, user_id=user_id, workflow="essay_correction", cost_micro_usd=999_999_999)
    db.commit()

    check_ai_daily_quota(db, user_id=user_id, workflow="essay_correction")
