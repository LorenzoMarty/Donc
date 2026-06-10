"""Testes puros da tabela de preços de IA (custo em micro-USD por modelo)."""

from __future__ import annotations

import pytest

from src.config.ai_pricing import DEFAULT_PRICE, cost_micro_usd

pytestmark = pytest.mark.unit


def test_gpt_4o_input_output_split() -> None:
    # gpt-4o: $2.50/1M input, $10.00/1M output.
    # 1M input + 1M output = $12.50 = 12_500_000 micro-USD.
    assert cost_micro_usd("gpt-4o", 1_000_000, 1_000_000) == 12_500_000


def test_gpt_4o_mini_is_cheaper_than_4o() -> None:
    mini = cost_micro_usd("gpt-4o-mini", 10_000, 10_000)
    full = cost_micro_usd("gpt-4o", 10_000, 10_000)
    assert 0 < mini < full


def test_embedding_has_no_output_cost() -> None:
    # text-embedding-3-small: $0.02/1M input, output grátis.
    assert cost_micro_usd("text-embedding-3-small", 1_000_000, 999) == 20_000


def test_prefix_match_resolves_versioned_model() -> None:
    base = cost_micro_usd("gpt-4o", 1_000_000, 0)
    versioned = cost_micro_usd("gpt-4o-2024-11-20", 1_000_000, 0)
    assert versioned == base


def test_unknown_model_uses_default_price() -> None:
    got = cost_micro_usd("modelo-inexistente", 1_000_000, 0)
    expected = int(round((1_000_000 / 1_000_000) * DEFAULT_PRICE.input_per_1m * 1_000_000))
    assert got == expected


def test_zero_tokens_costs_zero() -> None:
    assert cost_micro_usd("gpt-4o", 0, 0) == 0


def test_negative_tokens_clamped_to_zero() -> None:
    assert cost_micro_usd("gpt-4o", -50, -50) == 0
