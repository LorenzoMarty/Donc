"""Validação do ID token do Google (Google Identity Services) no servidor.

Sem dependência nova: `python-jose` já valida a assinatura RS256 contra as chaves públicas do Google
(JWKS), com cache curto. Aceita só token com `aud` = `GOOGLE_CLIENT_ID`, emissor do Google, não
expirado e `email_verified=true`.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable

import httpx
from jose import JWTError, jwt

from src.config.settings import settings
from src.middlewares.errors import AppError

logger = logging.getLogger("src.services.google_identity")

_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
_JWKS_TTL_SECONDS = 3600
_jwks_cache: tuple[float, dict] | None = None


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str


def _fetch_jwks() -> dict:
    global _jwks_cache
    now = time.monotonic()
    if _jwks_cache and now - _jwks_cache[0] < _JWKS_TTL_SECONDS:
        return _jwks_cache[1]
    response = httpx.get(settings.google_jwks_url, timeout=5.0)
    response.raise_for_status()
    jwks = response.json()
    _jwks_cache = (now, jwks)
    return jwks


def _invalid() -> AppError:
    return AppError("Não foi possível entrar com o Google. Tente novamente.", status_code=401, code="invalid_google_token")


def verify_google_id_token(id_token: str, *, jwks_loader: Callable[[], dict] | None = None) -> GoogleIdentity:
    client_id = settings.google_client_id
    if not client_id:
        raise AppError("Login com Google não está configurado.", status_code=503, code="google_login_disabled")
    try:
        jwks = (jwks_loader or _fetch_jwks)()
    except (httpx.HTTPError, ValueError):
        logger.exception("Falha ao buscar as chaves do Google")
        raise AppError("Não foi possível validar o login com o Google agora.", status_code=502, code="google_unreachable") from None
    try:
        claims = jwt.decode(
            id_token,
            jwks,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_at_hash": False},
        )
    except JWTError:
        raise _invalid() from None
    if claims.get("iss") not in _ISSUERS:
        raise _invalid()
    email = str(claims.get("email") or "").strip().lower()
    # Vincular por e-mail sem esta checagem permitiria tomar a conta de outra pessoa.
    if not claims.get("sub") or not email or claims.get("email_verified") is not True:
        raise _invalid()
    return GoogleIdentity(sub=str(claims["sub"]), email=email, name=str(claims.get("name") or email.split("@", maxsplit=1)[0])[:120])
