"""Testes unitarios de compute_confidence — P2a Bloco 3 (REQ-8/REQ-10)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.memory.confidence import compute_confidence
from src.models import LearningOutcome, User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db) -> int:
    user = User(name="Aluno Teste", email="aluno-confidence-test@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def _add_outcome(db, *, user_id: int, code: str, source: str, direction: str, weight: int, created_at=None) -> None:
    db.add(
        LearningOutcome(
            user_id=user_id,
            cognitive_issue_code=code,
            source=source,
            essay_id=1 if source == "ESSAY" else None,
            game_attempt_id=1 if source == "GAME" else None,
            exercise_answer_id=1 if source == "EXERCISE" else None,
            direction=direction,
            weight=weight,
            created_at=created_at or datetime.now(UTC),
        )
    )
    db.flush()


def test_no_evidence_is_low_confidence():
    db = _session()
    user_id = _make_user(db)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "low"


def test_single_weak_evidence_is_low_confidence():
    db = _session()
    user_id = _make_user(db)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="GAME", direction="negative", weight=1)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "low"


def test_moderate_single_source_evidence_is_medium_confidence():
    db = _session()
    user_id = _make_user(db)
    for _ in range(4):
        _add_outcome(db, user_id=user_id, code="C3_LOW", source="GAME", direction="negative", weight=1)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "medium"


def test_strong_consistent_multi_source_recent_evidence_is_high_confidence():
    db = _session()
    user_id = _make_user(db)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="ESSAY", direction="negative", weight=2)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="GAME", direction="negative", weight=1)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="negative", weight=1)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="negative", weight=1)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "high"


def test_conflicting_evidence_caps_at_medium_even_with_high_volume():
    db = _session()
    user_id = _make_user(db)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="ESSAY", direction="negative", weight=2)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="GAME", direction="positive", weight=1)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="negative", weight=1)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="positive", weight=1)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "medium"


def test_stale_evidence_caps_at_medium_even_if_otherwise_strong():
    db = _session()
    user_id = _make_user(db)
    old = datetime.now(UTC) - timedelta(days=200)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="ESSAY", direction="negative", weight=2, created_at=old)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="GAME", direction="negative", weight=1, created_at=old)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="negative", weight=1, created_at=old)
    _add_outcome(db, user_id=user_id, code="C3_LOW", source="EXERCISE", direction="negative", weight=1, created_at=old)
    assert compute_confidence(db, user_id=user_id, code="C3_LOW") == "medium"
