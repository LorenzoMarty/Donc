"""Quota diaria de custo de IA — P2b Bloco 2 (REQ-4/REQ-5/REQ-6).

Reaproveita `AIInteractionLog` pra somar o gasto do dia corrente (UTC) — sem tabela de quota
paralela. Dois limites independentes, ambos configuraveis via `Settings`, 0 desliga o
respectivo:
- por usuario (todos os workflows somados) — REQ-4;
- por usuario+workflow (ex.: gerar jogo custa mais que avaliar reescrita, cada um com seu teto)
  — REQ-5.

Igual ao `require_ai_rate_limit` (`utils/rate_limit.py`), pensado pra `dependencies=[...]` no
decorator da rota — nunca chamado manualmente dentro do handler.
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
from src.models import AIInteractionLog, User


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _daily_cost_micro_usd(db: Session, *, user_id: int, workflow: str | None = None) -> int:
    query = select(func.coalesce(func.sum(AIInteractionLog.cost_micro_usd), 0)).where(
        AIInteractionLog.user_id == user_id, AIInteractionLog.created_at >= _start_of_today_utc()
    )
    if workflow is not None:
        query = query.where(AIInteractionLog.workflow == workflow)
    return int(db.scalar(query) or 0)


def check_ai_daily_quota(db: Session, *, user_id: int, workflow: str) -> None:
    per_user_limit = settings.ai_daily_cost_limit_micro_usd_per_user
    if 0 < per_user_limit <= _daily_cost_micro_usd(db, user_id=user_id):
        raise AppError(
            "Limite diário de uso de IA atingido. Tente novamente amanhã.",
            status_code=429,
            code="ai_daily_quota_exceeded",
        )

    per_workflow_limit = settings.ai_daily_cost_limit_micro_usd_per_workflow
    if 0 < per_workflow_limit <= _daily_cost_micro_usd(db, user_id=user_id, workflow=workflow):
        raise AppError(
            "Limite diário de uso de IA para essa função foi atingido. Tente novamente amanhã.",
            status_code=429,
            code="ai_daily_quota_exceeded",
        )


def require_ai_daily_quota(workflow: str):
    def _dependency(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
        check_ai_daily_quota(db, user_id=current_user.id, workflow=workflow)

    return _dependency
