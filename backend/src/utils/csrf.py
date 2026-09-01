from __future__ import annotations

from fastapi import Request

from src.config.security import verify_csrf_signature
from src.middlewares.errors import AppError


def require_csrf_for_cookie_session(request: Request) -> None:
    access_token = request.cookies.get("access_token")
    if not access_token:
        return
    header_token = request.headers.get("x-csrf-token")
    cookie_token = request.cookies.get("csrf_token")
    signature = request.cookies.get("csrf_signature")
    if not header_token or not cookie_token or not signature:
        raise AppError("Token CSRF ausente ou inválido.", status_code=403, code="csrf_invalid")
    if header_token != cookie_token or not verify_csrf_signature(cookie_token, access_token, signature):
        raise AppError("Token CSRF ausente ou inválido.", status_code=403, code="csrf_invalid")
