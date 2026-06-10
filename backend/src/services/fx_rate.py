"""Cotação USD→BRL via API PTAX oficial do Banco Central (Olinda OData).

Endpoint público (sem auth):
  https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/
    CotacaoDolarPeriodo(dataInicial=@i,dataFinalCotacao=@f)?...&$format=json

Estratégia: busca a última cotação de venda num intervalo recente (cobre fim de semana /
feriado, quando não há boletim). Cache em memória com TTL. Degradação graciosa: em qualquer
falha usa a última cotação boa em cache ou settings.usd_brl_fallback_rate.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from src.config.settings import settings

logger = logging.getLogger("src.ai.fx")

_BCB_URL = (
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
    "CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)"
    "?@dataInicial='{inicio}'&@dataFinalCotacao='{fim}'"
    "&$top=100&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoVenda,dataHoraCotacao"
)


@dataclass
class FxRate:
    rate: float
    source: str  # "PTAX dd/mm/aaaa" | "cache" | "fallback"
    fetched_at: datetime


_cache: FxRate | None = None


def _fetch_ptax() -> FxRate | None:
    try:
        import httpx
    except Exception as exc:  # pragma: no cover - httpx vem transitivo do openai
        logger.warning("httpx indisponível para cotação PTAX: %s", exc)
        return None

    now = datetime.now(timezone.utc)
    # MM-DD-YYYY é o formato esperado pela API do BCB.
    fim = now.strftime("%m-%d-%Y")
    inicio = (now - timedelta(days=10)).strftime("%m-%d-%Y")
    url = _BCB_URL.format(inicio=inicio, fim=fim)
    try:
        resp = httpx.get(url, timeout=8.0)
        resp.raise_for_status()
        rows = resp.json().get("value", [])
    except Exception as exc:
        logger.warning("Falha ao consultar PTAX/BCB: %s", exc)
        return None

    if not rows:
        logger.warning("PTAX/BCB sem cotações no período %s..%s", inicio, fim)
        return None

    latest = rows[0]
    rate = latest.get("cotacaoVenda")
    if not isinstance(rate, (int, float)) or rate <= 0:
        logger.warning("PTAX/BCB retornou cotacaoVenda inválida: %r", rate)
        return None

    stamp = str(latest.get("dataHoraCotacao", ""))[:10]
    return FxRate(rate=float(rate), source=f"PTAX {stamp}", fetched_at=now)


def get_usd_brl() -> FxRate:
    """Cotação atual USD→BRL, com cache TTL e fallback. Nunca levanta exceção."""

    global _cache
    now = datetime.now(timezone.utc)
    ttl = timedelta(hours=settings.usd_brl_rate_ttl_hours)

    if _cache is not None and now - _cache.fetched_at < ttl:
        return _cache

    fetched = _fetch_ptax()
    if fetched is not None:
        _cache = fetched
        return fetched

    if _cache is not None:
        # cotação velha porém real é melhor que fallback fixo
        return FxRate(rate=_cache.rate, source="cache", fetched_at=_cache.fetched_at)

    return FxRate(rate=settings.usd_brl_fallback_rate, source="fallback", fetched_at=now)
