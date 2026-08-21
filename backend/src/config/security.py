from datetime import UTC, datetime, timedelta
import hashlib
import secrets
from typing import Any

import bcrypt
from jose import JWTError, jwt

from src.config.settings import settings


def _password_bytes(password: str) -> bytes:
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_password_bytes(plain_password), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def create_access_token(subject: str, expires_delta: timedelta | None = None, extra: dict[str, Any] | None = None) -> str:
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload: dict[str, Any] = {"sub": subject, "exp": expire}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Token inválido ou expirado.") from exc


def generate_refresh_token() -> str:
    """Token opaco (não-JWT) — validado só contra o hash salvo em `refresh_tokens`, nunca
    decodificado. Permite revogação real (JWT de acesso não permite; ver auditoria arquitetural
    2026-08-21)."""
    return secrets.token_urlsafe(32)


def hash_refresh_token(token: str) -> str:
    # sha256 (não bcrypt): comparação de igualdade contra um valor já de alta entropia
    # (token_urlsafe(32)), não uma senha — não precisa de salt/custo computacional, só
    # impedir que o valor em claro fique legível se o banco vazar.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
