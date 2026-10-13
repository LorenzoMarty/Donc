from src.config.settings import settings
from src.services import email_service


def test_send_email_is_noop_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", None)
    assert email_service.send_email(to="a@b.com", subject="s", html_body="<p>x</p>") is False


def test_send_email_swallows_transport_errors(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "key")

    def boom(*args, **kwargs):
        raise RuntimeError("network down")

    monkeypatch.setattr(email_service.httpx, "post", boom)
    assert email_service.send_email(to="a@b.com", subject="s", html_body="<p>x</p>") is False
