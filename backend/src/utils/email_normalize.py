"""Chave canônica de e-mail para detectar contas descartáveis da mesma pessoa."""

from __future__ import annotations

_GMAIL_DOMAINS = {"gmail.com", "googlemail.com"}


def normalize_email(email: str) -> str:
    """`Nome.Sobre+promo@Gmail.com` e `nomesobre@gmail.com` viram a mesma chave.

    Remove o sufixo `+tag` em qualquer provedor e os pontos só no Gmail (onde são ignorados).
    """
    local, _, domain = email.strip().lower().partition("@")
    local = local.split("+", 1)[0]
    if domain in _GMAIL_DOMAINS:
        local = local.replace(".", "")
        domain = "gmail.com"
    return f"{local}@{domain}"
