"""P2b Bloco 2 (REQ-6) — AdminTelemetryService.ai_quota_status expoe limites + consumo do dia."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.config.settings import settings
from src.database.session import Base
from src.models import AIInteractionLog, User, UserRole
from src.services.admin_telemetry_service import AdminTelemetryService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="quota-status-test@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def test_quota_status_exposes_configured_limits(monkeypatch):
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_user", 2_000_000)
    monkeypatch.setattr(settings, "ai_daily_cost_limit_micro_usd_per_workflow", 1_000_000)
    db = _session()
    status = AdminTelemetryService(db).ai_quota_status()
    assert status.daily_limit_micro_usd_per_user == 2_000_000
    assert status.daily_limit_micro_usd_per_workflow == 1_000_000


def test_quota_status_aggregates_todays_consumption_per_user_and_workflow():
    db = _session()
    user_id = _make_user(db)
    now = datetime.now(UTC)
    db.add(AIInteractionLog(user_id=user_id, workflow="essay_correction", agent="A", status="success", cost_micro_usd=100, created_at=now))
    db.add(AIInteractionLog(user_id=user_id, workflow="essay_correction", agent="A", status="success", cost_micro_usd=50, created_at=now))
    db.add(AIInteractionLog(user_id=user_id, workflow="rewrite_evaluation", agent="B", status="success", cost_micro_usd=20, created_at=now))
    # De ontem — nao deve contar no consumo "do dia corrente".
    db.add(
        AIInteractionLog(
            user_id=user_id, workflow="essay_correction", agent="A", status="success", cost_micro_usd=9999,
            created_at=now - timedelta(days=1, hours=1),
        )
    )
    db.commit()

    status = AdminTelemetryService(db).ai_quota_status()

    user_row = next(row for row in status.per_user_today if row.user_id == user_id)
    assert user_row.consumed_micro_usd == 170

    workflow_row = next(row for row in status.per_workflow_today if row.workflow == "essay_correction")
    assert workflow_row.consumed_micro_usd == 150
