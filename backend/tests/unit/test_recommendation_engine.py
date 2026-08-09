"""Testes do RecommendationEngine — deterministico, sem LLM."""

from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import Lesson, Module, StudentLearningProfile, User, UserRole
from src.services.recommendation_service import RecommendationEngine

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db) -> User:
    user = User(name="Aluno", email="rec-test@test.com", hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _make_module(db, *, title: str, target_competencies: list[str]) -> Module:
    module = Module(
        title=title,
        slug=title.lower().replace(" ", "-"),
        description="Modulo de teste.",
        target_competencies=target_competencies,
        order=1,
    )
    db.add(module)
    db.flush()
    return module


def test_no_active_issue_recommends_essay():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(user_id=user.id, cognitive_issues={})
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile)

    assert len(actions) == 1
    assert actions[0].type == "ESSAY"
    assert actions[0].target_issue is None


def test_detected_issue_recommends_game_targeting_its_hub():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "DETECTED", "negative_count": 2, "positive_streak": 0}},
    )
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile)

    game_actions = [a for a in actions if a.type == "GAME"]
    assert len(game_actions) == 1
    assert game_actions[0].target_issue == "WEAK_THESIS"
    assert game_actions[0].target == "introducao-sem-tese"
    assert game_actions[0].reason


def test_recommends_lesson_from_module_matching_competency():
    db = _session()
    user = _make_user(db)
    module = _make_module(db, title="Fundamentos", target_competencies=["c2", "c3"])
    db.add(
        Lesson(
            module_id=module.id,
            title="Tese em 3 movimentos",
            description="Como construir uma tese clara.",
            thumbnail_url="https://example.com/thumb.jpg",
            video_url="https://example.com/video.mp4",
            summary="Resumo.",
            order=1,
        )
    )
    db.flush()
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "DETECTED", "negative_count": 1, "positive_streak": 0}},
    )
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile)

    lesson_actions = [a for a in actions if a.type == "LESSON"]
    assert len(lesson_actions) == 1
    assert lesson_actions[0].target_issue == "WEAK_THESIS"


def test_worst_issue_wins_over_issue_already_training():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={
            "C3_LOW": {"state": "TRAINING", "negative_count": 1, "positive_streak": 0},
            "WEAK_THESIS": {"state": "DETECTED", "negative_count": 5, "positive_streak": 0},
        },
    )
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile)

    game_action = next(a for a in actions if a.type == "GAME")
    assert game_action.target_issue == "WEAK_THESIS"


def test_mastered_issue_is_ignored():
    db = _session()
    user = _make_user(db)
    profile = StudentLearningProfile(
        user_id=user.id,
        cognitive_issues={"WEAK_THESIS": {"state": "MASTERED", "negative_count": 0, "positive_streak": 3}},
    )
    db.add(profile)
    db.flush()

    actions = RecommendationEngine(db).recommend(profile)

    assert all(a.target_issue != "WEAK_THESIS" for a in actions)
