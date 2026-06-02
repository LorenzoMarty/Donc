from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy.orm import Session

from src.agents.base import AgnoAgentRunner
from src.models import AIInteractionLog


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
) -> None:
    try:
        prompt_hash = runner.last_prompt_hash if runner is not None else None
        if prompt_hash is None and prompt is not None:
            prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

        db.add(
            AIInteractionLog(
                user_id=user_id,
                job_id=job_id,
                workflow=workflow,
                agent=agent,
                status=status or (runner.last_status if runner is not None else "success"),
                latency_ms=latency_ms if latency_ms is not None else (runner.last_latency_ms if runner is not None else 0),
                token_count=token_count if token_count is not None else (runner.last_token_count if runner is not None else 0),
                cost_estimate=0,
                prompt_hash=prompt_hash,
                error=error if error is not None else (runner.last_error if runner is not None else None),
                meta={
                    **(meta or {}),
                    **(
                        {
                            "model": runner.last_model,
                            "used_fallback": runner.last_used_fallback,
                        }
                        if runner is not None
                        else {}
                    ),
                },
            )
        )
        if commit:
            db.commit()
    except Exception:
        if commit:
            db.rollback()
