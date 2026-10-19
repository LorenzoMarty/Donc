from datetime import UTC, date, datetime, timedelta
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


def _week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def freeze_available(user: User, *, now: datetime | None = None) -> bool:
    """Congelamento semanal (1 por semana, segunda a domingo em Sao Paulo) ainda nao usado."""
    today = _streak_date(_as_aware_utc(now or datetime.now(UTC)))
    return user.streak_freeze_week != _week_start(today)


def effective_streak(user: User, *, now: datetime | None = None) -> int:
    """Sequência que o aluno deve VER hoje (só leitura; não grava nada).

    `streak_days` só é recalculado quando há atividade, então um aluno que parou de estudar continuaria vendo
    o número antigo. Aqui: até ontem vale o salvo; com 1 dia perdido e o congelamento da semana livre ainda dá
    para salvar hoje; passou disso, a sequência já quebrou (0).
    """
    if user.streak_days <= 0 or user.last_activity_at is None:
        return 0
    now_utc = _as_aware_utc(now or datetime.now(UTC))
    elapsed = (_streak_date(now_utc) - _streak_date(user.last_activity_at)).days
    if elapsed <= 1 or (elapsed == 2 and freeze_available(user, now=now_utc)):
        return user.streak_days
    return 0


def apply_daily_streak(user: User, *, now: datetime | None = None) -> None:
    """Avanca `streak_days` com base em `last_activity_at` — NUNCA chamar em request de leitura
    ou login; so em atividade pedagogica real (ver `touch_daily_streak`)."""
    now_utc = _as_aware_utc(now or datetime.now(UTC))
    today = _streak_date(now_utc)

    if user.last_activity_at is None:
        user.streak_days = 1
    else:
        last_active_date = _streak_date(user.last_activity_at)
        elapsed_days = (today - last_active_date).days

        if elapsed_days == 0:
            user.streak_days = max(user.streak_days, 1)
        elif elapsed_days == 1:
            user.streak_days = max(user.streak_days, 0) + 1
        elif elapsed_days == 2 and user.streak_days > 0 and freeze_available(user, now=now_utc):
            # Um unico dia perdido, com o congelamento da semana livre: o streak segue.
            user.streak_days += 1
            user.streak_freeze_week = _week_start(today)
        else:
            user.streak_days = 1

    user.last_activity_at = now_utc


def touch_daily_streak(db: Session, user: User, *, now: datetime | None = None) -> User:
    """Chamar apenas a partir de uma atividade pedagogica confirmada: conclusao de jogo
    (`GameAttempt`), exercicio respondido, aula concluida, redacao submetida para correcao."""
    apply_daily_streak(user, now=now)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def touch_last_seen(db: Session, user: User, *, now: datetime | None = None) -> User:
    """Presenca — chamado em toda request autenticada (`get_current_user`). Alimenta apenas o
    indicador de "online agora" do admin; nao afeta streak."""
    user.last_seen_at = _as_aware_utc(now or datetime.now(UTC))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
