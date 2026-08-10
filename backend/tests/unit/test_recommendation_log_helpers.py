"""P2a Bloco 5 (REQ-15..REQ-18) — helpers de escrita de RecommendationLog."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.memory.recommendation_log import mark_completed, mark_started, record_shown
from src.models import User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="rec-log-helper@test.com") -> int:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user.id


def test_record_shown_creates_log_with_shown_only():
    db = _session()
    user_id = _make_user(db)
    log = record_shown(db, user_id=user_id, action_type="GAME", target_issue="C3_LOW", target="perde-na-c3")
    db.commit()
    assert log.id is not None
    assert log.started_at is None
    assert log.completed_at is None


def test_mark_started_sets_started_at_for_owner():
    db = _session()
    user_id = _make_user(db)
    log = record_shown(db, user_id=user_id, action_type="GAME", target_issue="C3_LOW", target="perde-na-c3")
    db.commit()

    result = mark_started(db, log_id=log.id, user_id=user_id)
    db.commit()

    assert result is not None
    assert result.started_at is not None


def test_mark_started_ignores_log_owned_by_another_user():
    db = _session()
    owner_id = _make_user(db, email="owner@test.com")
    other_id = _make_user(db, email="other@test.com")
    log = record_shown(db, user_id=owner_id, action_type="GAME", target_issue="C3_LOW", target="perde-na-c3")
    db.commit()

    result = mark_started(db, log_id=log.id, user_id=other_id)

    assert result is None


def test_mark_started_ignores_nonexistent_log():
    db = _session()
    user_id = _make_user(db)
    result = mark_started(db, log_id=999999, user_id=user_id)
    assert result is None


def test_mark_completed_sets_completed_at_and_learning_outcome_id():
    db = _session()
    user_id = _make_user(db)
    log = record_shown(db, user_id=user_id, action_type="GAME", target_issue="C3_LOW", target="perde-na-c3")
    db.commit()

    result = mark_completed(db, log_id=log.id, user_id=user_id, learning_outcome_id=42)
    db.commit()

    assert result is not None
    assert result.completed_at is not None
    assert result.learning_outcome_id == 42


def test_mark_completed_ignores_log_owned_by_another_user():
    db = _session()
    owner_id = _make_user(db, email="owner2@test.com")
    other_id = _make_user(db, email="other2@test.com")
    log = record_shown(db, user_id=owner_id, action_type="GAME", target_issue="C3_LOW", target="perde-na-c3")
    db.commit()

    result = mark_completed(db, log_id=log.id, user_id=other_id, learning_outcome_id=42)

    assert result is None
