"""Escrita de RecommendationLog — P2a Bloco 5 (REQ-15..REQ-18).

Fecha o ciclo `Recommendation -> Started -> Completed -> LearningOutcome -> Profile update`.
Vinculo frouxo (REQ-18): `mark_started`/`mark_completed` retornam `None` silenciosamente quando
o log nao existe ou nao pertence ao usuario — nunca levantam excecao, entao um `recommendation_log_id`
invalido/ausente jamais bloqueia o fluxo normal de jogo/exercicio/aula que o chama.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.models import RecommendationLog


def record_shown(
    db: Session,
    *,
    user_id: int,
    action_type: str,
    target_issue: str | None,
    target: str | None,
) -> RecommendationLog:
    """Grava que uma recomendacao foi exibida ao aluno (REQ-15). Nao commita.

    `target` mantido genérico na assinatura por compat com os call sites existentes
    (dashboard_service.py, routes/ai.py) — internamente vira a coluna tipada certa conforme
    `action_type` (auditoria arquitetural 2026-08-21, `RecommendationLog` não tem mais `target`
    genérico). LESSON/EXERCISE têm FK real; GAME aponta pra um hub (string, sem tabela própria)."""
    log = RecommendationLog(
        user_id=user_id,
        action_type=action_type,
        target_issue=target_issue,
        lesson_id=int(target) if action_type == "LESSON" and target else None,
        exercise_id=int(target) if action_type == "EXERCISE" and target else None,
        target_hub=target if action_type == "GAME" else None,
    )
    db.add(log)
    return log


def mark_started(db: Session, *, log_id: int, user_id: int, now: datetime | None = None) -> RecommendationLog | None:
    """REQ-16: aluno iniciou a atividade recomendada. Nao commita."""
    log = db.get(RecommendationLog, log_id)
    if log is None or log.user_id != user_id:
        return None
    log.started_at = now or datetime.now(UTC)
    return log


def mark_completed(
    db: Session,
    *,
    log_id: int,
    user_id: int,
    learning_outcome_id: int | None = None,
    now: datetime | None = None,
) -> RecommendationLog | None:
    """REQ-17: atividade concluida — fecha o ciclo com referencia ao LearningOutcome gerado
    (quando houver). Nao commita."""
    log = db.get(RecommendationLog, log_id)
    if log is None or log.user_id != user_id:
        return None
    log.completed_at = now or datetime.now(UTC)
    if learning_outcome_id is not None:
        log.learning_outcome_id = learning_outcome_id
    return log
