from __future__ import annotations

from unittest.mock import MagicMock

import httpx
import pytest

from src.agents.elimination_gate import EliminationGateAgent
from src.agents.elimination_gate import jev
from src.agents.schemas import EliminationGateOutput, PreProcessorOutput
from src.config.settings import settings

PRE_OK = PreProcessorOutput(word_count=300, paragraph_count=4, has_minimum_structure=True, is_truncated=False)
PRE_SHORT = PreProcessorOutput(word_count=30, paragraph_count=1, has_minimum_structure=False, is_truncated=False)
GPT_ZERO = EliminationGateOutput(status="ZERO", reason="Fuga total.", zero_rule="fuga_total")


def _answers(risk: float) -> dict:
    return {"answers": {k: {"type": "noul", "noul": risk} for k in jev._RISK_QUESTIONS},
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
def _jev_key(monkeypatch):
    monkeypatch.setattr(settings, "jev_api_key", "test-key")


def test_low_risk_skips_gpt(monkeypatch):
    _mock_post(monkeypatch, _answers(0.02))
    agent, runner = _agent()
    out = agent.evaluate("tema", "texto", PRE_OK)
    assert out.status == "APPROVED"
    runner.run_structured.assert_not_called()
    assert runner._reset_run_state.called and runner.last_model == "jev-1.13.0"


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


def test_heuristic_reject_never_calls_jev(monkeypatch):
    _mock_post(monkeypatch, exc=AssertionError("Jev nao deveria ser chamado"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_SHORT) is GPT_ZERO


def test_disabled_without_key(monkeypatch):
    monkeypatch.setattr(settings, "jev_api_key", None)
    _mock_post(monkeypatch, exc=AssertionError("Jev nao deveria ser chamado"))
    agent, runner = _agent()
    assert agent.evaluate("tema", "texto", PRE_OK) is GPT_ZERO
