"""LGPD: exportação dos dados do titular e exclusão/anonimização da conta.

Exclusão = apagar o conteúdo pessoal (redações, progresso, chamados, jobs de IA) e anonimizar a
linha de `users`, sem migration. O que fica, e por quê:
- `subscriptions`: registro de cobrança (obrigação fiscal/contábil, 5 anos) — sem dado pessoal além
  do vínculo com a conta, que já está anonimizada;
- `ai_interaction_logs`: só custo/tokens/latência, desvinculados do usuário (`user_id` nulo).
"""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from sqlalchemy import delete, inspect, select, update
from sqlalchemy.orm import Session

from src.config.security import get_password_hash, verify_password
from src.middlewares.errors import AppError
from src.models import (
    AIInteractionLog,
    AIJob,
    Essay,
    EssayCorrection,
    EssayVersion,
    EssayVersionCorrection,
    ExerciseAnswer,
    GameAttempt,
    Goal,
    LearningOutcome,
    LessonProgress,
    PasswordResetToken,
    RecommendationLog,
    RefreshToken,
    StudentLearningProfile,
    StudentProfile,
    Subscription,
    SubscriptionStatus,
    SupportTicket,
    User,
    UserEvent,
    UserGameProgress,
)
from src.services.subscription_service import SubscriptionService

logger = logging.getLogger("src.services.account_data_service")

# Colunas que nunca saem na exportação (segredos/identificadores internos de terceiros).
_EXCLUDED_COLUMNS = {"hashed_password", "token_hash", "mp_preapproval_id", "idempotency_key"}

# Tabelas com `user_id` apagadas na exclusão (Essay vai à parte, via ORM, para levar versões/correções).
_USER_OWNED = (
    LessonProgress,
    ExerciseAnswer,
    Goal,
    GameAttempt,
    UserGameProgress,
    StudentProfile,
    StudentLearningProfile,
    SupportTicket,
    LearningOutcome,
    RecommendationLog,
    UserEvent,
    AIJob,
    RefreshToken,
    PasswordResetToken,
)


def _plain(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return value


def _row(obj: Any) -> dict[str, Any]:
    return {
        column.key: _plain(getattr(obj, column.key))
        for column in inspect(obj).mapper.column_attrs
        if column.key not in _EXCLUDED_COLUMNS
    }


class AccountDataService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def export(self, user: User) -> dict[str, Any]:
        def rows(model: type) -> list[dict[str, Any]]:
            return [_row(item) for item in self.db.scalars(select(model).where(model.user_id == user.id))]

        essays = []
        for essay in self.db.scalars(select(Essay).where(Essay.user_id == user.id).order_by(Essay.id)):
            versions = []
            for version in self.db.scalars(select(EssayVersion).where(EssayVersion.essay_id == essay.id)):
                item = _row(version)
                version_correction = self.db.scalar(
                    select(EssayVersionCorrection).where(EssayVersionCorrection.version_id == version.id)
                )
                item["correction"] = _row(version_correction) if version_correction else None
                versions.append(item)
            correction = self.db.scalar(select(EssayCorrection).where(EssayCorrection.essay_id == essay.id))
            essays.append(
                {
                    **_row(essay),
                    "theme": essay.theme.title if essay.theme else None,
                    "correction": _row(correction) if correction else None,
                    "versions": versions,
                }
            )

        return {
            "exported_at": datetime.now(UTC).isoformat(),
            "account": _row(user),
            "onboarding": rows(StudentProfile),
            "essays": essays,
            "lesson_progress": rows(LessonProgress),
            "exercise_answers": rows(ExerciseAnswer),
            "goals": rows(Goal),
            "game_attempts": rows(GameAttempt),
            "game_progress": rows(UserGameProgress),
            "learning_profile": rows(StudentLearningProfile),
            "learning_outcomes": rows(LearningOutcome),
            "support_tickets": rows(SupportTicket),
            "subscription": rows(Subscription),
        }

    def delete_account(self, user: User, *, password: str) -> None:
        if not verify_password(password, user.hashed_password):
            raise AppError("Senha incorreta.", status_code=400, code="invalid_current_password")

        self._cancel_subscription(user)

        for essay in self.db.scalars(select(Essay).where(Essay.user_id == user.id)).all():
            self.db.delete(essay)  # cascade ORM: versões e correções
        for model in _USER_OWNED:
            self.db.execute(delete(model).where(model.user_id == user.id))
        self.db.execute(update(AIInteractionLog).where(AIInteractionLog.user_id == user.id).values(user_id=None))

        user.name = "Conta excluída"
        user.email = f"deleted-{user.id}@deleted.invalid"
        user.hashed_password = get_password_hash(secrets.token_urlsafe(32))
        user.session_version += 1
        user.terms_accepted_at = None
        user.terms_version = None
        user.deleted_at = datetime.now(UTC)
        self.db.commit()

    def _cancel_subscription(self, user: User) -> None:
        subscription = self.db.scalar(select(Subscription).where(Subscription.user_id == user.id))
        if not subscription or subscription.status in (SubscriptionStatus.CANCELED, SubscriptionStatus.SUSPENDED):
            return
        try:
            SubscriptionService(self.db).cancel(user)
        except AppError:
            logger.warning("Cancelamento no Mercado Pago falhou na exclusão da conta %s", user.id)
        # Conta excluída não mantém acesso até o fim do período: encerra agora.
        subscription = self.db.scalar(select(Subscription).where(Subscription.user_id == user.id))
        if subscription:
            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = subscription.canceled_at or datetime.now(UTC)
