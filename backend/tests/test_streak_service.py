from datetime import UTC, datetime

from src.models import User
from src.services.streak_service import apply_daily_streak


def make_user(*, streak_days: int = 0, last_seen_at: datetime | None = None) -> User:
    return User(
        name="Aluno",
        email="aluno-streak@test.com",
        hashed_password="hash",
        streak_days=streak_days,
        last_seen_at=last_seen_at,
    )


def test_daily_streak_starts_on_first_activity():
    user = make_user()

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 1
    assert user.last_seen_at == datetime(2026, 6, 2, 12, 0, tzinfo=UTC)


def test_daily_streak_is_not_incremented_twice_on_same_day():
    user = make_user(
        streak_days=4,
        last_seen_at=datetime(2026, 6, 2, 10, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 18, 0, tzinfo=UTC))

    assert user.streak_days == 4
    assert user.last_seen_at == datetime(2026, 6, 2, 18, 0, tzinfo=UTC)


def test_daily_streak_uses_sao_paulo_calendar_day():
    user = make_user(
        streak_days=4,
        last_seen_at=datetime(2026, 6, 1, 23, 30, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 2, 30, tzinfo=UTC))

    assert user.streak_days == 4


def test_daily_streak_increments_on_consecutive_day():
    user = make_user(
        streak_days=4,
        last_seen_at=datetime(2026, 6, 1, 12, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 5


def test_daily_streak_restarts_after_missed_day():
    user = make_user(
        streak_days=4,
        last_seen_at=datetime(2026, 5, 31, 12, 0, tzinfo=UTC),
    )

    apply_daily_streak(user, now=datetime(2026, 6, 2, 12, 0, tzinfo=UTC))

    assert user.streak_days == 1
