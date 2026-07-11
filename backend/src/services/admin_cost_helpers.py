from __future__ import annotations

from src.config.settings import settings
from src.models import AIInteractionLog


def log_cost_micros(log: AIInteractionLog) -> int:
    """Custo da chamada em micro-USD. Usa cost_micro_usd real; cai no cálculo
    legado (token_count × taxa) para linhas antigas sem custo gravado."""
    if getattr(log, "cost_micro_usd", 0):
        return log.cost_micro_usd
    return int((log.token_count / 1000) * settings.ai_cost_cents_per_1k_tokens * 10_000)


def micros_to_usd_cents(micros: int) -> int:
    return int(round(micros / 10_000))


def micros_to_brl_cents(micros: int, rate: float) -> int:
    return int(round((micros / 1_000_000) * rate * 100))
