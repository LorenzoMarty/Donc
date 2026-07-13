from unittest.mock import MagicMock, patch

from pydantic import BaseModel

from src.agents.base import AgnoAgentRunner


class _Schema(BaseModel):
    value: str = "default"


def _fake_run_output(*, content, metrics):
    run_output = MagicMock()
    run_output.content = content
    run_output.metrics = metrics
    return run_output


def test_swallowed_api_failure_does_not_record_bogus_tokens():
    """agno can log an API error internally and still return a run_output with no real content
    but populated .metrics — the runner must not bill/log tokens for a call that never really
    produced anything (see P0-B audit, 2026-07-13)."""
    fallback = _Schema()
    runner = AgnoAgentRunner()

    fake_agent = MagicMock()
    fake_agent.run.return_value = _fake_run_output(content=None, metrics={"total_tokens": 249000})

    with (
        patch("src.agents.base.settings.openai_api_key", "sk-test"),
        patch("agno.agent.Agent", return_value=fake_agent),
        patch("agno.models.openai.OpenAIResponses"),
    ):
        result = runner.run_structured(
            agent_name="TestAgent",
            description="test",
            prompt="prompt",
            output_schema=_Schema,
            fallback=fallback,
        )

    assert result is fallback
    assert runner.last_used_fallback is True
    assert runner.last_token_count == 0
    assert runner.last_input_tokens == 0
    assert runner.last_output_tokens == 0


def test_real_response_still_records_tokens():
    fallback = _Schema()
    runner = AgnoAgentRunner()

    fake_agent = MagicMock()
    fake_agent.run.return_value = _fake_run_output(
        content={"value": "ok"},
        metrics={"input_tokens": 100, "output_tokens": 50, "total_tokens": 150},
    )

    with (
        patch("src.agents.base.settings.openai_api_key", "sk-test"),
        patch("agno.agent.Agent", return_value=fake_agent),
        patch("agno.models.openai.OpenAIResponses"),
    ):
        result = runner.run_structured(
            agent_name="TestAgent",
            description="test",
            prompt="prompt",
            output_schema=_Schema,
            fallback=fallback,
        )

    assert result.value == "ok"
    assert runner.last_used_fallback is False
    assert runner.last_input_tokens == 100
    assert runner.last_output_tokens == 50
    assert runner.last_token_count == 150
