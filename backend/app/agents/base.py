from __future__ import annotations

import json
from typing import Any, TypeVar

from pydantic import BaseModel

from app.core.config import settings


T = TypeVar("T", bound=BaseModel)


class AgnoAgentRunner:
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
        if not settings.openai_api_key:
            return fallback

        try:
            from agno.agent import Agent
            from agno.models.openai import OpenAIResponses
        except Exception:
            return fallback

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
            return self._coerce_output(getattr(run_output, "content", run_output), output_schema, fallback)
        except Exception:
            return fallback

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
            return fallback
        return fallback
