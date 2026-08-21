"""RecommendationEngine v2 (P1 Bloco 2) — REQ-7..REQ-10: targets, exclusao de conteudo recente,
variedade, EXERCISE como tipo de recomendacao."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import (
    Exercise,
    ExerciseAnswer,
    GameAttempt,
    LearningOutcome,
    Lesson,
    LessonProgress,
    Module,
    StudentLearningProfile,
    User,
    UserRole,
)
from src.services.recommendation_service import RecommendationEngine

pytestmark = pytest.mark.unit


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _make_user(db, email="v2-test@test.com") -> User:
    user = User(name="Aluno", email=email, hashed_password=get_password_hash("12345678"), role=UserRole.STUDENT)
    db.add(user)
    db.flush()
    return user


def _make_module(db, *, target_competencies: list[str] | None = None) -> Module:
    module = Module(title="Mod", slug="mod", description="Modulo de teste.", target_competencies=target_competencies or [], order=1)
    db.add(module)
    db.flush()
    return module


def _make_lesson(db, module, *, targets: list[str] | None = None) -> Lesson:
    lesson = Lesson(
        module_id=module.id,
        title="Aula",
        description="Descricao.",
        thumbnail_url="https://example.com/t.jpg",
        video_url="https://example.com/v.mp4",
        summary="Resumo.",
        duration_minutes=9,
        order=1,
        targets=targets or [],
    )
    db.add(lesson)
    db.flush()
    return lesson


def _make_exercise(db, module, *, targets: list[str] | None = None) -> Exercise:
    exercise = Exercise(
        module_id=module.id,
        statement="Enunciado valido.",
        options=["A", "B", "C", "D", "E"],
        correct_answer="A",
        explanation="Explicacao.",
        skill="tese",
        targets=targets or [],
    )
    db.add(exercise)
    db.flush()
    return exercise


def _profile(db, user, code="WEAK_THESIS", state="DETECTED") -> StudentLearningProfile:
    profile = StudentLearningProfile(user_id=user.id, cognitive_issues={code: {"state": state, "negative_count": 2, "positive_streak": 0}})
    db.add(profile)
    # REQ-12 (P2a/Bloco 4): recommend() so considera issue com >=1 LearningOutcome quando
    # user_id e passado — evidencia minima pra manter os testes v2 (pre-P2a) validos.
    db.add(LearningOutcome(user_id=user.id, cognitive_issue_code=code, source="GAME", game_attempt_id=1, direction="negative", weight=1))
    db.flush()
    return profile


def test_exercise_with_matching_target_is_recommended():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    _make_exercise(db, module, targets=["WEAK_THESIS"])
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    exercise_actions = [a for a in actions if a.type == "EXERCISE"]
    assert len(exercise_actions) == 1
    assert exercise_actions[0].target_issue == "WEAK_THESIS"
    assert exercise_actions[0].reason


def test_exercise_with_incompatible_target_is_not_recommended():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    _make_exercise(db, module, targets=["C3_LOW"])
    profile = _profile(db, user, code="WEAK_THESIS")

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    assert all(a.type != "EXERCISE" for a in actions)


def test_lesson_completed_recently_is_deprioritized_in_favor_of_fresh_one():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    recent_lesson = _make_lesson(db, module, targets=["WEAK_THESIS"])
    fresh_lesson = _make_lesson(db, module, targets=["WEAK_THESIS"])
    db.add(
        LessonProgress(
            user_id=user.id,
            lesson_id=recent_lesson.id,
            completed=True,
            progress_percent=100,
            updated_at=datetime.now(UTC),
        )
    )
    db.flush()
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    lesson_action = next(a for a in actions if a.type == "LESSON")
    assert lesson_action.target == str(fresh_lesson.id)


def test_lesson_only_option_recommended_even_if_completed_recently():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    only_lesson = _make_lesson(db, module, targets=["WEAK_THESIS"])
    db.add(
        LessonProgress(
            user_id=user.id,
            lesson_id=only_lesson.id,
            completed=True,
            progress_percent=100,
            updated_at=datetime.now(UTC),
        )
    )
    db.flush()
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    lesson_action = next(a for a in actions if a.type == "LESSON")
    assert lesson_action.target == str(only_lesson.id)


def test_exercise_answered_long_ago_is_still_eligible():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    exercise = _make_exercise(db, module, targets=["WEAK_THESIS"])
    db.add(
        ExerciseAnswer(
            user_id=user.id,
            exercise_id=exercise.id,
            selected_answer="A",
            is_correct=True,
            answered_at=datetime.now(UTC) - timedelta(days=30),
        )
    )
    db.flush()
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    exercise_action = next(a for a in actions if a.type == "EXERCISE")
    assert exercise_action.target == str(exercise.id)


def test_variety_deprioritizes_type_matching_most_recent_activity():
    db = _session()
    user = _make_user(db)
    module = _make_module(db)
    _make_lesson(db, module, targets=["WEAK_THESIS"])
    _make_exercise(db, module, targets=["WEAK_THESIS"])
    # Atividade mais recente do aluno foi um GAME.
    db.add(
        GameAttempt(
            user_id=user.id,
            game_id="duel-1",
            score=5,
            total=10,
            accuracy=50,
            duration_seconds=60,
            cognitive_outcomes=[],
            started_at=datetime.now(UTC),
            completed_at=datetime.now(UTC),
        )
    )
    db.flush()
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile, user_id=user.id)

    assert actions[0].type != "GAME"


def test_recommendation_still_deterministic_without_user_id_backward_compat():
    db = _session()
    user = _make_user(db)
    module = _make_module(db, target_competencies=["c2"])
    _make_lesson(db, module)
    profile = _profile(db, user)

    actions = RecommendationEngine(db).recommend(profile)

    assert any(a.type == "LESSON" for a in actions)
