"""Tabela de preços oficial da OpenAI por modelo + cálculo de custo em micro-USD.

Fonte dos preços: https://openai.com/api/pricing/ (USD por 1M de tokens).
Atualizado em 2026-06. Mudou preço → editar este arquivo (não há API oficial de pricing).

Custo é calculado em **micro-USD** (1 USD = 1_000_000 micros) para evitar o
arredondamento-pra-zero que ocorria ao guardar custo por chamada em centavos inteiros.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger("src.ai.pricing")

MICROS_PER_USD = 1_000_000


@dataclass(frozen=True)
class ModelPrice:
    """Preço em USD por 1M de tokens (input/output separados)."""

    input_per_1m: float
    output_per_1m: float


# Preços oficiais OpenAI (USD / 1M tokens). Embeddings não têm custo de output.
MODEL_PRICING: dict[str, ModelPrice] = {
    "gpt-4o": ModelPrice(input_per_1m=2.50, output_per_1m=10.00),
    "gpt-4o-mini": ModelPrice(input_per_1m=0.15, output_per_1m=0.60),
    # gpt-5.5: confirmar valor oficial vigente em openai.com/api/pricing antes de produção.
    "gpt-5.5": ModelPrice(input_per_1m=1.25, output_per_1m=10.00),
    "text-embedding-3-small": ModelPrice(input_per_1m=0.02, output_per_1m=0.0),
    "text-embedding-3-large": ModelPrice(input_per_1m=0.13, output_per_1m=0.0),
}

# Fallback para modelo desconhecido (mistura input/output numa taxa conservadora).
DEFAULT_PRICE = ModelPrice(input_per_1m=2.50, output_per_1m=10.00)


def _resolve_price(model: str | None) -> ModelPrice:
    if not model:
        return DEFAULT_PRICE
    key = model.strip().lower()
    if key in MODEL_PRICING:
        return MODEL_PRICING[key]
    # Match tolerante por prefixo (ex.: "gpt-4o-2024-11-20" → "gpt-4o").
    for known, price in MODEL_PRICING.items():
        if key.startswith(known):
            return price
    logger.warning("Modelo de IA sem preço cadastrado: %s — usando DEFAULT_PRICE", model)
    return DEFAULT_PRICE


def cost_micro_usd(model: str | None, input_tokens: int, output_tokens: int) -> int:
    """Custo da chamada em micro-USD a partir do modelo e do split de tokens."""

    price = _resolve_price(model)
    input_cost = (max(0, input_tokens) / 1_000_000) * price.input_per_1m
    output_cost = (max(0, output_tokens) / 1_000_000) * price.output_per_1m
    return int(round((input_cost + output_cost) * MICROS_PER_USD))


# Preço flat por imagem gerada (USD) — geração de imagem não é cobrada por token.
IMAGE_MODEL_PRICING: dict[str, float] = {
    "gpt-image-1": 0.04,
}

DEFAULT_IMAGE_PRICE_USD = 0.04


def image_generation_cost_micro_usd(model: str | None) -> int:
    """Custo de uma chamada de geração de imagem, em micro-USD."""

    if not model:
        return int(round(DEFAULT_IMAGE_PRICE_USD * MICROS_PER_USD))
    key = model.strip().lower()
    price_usd = IMAGE_MODEL_PRICING.get(key, DEFAULT_IMAGE_PRICE_USD)
    return int(round(price_usd * MICROS_PER_USD))
