"""FunnelService: funil de aquisicao e retencao D1/D7 derivados das tabelas existentes."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.config.security import get_password_hash
from src.database.session import Base
from src.models import Essay, EssayTheme, ExerciseAnswer, LessonProgress, PlanCycle, StudentProfile, Subscription, SubscriptionStatus, User, UserRole
from src.models import Exercise, Lesson
from src.services.funnel_service import FunnelService

pytestmark = pytest.mark.unit

NOW = datetime(2026, 10, 20, 15, 0, tzinfo=UTC)


def _db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def _user(db, email, *, created_at, role=UserRole.STUDENT):
    user = User(name=email, email=email, hashed_password=get_password_hash("12345678"), role=role, created_at=created_at)
    db.add(user)
    db.flush()
    return user


def _lesson_and_exercise(db):
    from src.models import Difficulty, Module

    module = Module(title="M", slug="m", description="d", order=1)
    db.add(module)
    db.flush()
    lesson = Lesson(module_id=module.id, title="A", description="d", thumbnail_url="", video_url="", summary="", duration_minutes=5, order=1)
    exercise = Exercise(
        module_id=module.id, statement="Enunciado", options=["A", "B"], correct_answer="A", explanation="Explicacao", skill="s", difficulty=Difficulty.MEDIUM
    )
    db.add_all([lesson, exercise])
    db.flush()
    return lesson, exercise


def test_empty_cohort():
    result = FunnelService(_db()).metrics(days=30, now=NOW)
    assert result.signups == 0 and result.steps == [] and result.first_action_median_minutes is None


def test_funnel_steps_time_to_first_action_and_retention():
    db = _db()
    lesson, exercise = _lesson_and_exercise(db)
    theme = EssayTheme(title="T", context="c", source="s", is_active=True)
    db.add(theme)
    db.flush()

    # A: cadastrou ha 9 dias, agiu em 2 min, voltou em D1 e D7, pagou e mandou redacao
    t0 = NOW - timedelta(days=9)
    a = _user(db, "a@t.com", created_at=t0)
    db.add_all(
        [
            StudentProfile(user_id=a.id, completed=True),
            Subscription(user_id=a.id, cycle=PlanCycle.MONTHLY, status=SubscriptionStatus.ACTIVE, price_charged_cents=5900, current_period_end=NOW + timedelta(days=20)),
            ExerciseAnswer(user_id=a.id, exercise_id=exercise.id, selected_answer="A", is_correct=True, answered_at=t0 + timedelta(minutes=2)),
            LessonProgress(user_id=a.id, lesson_id=lesson.id, progress_percent=100, completed=True, updated_at=t0 + timedelta(days=1)),
            Essay(user_id=a.id, theme_id=theme.id, title="x", content="c", created_at=t0 + timedelta(days=7), submitted_at=t0 + timedelta(days=7)),
        ]
    )
    # B: cadastrou ha 9 dias, so agiu depois de 30 min, nao voltou
    b = _user(db, "b@t.com", created_at=t0)
    db.add(ExerciseAnswer(user_id=b.id, exercise_id=exercise.id, selected_answer="A", is_correct=True, answered_at=t0 + timedelta(minutes=30)))
    # C: cadastrou ontem e nunca agiu (D1 ainda nao venceu para o D7; D1 venceu)
    _user(db, "c@t.com", created_at=NOW - timedelta(days=1))
    # admin e usuario fora da janela nao entram
    _user(db, "admin@t.com", created_at=t0, role=UserRole.ADMIN)
    _user(db, "old@t.com", created_at=NOW - timedelta(days=90))
    db.commit()

    result = FunnelService(db).metrics(days=30, now=NOW)

    counts = {step.key: step.count for step in result.steps}
    assert result.signups == 3
    assert counts == {"signup": 3, "onboarding": 1, "checkout_start": 1, "paid": 1, "first_action": 2, "first_lesson": 1, "first_essay": 1}
    assert result.first_action_median_minutes == 16.0  # mediana de 2 e 30 minutos
    assert result.first_action_within_target_pct == 50.0
    assert (result.retention_d1.eligible, result.retention_d1.retained) == (3, 1)
    assert (result.retention_d7.eligible, result.retention_d7.retained) == (2, 1)  # C ainda nao completou 7 dias
