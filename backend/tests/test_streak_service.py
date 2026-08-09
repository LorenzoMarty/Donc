from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import src.models  # noqa: F401 — registra os modelos no Base.metadata
from src.database.session import Base
from src.models import User
from src.services.streak_service import apply_daily_streak, touch_daily_streak, touch_last_seen


def make_user(*, streak_days: int = 0, last_activity_at: datetime | None = None) -> User:
    return User(
        name="Aluno",
        email="aluno-streak@test.com",
        hashed_password="hash",
        streak_days=streak_days,
        last_activity_at=last_activity_at,
    )


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_daily_streak_starts_on_first_activity():
    user = make_user()

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 1
    assert user.last_activity_at == datetime(2026, 6, 2, 12, 0, tzinfo=UTC)


def test_daily_streak_is_not_incremented_twice_on_same_day():
    user = make_user(
        streak_days=4,
        last_activity_at=datetime(2026, 6, 2, 10, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 18, 0, tzinfo=UTC))

    assert user.streak_days == 4
    assert user.last_activity_at == datetime(2026, 6, 2, 18, 0, tzinfo=UTC)


def test_daily_streak_uses_sao_paulo_calendar_day():
    user = make_user(
        streak_days=4,
        last_activity_at=datetime(2026, 6, 1, 23, 30, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 2, 30, tzinfo=UTC))

    assert user.streak_days == 4


def test_daily_streak_increments_on_consecutive_day():
    user = make_user(
        streak_days=4,
        last_activity_at=datetime(2026, 6, 1, 12, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 5


def test_daily_streak_restarts_after_missed_day():
    user = make_user(
        streak_days=4,
        last_activity_at=datetime(2026, 5, 31, 12, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 1


# ── Separacao presenca (last_seen_at) x atividade pedagogica (last_activity_at / streak_days) ──


def test_touch_last_seen_does_not_change_streak():
    db = _session()
    user = make_user()
    db.add(user)
    db.flush()

    touch_last_seen(db, user)

    assert user.streak_days == 0
    assert user.last_seen_at is not None


def test_touch_daily_streak_first_activity_sets_streak_to_one():
    db = _session()
    user = make_user()
    db.add(user)
    db.flush()

    touch_daily_streak(db, user)

    assert user.streak_days == 1


def test_last_seen_updates_do_not_affect_streak_day_math():
    """Bater last_seen_at (presenca) varias vezes no mesmo dia nao interfere no calculo de
    streak, que usa last_activity_at, um campo separado."""
    db = _session()
    user = make_user()
    db.add(user)
    db.flush()
    day1 = datetime(2026, 1, 10, 9, 0, tzinfo=UTC)
    day2 = datetime(2026, 1, 11, 9, 0, tzinfo=UTC)

    touch_daily_streak(db, user, now=day1)
    touch_last_seen(db, user, now=day1 + timedelta(hours=1))
    touch_last_seen(db, user, now=day1 + timedelta(hours=2))
    touch_daily_streak(db, user, now=day2)

    assert user.streak_days == 2
