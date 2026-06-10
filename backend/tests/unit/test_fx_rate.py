"""Testes da cotação USD→BRL (PTAX/BCB) com cache e fallback."""

from __future__ import annotations

import pytest

import src.services.fx_rate as fx
from src.config.settings import settings

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def _clear_cache():
    fx._cache = None
    yield
    fx._cache = None


def test_fallback_when_fetch_fails(monkeypatch) -> None:
    monkeypatch.setattr(fx, "_fetch_ptax", lambda: None)
    result = fx.get_usd_brl()
    assert result.rate == settings.usd_brl_fallback_rate
    assert result.source == "fallback"


def test_uses_fetched_rate_when_available(monkeypatch) -> None:
    from datetime import datetime, timezone

    stub = fx.FxRate(rate=5.12, source="PTAX 2026-06-09", fetched_at=datetime.now(timezone.utc))
    monkeypatch.setattr(fx, "_fetch_ptax", lambda: stub)
    result = fx.get_usd_brl()
    assert result.rate == 5.12
    assert result.source.startswith("PTAX")


def test_cache_avoids_second_fetch(monkeypatch) -> None:
    from datetime import datetime, timezone

    calls = {"n": 0}

    def _fetch():
        calls["n"] += 1
        return fx.FxRate(rate=5.0, source="PTAX x", fetched_at=datetime.now(timezone.utc))

    monkeypatch.setattr(fx, "_fetch_ptax", _fetch)
    fx.get_usd_brl()
    fx.get_usd_brl()
    assert calls["n"] == 1  # segunda chamada veio do cache (dentro do TTL)
