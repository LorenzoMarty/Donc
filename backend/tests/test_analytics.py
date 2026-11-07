import threading

from src.config.settings import settings
from src.services import analytics


def test_capture_is_noop_without_key(monkeypatch):
    monkeypatch.setattr(settings, "posthog_api_key", None)
    called = []
    monkeypatch.setattr(analytics, "_post", lambda payload: called.append(payload))
    analytics.capture("signup", 1)
    assert called == []


def test_capture_sends_hashed_id_and_only_scalar_props(monkeypatch):
    monkeypatch.setattr(settings, "posthog_api_key", "phc_test")
    sent, done = [], threading.Event()
    monkeypatch.setattr(analytics, "_post", lambda payload: (sent.append(payload), done.set()))
    analytics.capture("essay_submitted", 42, cycle="monthly", content={"text": "redacao"}, text=None)
    assert done.wait(2)
    payload = sent[0]
    assert payload["event"] == "essay_submitted"
    assert payload["distinct_id"] != "42" and payload["distinct_id"] == analytics.distinct_id(42)
    assert payload["properties"] == {"cycle": "monthly"}


def test_capture_swallows_network_errors(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("down")

    monkeypatch.setattr(analytics.httpx, "post", boom)
    analytics._post({"api_key": "x"})  # nao levanta
