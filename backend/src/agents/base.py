from __future__ import annotations

import hashlib
import json
import time
from typing import Any, TypeVar

from pydantic import BaseModel

from src.config.settings import settings


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
        span_context = self._span_context(
            agent_name=agent_name,
            description=description,
            output_schema=output_schema,
            user_id=user_id,
            session_id=session_id,
        )
        with span_context as span:
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
                metrics = getattr(run_output, "metrics", None)
                self.last_input_tokens = self._metric_value(metrics, {"input_tokens", "prompt_tokens"})
                self.last_output_tokens = self._metric_value(metrics, {"output_tokens", "completion_tokens"})
                self.last_token_count = self._extract_token_count(metrics)
                result = self._coerce_output(getattr(run_output, "content", run_output), output_schema, fallback)
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

    def _span_context(
        self,
        *,
        agent_name: str,
        description: str,
        output_schema: type[BaseModel],
        user_id: int | None,
        session_id: str | None,
    ):
        try:
            from opentelemetry import trace

            tracer = trace.get_tracer("src.ai")
            span_context = tracer.start_as_current_span(f"ai.{agent_name}")
        except Exception:  # pragma: no cover - telemetry must never block generation
            return _NoopSpanContext()

        return _TelemetrySpanContext(
            span_context,
            attributes={
                "langfuse.trace.name": agent_name,
                "langfuse.observation.type": "generation",
                "langfuse.observation.model.name": settings.openai_model,
                "gen_ai.system": "openai",
                "gen_ai.request.model": settings.openai_model,
                "ai.agent": agent_name,
                "ai.description": description,
                "ai.output_schema": output_schema.__name__,
                "ai.prompt_hash": self.last_prompt_hash or "",
                **({"user.id": str(user_id), "langfuse.user.id": str(user_id)} if user_id is not None else {}),
                **({"session.id": session_id, "langfuse.session.id": session_id} if session_id else {}),
            },
        )

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
            span.set_attribute("ai.latency_ms", self.last_latency_ms)
            span.set_attribute("ai.token_count", self.last_token_count)
            span.set_attribute("ai.used_fallback", used_fallback)
            span.set_attribute("ai.status", self.last_status)
            if error:
                span.set_attribute("error.message", error)
        except Exception:
            pass
        return result

    def _mark_span_error(self, span: Any, error: str) -> None:
        try:
            from opentelemetry.trace import Status, StatusCode

            span.set_status(Status(StatusCode.ERROR, error))
            span.set_attribute("error.message", error)
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


class _TelemetrySpanContext:
    def __init__(self, span_context: Any, attributes: dict[str, str]) -> None:
        self.span_context = span_context
        self.attributes = attributes

    def __enter__(self):
        span = self.span_context.__enter__()
        for key, value in self.attributes.items():
            span.set_attribute(key, value)
        return span

    def __exit__(self, *args: Any) -> Any:
        return self.span_context.__exit__(*args)


class _NoopSpanContext:
    def __enter__(self) -> "_NoopSpanContext":
        return self

    def __exit__(self, *_: Any) -> None:
        return None

    def set_attribute(self, *_: Any) -> None:
        return None
