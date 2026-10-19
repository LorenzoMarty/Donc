"""Lembrete diário de streak em risco, por e-mail.

Elegível = tem sequência de 2+ dias, a última atividade foi **ontem** (hoje ainda não estudou, então
a sequência morre se nada acontecer), tem acesso ativo, não saiu da lista e ainda não recebeu
lembrete hoje. Roda 1x por dia (Celery beat, ver `queues/celery_app.py`).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.settings import settings
from src.models import User, UserRole
from src.repositories.subscriptions import SubscriptionRepository
from src.services import email_service
from src.services.streak_service import STREAK_TIMEZONE, _as_aware_utc
from src.services.subscription_status import has_access

logger = logging.getLogger("src.services.reminder_service")

MIN_STREAK_TO_REMIND = 2


def unsubscribe_token(user_id: int) -> str:
    """Token assinado (HMAC) do link de opt-out: dispensa login e não é adivinhável."""
    signature = hmac.new(settings.jwt_secret_key.encode(), f"reminders:{user_id}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{user_id}.{signature}"


def user_id_from_unsubscribe_token(token: str) -> int | None:
    user_part, _, signature = token.partition(".")
    if not user_part.isdigit():
        return None
    expected = unsubscribe_token(int(user_part)).partition(".")[2]
    return int(user_part) if hmac.compare_digest(signature, expected) else None


class ReminderService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def due_users(self, now: datetime | None = None) -> list[User]:
        now = _as_aware_utc(now or datetime.now(UTC))
        today = now.astimezone(STREAK_TIMEZONE).date()
        yesterday = today - timedelta(days=1)
        candidates = self.db.scalars(
            select(User).where(
                User.role == UserRole.STUDENT,
                User.deleted_at.is_(None),
                User.reminders_opt_out.is_(False),
                User.streak_days >= MIN_STREAK_TO_REMIND,
                User.last_activity_at.is_not(None),
            )
        )
        subscriptions = SubscriptionRepository(self.db)
        due = []
        for user in candidates:
            if _as_aware_utc(user.last_activity_at).astimezone(STREAK_TIMEZONE).date() != yesterday:
                continue
            if user.last_reminder_at is not None and _as_aware_utc(user.last_reminder_at).astimezone(STREAK_TIMEZONE).date() == today:
                continue
            if not has_access(role=user.role, subscription=subscriptions.get_by_user_id(user.id), now=now):
                continue
            due.append(user)
        return due

    def send_due(self, now: datetime | None = None) -> int:
        now = _as_aware_utc(now or datetime.now(UTC))
        sent = 0
        for user in self.due_users(now):
            try:
                delivered = email_service.send_streak_reminder(
                    to=user.email, name=user.name, streak_days=user.streak_days, unsubscribe_token=unsubscribe_token(user.id)
                )
            except Exception:  # um e-mail com problema não pode travar a fila dos demais
                logger.exception("Falha ao enviar lembrete para o usuário %s", user.id)
                continue
            if not delivered:
                # `send_email` não levanta: devolve False (Resend fora, sem chave). Não marca como lembrado,
                # para a próxima execução do dia tentar de novo.
                logger.warning("Lembrete não entregue ao usuário %s", user.id)
                continue
            user.last_reminder_at = now
            sent += 1
            self.db.commit()  # por usuário: se o worker morrer no meio, quem já recebeu não recebe de novo
        return sent

    def opt_out(self, user_id: int) -> bool:
        user = self.db.get(User, user_id)
        if user is None or user.deleted_at is not None:
            return False
        user.reminders_opt_out = True
        self.db.commit()
        return True
