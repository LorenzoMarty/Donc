"""Analytics de produto (PostHog, server-side). Sem POSTHOG_API_KEY vira no-op.

LGPD/PII: so o nome do evento e propriedades escalares vao pra fora; nunca texto de redacao, e-mail
ou nome. `distinct_id` e um hash (HMAC) do id do usuario. Sem cookie nem script no navegador, logo
nao ha banner de consentimento a tratar.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import threading

import httpx

from src.config.settings import settings

logger = logging.getLogger("src.services.analytics")


def distinct_id(user_id: int) -> str:
    return hmac.new(settings.jwt_secret_key.encode(), f"user:{user_id}".encode(), hashlib.sha256).hexdigest()[:32]


def _post(payload: dict) -> None:
    try:
        httpx.post(f"{settings.posthog_host.rstrip('/')}/capture/", json=payload, timeout=3)
    except Exception:  # noqa: BLE001 - analytics nunca derruba a requisicao
        logger.warning("Falha ao enviar evento de analytics", exc_info=True)


def capture(event: str, user_id: int | None, **properties: str | int | float | bool | None) -> None:
    if not settings.posthog_api_key or user_id is None:
        return
    props = {k: v for k, v in properties.items() if isinstance(v, (str, int, float, bool))}
    payload = {"api_key": settings.posthog_api_key, "event": event, "distinct_id": distinct_id(user_id), "properties": props}
    # Thread daemon: webhook/cadastro nao esperam o PostHog.
    threading.Thread(target=_post, args=(payload,), daemon=True).start()
