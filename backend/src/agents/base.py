from __future__ import annotations

import hashlib
import json
import time
from contextlib import ExitStack
from typing import Any, TypeVar

from pydantic import BaseModel

from src.config.settings import settings
from src.telemetry import get_ai_telemetry_client


T = TypeVar("T", bound=BaseModel)


class AgnoAgentRunner:
    def __init__(self) -> None:
        self.last_token_count: int = 0
        self.last_input_tokens: int = 0
        self.last_output_tokens: int = 0
        self.last_latency_ms: int = 0
        self.last_status: str = "idle"
        self.last_error: str | None = None
        self.last_used_fallback: bool = False
        self.last_model: str | None = None
        self.last_prompt_hash: str | None = None

    def run_structured(
        self,
        *,
        agent_name: str,
        description: str,
        instructions: str | None = None,
        prompt: str,
        output_schema: type[T],
        fallback: T,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> T:
        self._reset_run_state(prompt)
        start = time.perf_counter()
        base_metadata = {
            "agent": agent_name,
            "description": description,
            "output_schema": output_schema.__name__,
            "model": settings.openai_model,
            "prompt_hash": self.last_prompt_hash or "",
        }
        stack, span = self._start_observation(
            agent_name=agent_name,
            user_id=user_id,
            session_id=session_id,
            metadata=base_metadata,
        )
        with stack:
            if not settings.openai_api_key:
                return self._finish_run(fallback, start=start, span=span, used_fallback=True, error="openai_api_key_missing")

            try:
                from agno.agent import Agent
                from agno.models.openai import OpenAIResponses
            except Exception as exc:
                return self._finish_run(fallback, start=start, span=span, used_fallback=True, error=f"agno_import_failed: {exc}")

            try:
                model = OpenAIResponses(
                    id=settings.openai_model,
                    api_key=settings.openai_api_key,
                    timeout=settings.ai_sync_timeout_seconds,
                )
                agent_kwargs: dict[str, Any] = {
                    "model": model,
                    "name": agent_name,
                    "description": description,
                    "instructions": instructions or description,
                    "output_schema": output_schema,
                    "telemetry": False,
                }
                db = self._build_agno_db()
                if db is not None:
                    agent_kwargs.update(
                        {
                            "db": db,
                            "add_history_to_context": True,
                            "enable_agentic_memory": True,
                            "update_memory_on_run": True,
                            "add_memories_to_context": True,
                        }
                    )
                agent = Agent(**agent_kwargs)
                run_output = agent.run(
                    prompt,
                    user_id=str(user_id) if user_id is not None else None,
                    session_id=session_id,
                )
                raw_content = getattr(run_output, "content", None)
                if raw_content:
                    # Only trust metrics when agno actually returned content: on a swallowed API
                    # failure (e.g. auth error logged internally, no exception raised) run_output.metrics
                    # can report bogus token counts even though nothing real happened.
                    metrics = getattr(run_output, "metrics", None)
                    self.last_input_tokens = self._metric_value(metrics, {"input_tokens", "prompt_tokens"})
                    self.last_output_tokens = self._metric_value(metrics, {"output_tokens", "completion_tokens"})
                    self.last_token_count = self._extract_token_count(metrics)
                result = self._coerce_output(raw_content, output_schema, fallback)
                return self._finish_run(result, start=start, span=span, used_fallback=result is fallback)
            except Exception as exc:
                self._mark_span_error(span, str(exc))
                return self._finish_run(fallback, start=start, span=span, used_fallback=True, error=str(exc))

    def _reset_run_state(self, prompt: str) -> None:
        self.last_token_count = 0
        self.last_input_tokens = 0
        self.last_output_tokens = 0
        self.last_latency_ms = 0
        self.last_status = "success"
        self.last_error = None
        self.last_used_fallback = False
        self.last_model = settings.openai_model
        self.last_prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    def _start_observation(
        self,
        *,
        agent_name: str,
        user_id: int | None,
        session_id: str | None,
        metadata: dict[str, Any],
    ) -> tuple[ExitStack, Any]:
        """Abre um span Langfuse para o agente (pai dos spans de geracao gerados
        pelo OpenLIT). Identidade de trace (user_id/session_id) e propagada para
        todas as observacoes-filhas. No-op silencioso se tracing estiver off."""
        stack = ExitStack()
        client = get_ai_telemetry_client()
        if client is None:
            return stack, _NoopSpan()
        try:
            from langfuse import propagate_attributes

            propagation: dict[str, Any] = {}
            if user_id is not None:
                propagation["user_id"] = str(user_id)
            if session_id:
                propagation["session_id"] = session_id
            if propagation:
                stack.enter_context(propagate_attributes(**propagation))
            span = stack.enter_context(
                client.start_as_current_observation(as_type="span", name=f"ai.{agent_name}", metadata=metadata)
            )
            return stack, span
        except Exception:  # pragma: no cover - telemetria nunca bloqueia geracao
            stack.close()
            return ExitStack(), _NoopSpan()

    def _build_agno_db(self):
        if not settings.database_url.startswith("postgres"):
            return None
        try:
            from agno.db.postgres import PostgresDb

            return PostgresDb(db_url=settings.database_url)
        except Exception:
            return None

    def _coerce_output(self, content: Any, output_schema: type[T], fallback: T) -> T:
        try:
            if isinstance(content, output_schema):
                return content
            if isinstance(content, BaseModel):
                return output_schema.model_validate(content.model_dump())
            if isinstance(content, dict):
                return output_schema.model_validate(content)
            if isinstance(content, str):
                return output_schema.model_validate(json.loads(content))
        except Exception:
            self.last_used_fallback = True
            return fallback
        self.last_used_fallback = True
        return fallback

    def _finish_run(self, result: T, *, start: float, span: Any, used_fallback: bool, error: str | None = None) -> T:
        self.last_latency_ms = int((time.perf_counter() - start) * 1000)
        self.last_used_fallback = used_fallback
        self.last_error = error
        self.last_status = "error" if error else "success"
        try:
            span.update(
                metadata={
                    "latency_ms": self.last_latency_ms,
                    "token_count": self.last_token_count,
                    "input_tokens": self.last_input_tokens,
                    "output_tokens": self.last_output_tokens,
                    "used_fallback": used_fallback,
                    "status": self.last_status,
                    **({"error": error} if error else {}),
                }
            )
        except Exception:
            pass
        return result

    def _mark_span_error(self, span: Any, error: str) -> None:
        try:
            span.update(level="ERROR", status_message=error)
        except Exception:
            pass

    def _extract_token_count(self, metrics: Any) -> int:
        total = self._metric_value(metrics, {"total_tokens", "total_token_count", "tokens"})
        if total <= 0:
            total = self._metric_value(metrics, {"input_tokens", "output_tokens"})
        return max(0, int(total or 0))

    def _metric_value(self, value: Any, keys: set[str]) -> int:
        if value is None:
            return 0
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, dict):
            direct = sum(int(value.get(key) or 0) for key in keys if isinstance(value.get(key), (int, float)))
            if direct:
                return direct
            return sum(self._metric_value(item, keys) for item in value.values())
        if isinstance(value, (list, tuple)):
            return sum(self._metric_value(item, keys) for item in value)
        direct = 0
        for key in keys:
            item = getattr(value, key, None)
            if isinstance(item, (int, float)):
                direct += int(item)
        if direct:
            return direct
        try:
            return self._metric_value(vars(value), keys)
        except Exception:
            return 0


class _NoopSpan:
    """Span nulo usado quando o tracing esta desligado."""

    def update(self, *_: Any, **__: Any) -> None:
        return None
