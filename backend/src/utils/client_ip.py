"""IP real do cliente atrás do Caddy.

Cadeia em produção: navegador -> Caddy -> Next (`/api/backend`) -> backend. O Caddy grava o IP do
cliente em `X-Forwarded-For` (descartando o que o cliente mandou) e a rota do Next repassa o header.
Sem `TRUST_FORWARDED_FOR=true` o header é ignorado: um cliente falaria qualquer IP e escaparia dos
limites.
"""

from __future__ import annotations

from fastapi import Request

from src.config.settings import settings


def client_ip(request: Request) -> str:
    if settings.trust_forwarded_for:
        forwarded = request.headers.get("x-forwarded-for", "")
        # A entrada mais à direita é a que o proxy confiável acrescentou.
        entries = [item.strip() for item in forwarded.split(",") if item.strip()]
        if entries:
            return entries[-1]
    return request.client.host if request.client else "unknown"
