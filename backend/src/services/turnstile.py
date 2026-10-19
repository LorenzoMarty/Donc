"""Verificação do Cloudflare Turnstile (captcha invisível) no servidor.

Sem `TURNSTILE_SECRET_KEY` a checagem é pulada (dev/testes). Com a chave configurada, token ausente,
inválido ou falha na consulta ao Cloudflare bloqueiam a ação (falha fechada).
"""

from __future__ import annotations

import logging

import httpx

from src.config.settings import settings
from src.middlewares.errors import AppError

logger = logging.getLogger("src.services.turnstile")

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: str | None, *, remote_ip: str | None = None, transport: httpx.BaseTransport | None = None) -> None:
    secret = settings.turnstile_secret_key
    if not secret:
        return
    if not token:
        raise AppError("Confirme que você não é um robô e tente de novo.", status_code=400, code="captcha_failed")
    payload = {"secret": secret, "response": token}
    if remote_ip and remote_ip != "unknown":
        payload["remoteip"] = remote_ip
    try:
        with httpx.Client(timeout=5.0, transport=transport) as client:
            data = client.post(SITEVERIFY_URL, data=payload).json()
    except (httpx.HTTPError, ValueError):
        logger.exception("Falha ao validar o Turnstile")
        raise AppError("Não foi possível concluir a verificação de segurança agora. Tente novamente.", status_code=400, code="captcha_failed") from None
    if not data.get("success"):
        raise AppError("Confirme que você não é um robô e tente de novo.", status_code=400, code="captcha_failed")
