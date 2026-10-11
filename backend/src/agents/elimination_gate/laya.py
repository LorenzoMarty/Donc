from __future__ import annotations

import logging
import threading

from src.agents.elimination_gate.screening import RISK_QUESTIONS, GateScreening, risks_approved
from src.config.settings import settings


logger = logging.getLogger("src.agents.elimination_gate.laya")

_agent = None
_load_lock = threading.Lock()
_QUESTIONS = {k: {"type": "noul", "instructions": v} for k, v in RISK_QUESTIONS.items()}


def _get_agent():
    """Carrega o checkpoint uma vez por processo (lazy: `laya` e `torch` so sao importados se ligado)."""
    global _agent
    if _agent is None:
        with _load_lock:
            if _agent is None:
                import laya

                _agent = laya.load(settings.laya_checkpoint, subfolder=settings.laya_subfolder)
    return _agent


def screen_laya(theme: str, content: str) -> GateScreening | None:
    try:
        result = _get_agent().predict(
            f"Tema: {theme}\n\nRedacao:\n{content}", _QUESTIONS, max_len=settings.laya_max_len
        )
        usage = result.get("usage") or {}
        return GateScreening(
            approved=risks_approved(result["answers"]),
            input_tokens=int(usage.get("input_tokens", 0)),
            output_tokens=int(usage.get("output_tokens", 0)),
            model="laya",
        )
    except Exception as exc:  # pacote ausente, falha ao baixar/carregar pesos, shape inesperado: segue pro GPT
        logger.warning("Laya indisponivel — gate segue para GPT: %s", exc)
        return None
