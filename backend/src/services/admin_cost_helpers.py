from __future__ import annotations

from src.config.settings import settings
from src.models import AIInteractionLog


def log_cost_micros(log: AIInteractionLog) -> int:
    """Custo da chamada em micro-USD. Usa cost_micro_usd real; cai no cálculo
    legado (token_count × taxa) só para linhas anteriores ao rastreio de custo por modelo
    (sem `model` gravado). cost_micro_usd é NOT NULL default 0, então um valor 0 sozinho não
    distingue "não calculado" de "calculado e genuinamente ~0" (chamada com poucos tokens em
    modelo barato arredonda pra 0) — toda linha com `model` já passou pelo cálculo real."""
    if log.cost_micro_usd or log.model:
        return log.cost_micro_usd
    return int((log.token_count / 1000) * settings.ai_cost_cents_per_1k_tokens * 10_000)


def micros_to_usd_cents(micros: int) -> int:
    return int(round(micros / 10_000))


def micros_to_brl_cents(micros: int, rate: float) -> int:
    return int(round((micros / 1_000_000) * rate * 100))
