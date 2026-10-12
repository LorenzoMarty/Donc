from __future__ import annotations

import logging
import threading
import time

from src.agents.elimination_gate.screening import RISK_QUESTIONS, GateScreening, risks_approved
from src.config.settings import settings


logger = logging.getLogger("src.agents.elimination_gate.laya")

_agent = None
_failed_at: float | None = None  # monotonic da ultima falha de carga
_load_lock = threading.Lock()
_QUESTIONS = {k: {"type": "noul", "instructions": v} for k, v in RISK_QUESTIONS.items()}


def _get_agent():
    """Carrega o checkpoint uma vez por processo (lazy: `laya` e `torch` so sao importados se ligado).

    Falha de carga e lembrada por `laya_retry_seconds`: dentro do intervalo devolve None sem tentar
    (nem baixar) de novo; o warning sai so quando a tentativa de fato falha.
    """
    global _agent, _failed_at
    if _agent is not None:
        return _agent
    with _load_lock:
        if _agent is not None:
            return _agent
        if _failed_at is not None and time.monotonic() - _failed_at < settings.laya_retry_seconds:
            return None
        try:
            import laya

            _agent = laya.load(settings.laya_checkpoint, subfolder=settings.laya_subfolder)
            _failed_at = None
        except Exception as exc:  # pacote ausente, falha ao baixar/carregar pesos
            _failed_at = time.monotonic()
            logger.warning(
                "Laya indisponivel — gate segue para GPT (nova tentativa em %ss): %s",
                settings.laya_retry_seconds, exc,
            )
    return _agent


def screen_laya(theme: str, content: str) -> GateScreening | None:
    agent = _get_agent()
    if agent is None:
        return None
    try:
        result = agent.predict(
            f"Tema: {theme}\n\nRedacao:\n{content}", _QUESTIONS, max_len=settings.laya_max_len
        )
        usage = result.get("usage") or {}
        return GateScreening(
            approved=risks_approved(result["answers"]),
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            model="laya",
        )
    except Exception as exc:  # shape inesperado/falha no predict: segue pro GPT
        logger.warning("Laya indisponivel — gate segue para GPT: %s", exc)
        return None
