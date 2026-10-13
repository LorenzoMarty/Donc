"""Sentry (erros do backend e do worker Celery). Sem SENTRY_DSN vira no-op.

PII: redacao e dado de aluno — nada de corpo de request, cookies, headers de auth nem argumentos
de task vao pro Sentry (`send_default_pii=False` + `max_request_body_size="never"` + scrub abaixo).
Erros `logger.error/exception` viram eventos (LoggingIntegration padrao): e assim que falha de
webhook do Mercado Pago e de job de correcao gera alerta.
"""

from __future__ import annotations

import logging
from typing import Any

from src.config.settings import settings

logger = logging.getLogger("src.telemetry.sentry")

_SENSITIVE_REQUEST_KEYS = ("data", "cookies", "query_string")
_SENSITIVE_HEADERS = {"authorization", "cookie", "x-csrf-token", "x-signature"}


def scrub_event(event: dict[str, Any], hint: dict[str, Any] | None = None) -> dict[str, Any]:  # noqa: ARG001
    request = event.get("request")
    if isinstance(request, dict):
        for key in _SENSITIVE_REQUEST_KEYS:
            request.pop(key, None)
        headers = request.get("headers")
        if isinstance(headers, dict):
            request["headers"] = {k: v for k, v in headers.items() if k.lower() not in _SENSITIVE_HEADERS}
    # Argumentos de task Celery (ids, nao texto, hoje — mas nunca arriscar texto de redacao).
    extra = event.get("extra")
    if isinstance(extra, dict):
        extra.pop("celery-job", None)
    for frame_list in (event.get("exception", {}) or {}).get("values", []) or []:
        for frame in (frame_list.get("stacktrace", {}) or {}).get("frames", []) or []:
            frame.pop("vars", None)
    return event


def configure_sentry() -> bool:
    if not settings.sentry_dsn:
        return False
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            send_default_pii=False,
            include_local_variables=False,
            max_request_body_size="never",
            traces_sample_rate=0.0,
            before_send=scrub_event,
        )
        return True
    except Exception:  # noqa: BLE001 — monitoramento nunca derruba o app
        logger.warning("Falha ao iniciar o Sentry; seguindo sem ele.", exc_info=True)
        return False
