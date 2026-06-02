from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from src.models.user import User


STREAK_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _streak_date(value: datetime) -> date:
    return _as_aware_utc(value).astimezone(STREAK_TIMEZONE).date()


def apply_daily_streak(user: User, *, now: datetime | None = None) -> None:
    now_utc = _as_aware_utc(now or datetime.now(UTC))
    today = _streak_date(now_utc)

    if user.last_seen_at is None:
        user.streak_days = 1
    else:
        last_active_date = _streak_date(user.last_seen_at)
        elapsed_days = (today - last_active_date).days

        if elapsed_days == 0:
            user.streak_days = max(user.streak_days, 1)
        elif elapsed_days == 1:
            user.streak_days = max(user.streak_days, 0) + 1
        else:
            user.streak_days = 1

    user.last_seen_at = now_utc


def touch_daily_streak(db: Session, user: User, *, now: datetime | None = None) -> User:
    apply_daily_streak(user, now=now)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
