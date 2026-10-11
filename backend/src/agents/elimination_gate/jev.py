from __future__ import annotations

import logging

import httpx

from src.agents.elimination_gate.screening import RISK_QUESTIONS, GateScreening, risks_approved
from src.config.settings import settings


logger = logging.getLogger("src.agents.elimination_gate.jev")


def screen_jev(theme: str, content: str) -> GateScreening | None:
    if not settings.jev_api_key:
        return None
    try:
        resp = httpx.post(
            settings.jev_base_url,
            headers={"Authorization": f"Bearer {settings.jev_api_key}"},
            json={
                "model": settings.jev_model,
                "state": f"Tema: {theme}\n\nRedacao:\n{content}",
                "questions": {k: {"type": "noul", "instructions": v} for k, v in RISK_QUESTIONS.items()},
            },
            timeout=settings.jev_timeout_seconds,
        )
        resp.raise_for_status()
        body = resp.json()
        usage = body.get("usage") or {}
        return GateScreening(
            approved=risks_approved(body["answers"]),
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            model=str(body.get("model") or settings.jev_model),
        )
    except Exception as exc:  # rede, 4xx/5xx (inclui 402 sem credito), JSON/shape inesperado: nunca derruba a correcao
        logger.warning("Jev indisponivel — gate segue para GPT: %s", exc)
        return None
