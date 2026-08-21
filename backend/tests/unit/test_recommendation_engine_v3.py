"""RecommendationEngine v3 (P2a Bloco 4) — REQ-11/REQ-12/REQ-13/REQ-14."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import LearningOutcome, StudentLearningProfile, User, UserRole
from src.services.recommendation_service import RecommendationEngine

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="rec-v3-test@test.com") -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _add_outcome(db, *, user_id, code, direction, source="GAME", created_at=None) -> None:
    db.add(
        LearningOutcome(
            user_id=user_id,
            cognitive_issue_code=code,
            source=source,
            essay_id=1 if source == "ESSAY" else None,
            game_attempt_id=1 if source == "GAME" else None,
            exercise_answer_id=1 if source == "EXERCISE" else None,
            direction=direction,
            weight=1,
            created_at=created_at or datetime.now(UTC),
        )
    )
    db.flush()


def test_issue_without_evidence_is_never_recommended_when_user_id_present():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "DETECTED", "negative_count": 2, "positive_streak": 0}},
    )
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    assert all(a.target_issue != "WEAK_THESIS" for a in actions)
    assert actions[0].type == "ESSAY"


def test_recent_positive_trend_deprioritizes_recovering_issue():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={
            "C3_LOW": {"state": "TRAINING", "negative_count": 2, "positive_streak": 0},
            "WEAK_THESIS": {"state": "TRAINING", "negative_count": 2, "positive_streak": 0},
        },
    )
    db.add(profile)
    db.flush()

    now = datetime.now(UTC)
    # C3_LOW: as duas evidencias mais recentes ja sao positivas (recuperando).
    _add_outcome(db, user_id=user.id, code="C3_LOW", direction="negative", created_at=now - timedelta(days=5))
    _add_outcome(db, user_id=user.id, code="C3_LOW", direction="positive", created_at=now - timedelta(days=2))
    _add_outcome(db, user_id=user.id, code="C3_LOW", direction="positive", created_at=now - timedelta(days=1))
    # WEAK_THESIS: ainda so evidencia negativa.
    _add_outcome(db, user_id=user.id, code="WEAK_THESIS", direction="negative", created_at=now - timedelta(days=5))
    _add_outcome(db, user_id=user.id, code="WEAK_THESIS", direction="negative", created_at=now - timedelta(days=2))

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    game_action = next(a for a in actions if a.type == "GAME")
    assert game_action.target_issue == "WEAK_THESIS"


def test_reason_mentions_evidence_count_when_there_is_enough_to_matter():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "DETECTED", "negative_count": 2, "positive_streak": 0}},
    )
    db.add(profile)
    db.flush()
    _add_outcome(db, user_id=user.id, code="WEAK_THESIS", direction="negative")
    _add_outcome(db, user_id=user.id, code="WEAK_THESIS", direction="negative")

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    game_action = next(a for a in actions if a.type == "GAME")
    assert "evidênc" in game_action.reason.lower()


def test_single_evidence_reason_stays_generic():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "DETECTED", "negative_count": 1, "positive_streak": 0}},
    )
    db.add(profile)
    db.flush()
    _add_outcome(db, user_id=user.id, code="WEAK_THESIS", direction="negative")

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    game_action = next(a for a in actions if a.type == "GAME")
    assert "evidênc" not in game_action.reason.lower()
