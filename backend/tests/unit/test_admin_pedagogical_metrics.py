"""P2a Bloco 6 (REQ-19/REQ-20) — AdminPedagogicalMetricsService, derivado de RecommendationLog."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import LearningOutcome, RecommendationLog, User, UserRole
from src.services.admin_pedagogical_metrics_service import AdminPedagogicalMetricsService

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="admin-metrics-test@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def test_empty_state_reports_zero_funnel():
    db = _session()
    report = AdminPedagogicalMetricsService(db).report()
    assert report.shown == 0
    assert report.started == 0
    assert report.completed == 0
    assert report.start_rate is None
    assert report.completion_rate is None
    assert report.before_after_by_issue == []


def test_funnel_counts_shown_started_completed():
    db = _session()
    user_id = _make_user(db)
    db.add(RecommendationLog(user_id=user_id, action_type="GAME", target_issue="C3_LOW", target="hub"))
    db.add(
        RecommendationLog(
            user_id=user_id,
            action_type="GAME",
            target_issue="C3_LOW",
            target="hub",
            started_at=datetime.now(UTC),
        )
    )
    db.add(
        RecommendationLog(
            user_id=user_id,
            action_type="GAME",
            target_issue="C3_LOW",
            target="hub",
            started_at=datetime.now(UTC) - timedelta(minutes=5),
            completed_at=datetime.now(UTC),
        )
    )
    db.commit()

    report = AdminPedagogicalMetricsService(db).report()

    assert report.shown == 3
    assert report.started == 2
    assert report.completed == 1
    assert report.start_rate == pytest.approx(2 / 3)
    assert report.completion_rate == pytest.approx(1 / 2)


def test_avg_completion_seconds_grouped_by_action_type():
    db = _session()
    user_id = _make_user(db)
    now = datetime.now(UTC)
    db.add(
        RecommendationLog(
            user_id=user_id,
            action_type="GAME",
            target_issue="C3_LOW",
            target="hub",
            started_at=now - timedelta(seconds=60),
            completed_at=now,
        )
    )
    db.add(
        RecommendationLog(
            user_id=user_id,
            action_type="GAME",
            target_issue="C3_LOW",
            target="hub",
            started_at=now - timedelta(seconds=120),
            completed_at=now,
        )
    )
    db.commit()

    report = AdminPedagogicalMetricsService(db).report()

    assert report.avg_completion_seconds_by_type["GAME"] == pytest.approx(90.0)


def test_before_after_by_issue_counts_improvement():
    db = _session()
    user_id = _make_user(db)
    now = datetime.now(UTC)

    before = LearningOutcome(
        user_id=user_id,
        cognitive_issue_code="C3_LOW",
        source="ESSAY",
        source_id=1,
        direction="negative",
        weight=2,
        created_at=now - timedelta(days=2),
    )
    db.add(before)
    db.flush()

    log = RecommendationLog(
        user_id=user_id,
        action_type="GAME",
        target_issue="C3_LOW",
        target="hub",
        shown_at=now - timedelta(days=1),
        started_at=now - timedelta(hours=1),
        completed_at=now,
    )
    db.add(log)
    db.flush()

    after = LearningOutcome(
        user_id=user_id,
        cognitive_issue_code="C3_LOW",
        source="GAME",
        source_id=1,
        direction="positive",
        weight=1,
        created_at=now,
    )
    db.add(after)
    db.flush()
    log.learning_outcome_id = after.id
    db.commit()

    report = AdminPedagogicalMetricsService(db).report()

    entry = next(item for item in report.before_after_by_issue if item.issue == "C3_LOW")
    assert entry.cycles == 1
    assert entry.improved == 1
    assert entry.unchanged_or_worse == 0
