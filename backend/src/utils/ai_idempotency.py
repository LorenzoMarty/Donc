"""Idempotencia de geracao de IA — P2b Bloco 3 (REQ-8).

Requisicao repetida (retry de rede, duplo clique) com a mesma `idempotency_key` nao dispara uma
segunda chamada de IA nem grava um segundo `AIInteractionLog`/conteudo — o caller consulta
`find_cached_generation` antes de gerar e, se achar, reaproveita o resultado ja obtido.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models import AIInteractionLog


def find_cached_generation(db: Session, *, user_id: int, workflow: str, idempotency_key: str | None) -> AIInteractionLog | None:
    if not idempotency_key:
        return None
    return db.scalar(
        select(AIInteractionLog)
        .where(
            AIInteractionLog.user_id == user_id,
            AIInteractionLog.workflow == workflow,
            AIInteractionLog.idempotency_key == idempotency_key,
            AIInteractionLog.content_id.is_not(None),
        )
        .order_by(AIInteractionLog.created_at.desc())
    )
