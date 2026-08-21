"""P2a Bloco 5 (REQ-15) — persistencia de RecommendationLog."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import RecommendationLog, User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_recommendation_log_persists_with_expected_fields():
    db = _session()
    user = User(name="Aluno", email="rec-log-test@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()

    log = RecommendationLog(
        user_id=user.id,
        action_type="GAME",
        target_issue="C3_LOW",
        target_hub="perde-na-c3",
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    assert log.id is not None
    assert log.shown_at is not None
    assert log.started_at is None
    assert log.completed_at is None
    assert log.learning_outcome_id is None
