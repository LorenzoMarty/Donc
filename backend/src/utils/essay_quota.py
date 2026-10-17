"""Cota mensal de correcoes de redacao por usuario (mes UTC).

Conta `AIJob` de correcao nao falhos — correcao que falhou nao consome cota. Valor em
`settings.essay_monthly_quota`; 0 desliga. Admin nao e limitado.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.database.session import get_db
from src.dependencies import get_current_user
from src.middlewares.errors import AppError
from src.models import AIJob, User, UserRole


def month_bounds_utc(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(UTC)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    return start, end


def essay_corrections_this_month(db: Session, user_id: int, now: datetime | None = None) -> int:
    start, end = month_bounds_utc(now)
    return int(
        db.scalar(
            select(func.count(AIJob.id)).where(
                AIJob.user_id == user_id,
                AIJob.kind == "essay_correction",
                AIJob.status != "failed",
                AIJob.created_at >= start,
                AIJob.created_at < end,
            )
        )
        or 0
    )


def check_essay_monthly_quota(db: Session, user: User, now: datetime | None = None) -> None:
    limit = settings.essay_monthly_quota
    if limit <= 0 or user.role == UserRole.ADMIN:
        return
    if essay_corrections_this_month(db, user.id, now) >= limit:
        raise AppError(
            f"Você usou as {limit} correções do mês. A cota renova no dia 1º.",
            status_code=429,
            code="quota_exceeded",
        )


def require_essay_monthly_quota(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    check_essay_monthly_quota(db, current_user)
