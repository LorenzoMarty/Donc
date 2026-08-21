"""P2a Bloco 8 (REQ-22) — compute_issue_timeline: quando detectado, quantas evidencias, mais recente."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.memory.issue_timeline import compute_issue_timeline
from src.models import LearningOutcome, User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="issue-timeline-test@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def test_no_evidence_returns_empty_timeline():
    db = _session()
    user_id = _make_user(db)
    timeline = compute_issue_timeline(db, user_id=user_id, code="C3_LOW")
    assert timeline["detected_at"] is None
    assert timeline["evidence_count"] == 0
    assert timeline["last_evidence_at"] is None


def test_detected_at_is_first_negative_evidence_and_ignores_earlier_positive():
    db = _session()
    user_id = _make_user(db)
    now = datetime.now(UTC)
    first_positive = now - timedelta(days=10)
    first_negative = now - timedelta(days=8)
    latest = now - timedelta(days=1)

    db.add(
        LearningOutcome(
            user_id=user_id, cognitive_issue_code="C3_LOW", source="GAME", game_attempt_id=1,
            direction="positive", weight=1, created_at=first_positive,
        )
    )
    db.add(
        LearningOutcome(
            user_id=user_id, cognitive_issue_code="C3_LOW", source="GAME", game_attempt_id=1,
            direction="negative", weight=1, created_at=first_negative,
        )
    )
    db.add(
        LearningOutcome(
            user_id=user_id, cognitive_issue_code="C3_LOW", source="GAME", game_attempt_id=1,
            direction="negative", weight=1, created_at=latest,
        )
    )
    db.commit()

    timeline = compute_issue_timeline(db, user_id=user_id, code="C3_LOW")

    # sqlite perde o tzinfo no round-trip (Postgres em producao preserva) — compara so o prefixo naive.
    assert timeline["detected_at"] == first_negative.isoformat().replace("+00:00", "")
    assert timeline["evidence_count"] == 3
    assert timeline["last_evidence_at"] == latest.isoformat().replace("+00:00", "")


def test_no_negative_evidence_yet_has_no_detected_at():
    db = _session()
    user_id = _make_user(db)
    db.add(
        LearningOutcome(
            user_id=user_id, cognitive_issue_code="C3_LOW", source="GAME", game_attempt_id=1,
            direction="positive", weight=1, created_at=datetime.now(UTC),
        )
    )
    db.commit()

    timeline = compute_issue_timeline(db, user_id=user_id, code="C3_LOW")

    assert timeline["detected_at"] is None
    assert timeline["evidence_count"] == 1
