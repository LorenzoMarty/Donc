import logging

import pytest
import sentry_sdk
from sentry_sdk.transport import Transport

from src.config.settings import settings
from src.telemetry import sentry as sentry_module

pytestmark = pytest.mark.unit


class _Capture(Transport):
    def __init__(self):
        super().__init__()
        self.events: list[dict] = []

    def capture_envelope(self, envelope):
        event = envelope.get_event()
        if event:
            self.events.append(event)


def test_configure_sentry_is_noop_without_dsn(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", None)
    assert sentry_module.configure_sentry() is False


def test_scrub_removes_request_body_cookies_and_auth_headers():
    event = {
        "request": {
            "data": {"text": "minha redacao"},
            "cookies": {"access_token": "x"},
            "headers": {"Authorization": "Bearer x", "User-Agent": "ua"},
        }
    }
    scrubbed = sentry_module.scrub_event(event)
    assert "data" not in scrubbed["request"] and "cookies" not in scrubbed["request"]
    assert scrubbed["request"]["headers"] == {"User-Agent": "ua"}


def test_forced_error_and_logged_error_reach_sentry_scrubbed():
    transport = _Capture()
    sentry_sdk.init(dsn="https://k@example.invalid/1", transport=transport, before_send=sentry_module.scrub_event)
    try:
        try:
            raise RuntimeError("erro forcado")
        except RuntimeError:
            logging.getLogger("src.routes.subscriptions").exception("Falha ao processar webhook do Mercado Pago")
        sentry_sdk.flush()
    finally:
        sentry_sdk.init()  # desliga
    assert any("webhook" in str(e.get("logentry", e.get("message", ""))).lower() or e.get("exception") for e in transport.events)


def test_configure_sentry_initializes_with_dsn(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", "https://k@example.invalid/1")
    try:
        assert sentry_module.configure_sentry() is True
    finally:
        sentry_sdk.init()  # desliga
