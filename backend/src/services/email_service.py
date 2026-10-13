"""E-mail transacional via Resend (HTTP, sem SDK). Nunca levanta: falha de envio é logada e
engolida — e-mail é efeito colateral, não pode derrubar cadastro, webhook ou cancelamento.
Sem `RESEND_API_KEY` (dev/testes) só loga o envio."""

from __future__ import annotations

import html
import logging
import threading
from collections.abc import Callable

import httpx

from src.config.settings import settings

logger = logging.getLogger("src.email")

RESEND_URL = "https://api.resend.com/emails"


def _layout(title: str, body_html: str, cta: tuple[str, str] | None = None) -> str:
    button = (
        f'<p style="margin:24px 0"><a href="{html.escape(cta[1])}" style="background:#4f46e5;color:#fff;'
        f'padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">{html.escape(cta[0])}</a></p>'
        if cta
        else ""
    )
    return (
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">'
        f'<h1 style="font-size:20px;margin:0 0 16px">{html.escape(title)}</h1>'
        f"{body_html}{button}"
        '<p style="font-size:12px;color:#6b7280;margin-top:32px">Donc ENEM — preparação para Português e Redação.</p>'
        "</div>"
    )


def send_email(*, to: str, subject: str, html_body: str) -> bool:
    if not settings.resend_api_key:
        logger.info("E-mail não enviado (RESEND_API_KEY ausente): to=%s subject=%s", to, subject)
        return False
    try:
        response = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "html": html_body},
            timeout=10.0,
        )
        response.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001 — e-mail nunca derruba o fluxo chamador
        logger.warning("Falha ao enviar e-mail (to=%s subject=%s): %s: %s", to, subject, type(exc).__name__, exc)
        return False


def fire_and_forget(send: Callable[..., bool], **kwargs) -> None:
    """Envia em thread daemon: webhook/cancelamento nao podem esperar o Resend (o MP reenviaria o
    evento se a resposta demorar). `send_email` ja engole qualquer erro."""
    threading.Thread(target=send, kwargs=kwargs, daemon=True).start()


def _app_url(path: str) -> str:
    origin = settings.frontend_origin.split(",", maxsplit=1)[0].strip().rstrip("/")
    return f"{origin}{path}"


def send_welcome(*, to: str, name: str) -> bool:
    body = f"<p>Oi, {html.escape(name)}! Sua conta foi criada. Bons estudos!</p>"
    return send_email(to=to, subject="Bem-vindo ao Donc", html_body=_layout("Bem-vindo ao Donc", body, ("Começar", _app_url("/dashboard"))))


def send_password_reset(*, to: str, name: str, token: str) -> bool:
    link = _app_url(f"/redefinir-senha?token={token}")
    body = (
        f"<p>Oi, {html.escape(name)}. Recebemos um pedido para redefinir sua senha. "
        f"O link vale por {settings.password_reset_token_minutes} minutos e só pode ser usado uma vez.</p>"
        "<p>Se não foi você, ignore este e-mail.</p>"
    )
    return send_email(to=to, subject="Redefinir sua senha", html_body=_layout("Redefinir senha", body, ("Redefinir senha", link)))


def send_payment_approved(*, to: str, name: str) -> bool:
    body = f"<p>{html.escape(name)}, seu pagamento foi aprovado e seu acesso está liberado.</p>"
    return send_email(to=to, subject="Pagamento aprovado", html_body=_layout("Pagamento aprovado", body, ("Acessar", _app_url("/dashboard"))))


def send_payment_failed(*, to: str, name: str, grace_days: int) -> bool:
    body = (
        f"<p>{html.escape(name)}, não conseguimos processar sua cobrança. "
        f"Você mantém o acesso por mais {grace_days} dias — atualize a forma de pagamento para não perdê-lo.</p>"
    )
    return send_email(to=to, subject="Falha na cobrança da sua assinatura", html_body=_layout("Falha na cobrança", body, ("Ver assinatura", _app_url("/assinatura"))))


def send_subscription_canceled(*, to: str, name: str) -> bool:
    body = f"<p>{html.escape(name)}, sua assinatura foi cancelada. Você pode reativá-la quando quiser.</p>"
    return send_email(to=to, subject="Assinatura cancelada", html_body=_layout("Assinatura cancelada", body, ("Reativar", _app_url("/assinatura"))))
