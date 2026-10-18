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


def test_daily_streak_restarts_after_missed_day_when_weekly_freeze_already_used():
    from datetime import date

    user = make_user(
        streak_days=4,
        last_activity_at=datetime(2026, 5, 31, 12, 0, tzinfo=UTC),
    )
    user.streak_freeze_week = date(2026, 6, 1)  # segunda da semana de 2026-06-02: congelamento ja gasto

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


def test_weekly_freeze_saves_one_missed_day_then_resets_on_second_miss_same_week():
    # 2026-06-01 e segunda-feira. Atividade na segunda, perde a terca, volta na quarta.
    user = make_user(streak_days=5, last_activity_at=datetime(2026, 6, 1, 15, 0, tzinfo=UTC))

    apply_daily_streak(user, now=datetime(2026, 6, 3, 15, 0, tzinfo=UTC))

    assert user.streak_days == 6
    assert user.streak_freeze_week is not None

    # Perde a quinta e volta na sexta: congelamento da semana ja foi usado, streak recomeca.
    apply_daily_streak(user, now=datetime(2026, 6, 5, 15, 0, tzinfo=UTC))

    assert user.streak_days == 1


def test_freeze_renews_next_week_and_two_missed_days_always_break():
    from src.services.streak_service import freeze_available

    user = make_user(streak_days=5, last_activity_at=datetime(2026, 6, 1, 15, 0, tzinfo=UTC))
    apply_daily_streak(user, now=datetime(2026, 6, 3, 15, 0, tzinfo=UTC))
    assert freeze_available(user, now=datetime(2026, 6, 4, 15, 0, tzinfo=UTC)) is False
    assert freeze_available(user, now=datetime(2026, 6, 8, 15, 0, tzinfo=UTC)) is True  # segunda seguinte

    # Dois dias perdidos nunca sao salvos, mesmo com o congelamento livre.
    other = make_user(streak_days=5, last_activity_at=datetime(2026, 6, 8, 15, 0, tzinfo=UTC))
    apply_daily_streak(other, now=datetime(2026, 6, 11, 15, 0, tzinfo=UTC))
    assert other.streak_days == 1
