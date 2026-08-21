"""P2a Bloco 1 — REQ-1/REQ-4: LearningOutcome existe, e o peso por fonte segue
ESSAY > GAME == EXERCISE (redacao e avaliacao completa, pesa mais que microexercicio isolado)."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.memory.learning_outcomes import SOURCE_WEIGHT
from src.models import LearningOutcome, User, UserRole

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db) -> User:
    user = User(name="Aluno", email="lo-test@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def test_learning_outcome_persists_with_expected_fields():
    db = _session()
    user = _make_user(db)
    outcome = LearningOutcome(
        user_id=user.id,
        cognitive_issue_code="WEAK_THESIS",
        source="GAME",
        game_attempt_id=1,
        direction="negative",
        weight=SOURCE_WEIGHT["GAME"],
    )
    db.add(outcome)
    db.commit()

    row = db.scalar(select(LearningOutcome).where(LearningOutcome.user_id == user.id))
    assert row is not None
    assert row.cognitive_issue_code == "WEAK_THESIS"
    assert row.source == "GAME"
    assert row.direction == "negative"
    assert row.created_at is not None


def test_essay_weight_is_greater_than_game_and_exercise():
    assert SOURCE_WEIGHT["ESSAY"] > SOURCE_WEIGHT["GAME"]
    assert SOURCE_WEIGHT["ESSAY"] > SOURCE_WEIGHT["EXERCISE"]


def test_game_and_exercise_have_equal_baseline_weight():
    assert SOURCE_WEIGHT["GAME"] == SOURCE_WEIGHT["EXERCISE"]
