from __future__ import annotations

import hashlib
import logging
from typing import Any

from sqlalchemy.orm import Session

from src.agents.base import AgnoAgentRunner
from src.config.ai_pricing import cost_micro_usd
from src.models import AIInteractionLog

logger = logging.getLogger("src.ai.telemetry")


def safe_persist_interaction(db: Session, log: AIInteractionLog, *, commit: bool = False) -> None:
    """Persiste um log de telemetria de forma NÃO-crítica.

    A telemetria nunca pode quebrar nem dar rollback na operação do usuário (tema/correção).
    O INSERT roda dentro de um SAVEPOINT (`begin_nested`): se falhar (ex.: coluna ausente),
    desfaz só o savepoint, loga e segue — a transação do caller permanece íntegra."""

    try:
        with db.begin_nested():
            db.add(log)
            db.flush()
        if commit:
            db.commit()
    except Exception:
        logger.warning("Falha ao registrar telemetria de IA (ignorada).", exc_info=True)
        try:
            db.expunge(log)
        except Exception:
            pass


def _split_tokens(input_tokens: int, output_tokens: int, total: int) -> tuple[int, int]:
    """Garante split input/output. Quando só há total, aproxima ~1/3 input, ~2/3 output
    (proporção típica de chamada estruturada — input curto, saída JSON mais longa)."""

    if input_tokens or output_tokens:
        return max(0, input_tokens), max(0, output_tokens)
    if total > 0:
        approx_input = int(total * 0.34)
        return approx_input, total - approx_input
    return 0, 0


def build_interaction_log(
    *,
    workflow: str,
    agent: str,
    user_id: int | None,
    job_id: str | None = None,
    runner: AgnoAgentRunner | None = None,
    prompt: str | None = None,
    status: str | None = None,
    latency_ms: int | None = None,
    token_count: int | None = None,
    input_tokens: int | None = None,
    output_tokens: int | None = None,
    model: str | None = None,
    error: str | None = None,
    meta: dict[str, Any] | None = None,
    content_id: int | None = None,
    content_type: str | None = None,
    template_version: str | None = None,
    attempt: int = 1,
    idempotency_key: str | None = None,
) -> AIInteractionLog:
    """Monta um AIInteractionLog com custo calculado pela tabela oficial por modelo.

    Fonte única do cálculo de custo — usada por record_ai_interaction e pelo workflow
    de correção (evita duplicar a regra de custo)."""

    prompt_hash = runner.last_prompt_hash if runner is not None else None
    if prompt_hash is None and prompt is not None:
        prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    resolved_total = token_count if token_count is not None else (runner.last_token_count if runner is not None else 0)
    resolved_in = input_tokens if input_tokens is not None else (runner.last_input_tokens if runner is not None else 0)
    resolved_out = output_tokens if output_tokens is not None else (runner.last_output_tokens if runner is not None else 0)
    resolved_in, resolved_out = _split_tokens(resolved_in, resolved_out, resolved_total)
    if resolved_total <= 0:
        resolved_total = resolved_in + resolved_out
    resolved_model = model if model is not None else (runner.last_model if runner is not None else None)

    return AIInteractionLog(
        user_id=user_id,
        job_id=job_id,
        workflow=workflow,
        agent=agent,
        status=status or (runner.last_status if runner is not None else "success"),
        latency_ms=latency_ms if latency_ms is not None else (runner.last_latency_ms if runner is not None else 0),
        token_count=resolved_total,
        input_tokens=resolved_in,
        output_tokens=resolved_out,
        cost_micro_usd=cost_micro_usd(resolved_model, resolved_in, resolved_out),
        model=resolved_model,
        prompt_hash=prompt_hash,
        error=error if error is not None else (runner.last_error if runner is not None else None),
        content_id=content_id,
        content_type=content_type,
        template_version=template_version,
        attempt=attempt,
        idempotency_key=idempotency_key,
        meta={
            **(meta or {}),
            **(
                {
                    "model": runner.last_model,
                    "used_fallback": runner.last_used_fallback,
                    "retry_count": runner.last_retry_count,
                    "model_switched": runner.last_model_switched,
                }
                if runner is not None
                else {}
            ),
        },
    )


def record_ai_interaction(
    db: Session,
    *,
    workflow: str,
    agent: str,
    user_id: int | None,
    runner: AgnoAgentRunner | None = None,
    job_id: str | None = None,
    prompt: str | None = None,
    status: str | None = None,
    latency_ms: int | None = None,
    token_count: int | None = None,
    error: str | None = None,
    meta: dict[str, Any] | None = None,
    commit: bool = False,
    content_id: int | None = None,
    content_type: str | None = None,
    template_version: str | None = None,
    attempt: int = 1,
    idempotency_key: str | None = None,
) -> None:
    try:
        log = build_interaction_log(
            workflow=workflow,
            agent=agent,
            user_id=user_id,
            job_id=job_id,
            runner=runner,
            prompt=prompt,
            status=status,
            latency_ms=latency_ms,
            token_count=token_count,
            error=error,
            meta=meta,
            content_id=content_id,
            content_type=content_type,
            template_version=template_version,
            attempt=attempt,
            idempotency_key=idempotency_key,
        )
    except Exception:
        logger.warning("Falha ao montar log de telemetria de IA (ignorada).", exc_info=True)
        return
    safe_persist_interaction(db, log, commit=commit)
