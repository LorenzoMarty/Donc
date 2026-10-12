from __future__ import annotations

import sys
from types import SimpleNamespace
from unittest.mock import MagicMock

import httpx
import pytest

from src.agents.elimination_gate import EliminationGateAgent, jev, laya
from src.agents.elimination_gate.screening import RISK_QUESTIONS
from src.agents.schemas import EliminationGateOutput, PreProcessorOutput
from src.config.settings import settings

PRE_OK = PreProcessorOutput(word_count=300, paragraph_count=4, has_minimum_structure=True, is_truncated=False)
PRE_SHORT = PreProcessorOutput(word_count=30, paragraph_count=1, has_minimum_structure=False, is_truncated=False)
GPT_ZERO = EliminationGateOutput(status="ZERO", reason="Fuga total.", zero_rule="fuga_total")


def _answers(risk: float) -> dict:
    return {"answers": {k: {"type": "noul", "noul": risk} for k in RISK_QUESTIONS},
            "model": "jev-1.13.0", "usage": {"input_tokens": 400, "output_tokens": 20}}


def _mock_post(monkeypatch, payload=None, exc: Exception | None = None):
    def fake(*_a, **_k):
        if exc:
            raise exc
        resp = MagicMock()
        resp.json.return_value = payload
        return resp
    monkeypatch.setattr(jev.httpx, "post", fake)


def _agent():
    runner = MagicMock()
    runner.run_structured.return_value = GPT_ZERO
    return EliminationGateAgent(runner), runner


@pytest.fixture(autouse=True)
def _providers(monkeypatch):
    monkeypatch.setattr(settings, "jev_api_key", "test-key")
    monkeypatch.setattr(settings, "laya_enabled", False)
    monkeypatch.setattr(laya, "_agent", None)
    monkeypatch.setattr(laya, "_failed_at", None)


# --- Jev ---

def test_low_risk_skips_gpt(monkeypatch):
    _mock_post(monkeypatch, _answers(0.02))
    agent, runner = _agent()
    out = agent.evaluate("tema", "texto", PRE_OK)
    assert out.status == "APPROVED"
    runner.run_structured.assert_not_called()
    assert runner.last_model == "jev-1.13.0"


def test_any_risk_falls_to_gpt(monkeypatch):
    payload = _answers(0.02)
    payload["answers"]["fuga_total"]["noul"] = 0.6
    _mock_post(monkeypatch, payload)
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO
    runner.run_structured.assert_called_once()


def test_jev_failure_falls_to_gpt(monkeypatch):
    _mock_post(monkeypatch, exc=httpx.ConnectError("boom"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO


def test_malformed_response_falls_to_gpt(monkeypatch):
    _mock_post(monkeypatch, {"answers": {}})
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO


def test_heuristic_reject_never_calls_provider(monkeypatch):
    _mock_post(monkeypatch, exc=AssertionError("provedor nao deveria ser chamado"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_SHORT) is GPT_ZERO


def test_disabled_without_key(monkeypatch):
    monkeypatch.setattr(settings, "jev_api_key", None)
    _mock_post(monkeypatch, exc=AssertionError("Jev nao deveria ser chamado"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO


# --- Laya ---

def _fake_laya(monkeypatch, risk: float | None = None, load_exc: Exception | None = None):
    calls = []

    def load(checkpoint, subfolder=None):
        if load_exc:
            raise load_exc
        calls.append((checkpoint, subfolder))
        return SimpleNamespace(predict=lambda state, q, **kw: {
            "answers": {k: {"type": "noul", "noul": risk} for k in q}, "usage": {"input_tokens": 500}})

    monkeypatch.setitem(sys.modules, "laya", SimpleNamespace(load=load))
    monkeypatch.setattr(settings, "laya_enabled", True)
    return calls


def test_laya_low_risk_skips_gpt_and_never_calls_jev(monkeypatch):
    calls = _fake_laya(monkeypatch, risk=0.01)
    _mock_post(monkeypatch, exc=AssertionError("Jev nao deveria ser chamado"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK).status == "APPROVED"
    runner.run_structured.assert_not_called()
    assert runner.last_model == "laya"
    agent.evaluate("tema", "texto", PRE_OK)
    assert calls == [("convaiinnovations/laya", "multilingual")]  # carregou uma vez so


def test_laya_high_risk_falls_to_gpt(monkeypatch):
    _fake_laya(monkeypatch, risk=0.5)
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO


def test_laya_load_failure_falls_to_gpt(monkeypatch):
    _fake_laya(monkeypatch, load_exc=RuntimeError("sem pesos"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO


def test_laya_load_failure_is_cached_within_retry_window(monkeypatch):
    attempts = []

    def load(checkpoint, subfolder=None):
        attempts.append(1)
        raise RuntimeError("sem pesos")

    monkeypatch.setitem(sys.modules, "laya", SimpleNamespace(load=load))
    monkeypatch.setattr(settings, "laya_enabled", True)
    monkeypatch.setattr(settings, "laya_retry_seconds", 300)
    agent, _ = _agent()
    agent.evaluate("tema", "texto", PRE_OK)
    agent.evaluate("tema", "texto", PRE_OK)
    assert len(attempts) == 1  # segunda redacao nao tenta carregar de novo
    monkeypatch.setattr(laya, "_failed_at", laya._failed_at - 301)
    agent.evaluate("tema", "texto", PRE_OK)
    assert len(attempts) == 2  # passou o intervalo: tenta de novo
