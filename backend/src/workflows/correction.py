from __future__ import annotations

import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, wait
from contextlib import ExitStack
from typing import TypeVar

from opentelemetry import context as otel_context
from sqlalchemy.orm import Session

from src.agents.base import AgnoAgentRunner
from src.agents.correction import EssayCorrectionAgent
from src.agents.enem import ENEMCompetencyAgent
from src.agents.grammar import GrammarAgent
from src.agents.repertoire import RepertoireAgent
from src.agents.schemas import EssayCorrectionResult, GrammarAnalysis, RepertoireAnalysis, ThesisAnalysis
from src.agents.thesis import ThesisAgent
from src.memory import update_learning_profile
from src.services.ai_telemetry import build_interaction_log, safe_persist_interaction
from src.telemetry import flush_ai_telemetry, get_ai_telemetry_client
from src.utils.ai_security import guarded_student_text, sanitize_ai_text


T = TypeVar("T")


class CorrectionOrchestratorWorkflow:
    workflow_name = "essay_correction"

    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.thesis_agent = ThesisAgent()
        self.grammar_agent = GrammarAgent()
        self.repertoire_agent = RepertoireAgent()
        self.enem_agent = ENEMCompetencyAgent()
        self.correction_agent = EssayCorrectionAgent()

    def correct(
        self,
        *,
        theme: str,
        context: str,
        content: str,
        user_id: int | None = None,
        essay_id: int | None = None,
        job_id: str | None = None,
    ) -> EssayCorrectionResult:
        safe_theme = sanitize_ai_text(theme, max_chars=500)
        safe_context = sanitize_ai_text(context, max_chars=5000)
        safe_content = guarded_student_text(content, max_chars=20000)
        session_id = f"essay:{essay_id}" if essay_id is not None else None

        # Trace raiz Langfuse: um trace por correção, com os 5 agentes como spans-filhos.
        trace_stack, parent_ctx = self._start_trace(user_id=user_id, session_id=session_id, essay_id=essay_id)
        with trace_stack:
            try:
                return self._run_pipeline(
                    safe_theme=safe_theme,
                    safe_context=safe_context,
                    safe_content=safe_content,
                    session_id=session_id,
                    user_id=user_id,
                    job_id=job_id,
                    parent_ctx=parent_ctx,
                )
            finally:
                flush_ai_telemetry()

    def _run_pipeline(
        self,
        *,
        safe_theme: str,
        safe_context: str,
        safe_content: str,
        session_id: str | None,
        user_id: int | None,
        job_id: str | None,
        parent_ctx,
    ) -> EssayCorrectionResult:
        # ThesisAgent, GrammarAgent e RepertoireAgent são independentes — rodam em paralelo.
        # _bind_ctx propaga o contexto OTel do trace raiz para os threads, mantendo o
        # aninhamento dos spans (best practice: hierarquia de spans).
        with ThreadPoolExecutor(max_workers=3) as pool:
            t_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.thesis_agent.analyze(theme=safe_theme, content=safe_content, user_id=user_id, session_id=session_id)))
            g_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.grammar_agent.analyze(content=safe_content, user_id=user_id, session_id=session_id)))
            r_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.repertoire_agent.analyze(theme=safe_theme, content=safe_content, user_id=user_id, session_id=session_id)))
            wait([t_fut, g_fut, r_fut])

        thesis, t_ms, t_status, t_err = t_fut.result()
        grammar, g_ms, g_status, g_err = g_fut.result()
        repertoire, r_ms, r_status, r_err = r_fut.result()

        # Log paralelos do thread principal (SQLAlchemy Session não é thread-safe).
        for name, ms, status, err, runner in [
            ("ThesisAgent", t_ms, t_status, t_err, self.thesis_agent.runner),
            ("GrammarAgent", g_ms, g_status, g_err, self.grammar_agent.runner),
            ("RepertoireAgent", r_ms, r_status, r_err, self.repertoire_agent.runner),
        ]:
            self._log(agent=name, status=status, latency_ms=ms, user_id=user_id, job_id=job_id, prompt=safe_content, error=err, runner=runner)

        competencies = self._step(
            "ENEMCompetencyAgent",
            lambda: self.enem_agent.evaluate(
                theme=safe_theme,
                content=safe_content,
                thesis=thesis,
                grammar=grammar,
                repertoire=repertoire,
                user_id=user_id,
                session_id=session_id,
            ),
            runner=self.enem_agent.runner,
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        correction = self._step(
            "EssayCorrectionAgent",
            lambda: self.correction_agent.consolidate(
                theme=safe_theme,
                context=safe_context,
                content=safe_content,
                thesis=thesis,
                grammar=grammar,
                repertoire=repertoire,
                competencies=competencies,
                user_id=user_id,
                session_id=session_id,
            ),
            runner=self.correction_agent.runner,
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        if self.db is not None and user_id is not None:
            update_learning_profile(self.db, user_id=user_id, correction=correction)
        return correction

    def _start_trace(self, *, user_id: int | None, session_id: str | None, essay_id: int | None) -> tuple[ExitStack, object]:
        """Abre o span raiz do trace e devolve o contexto OTel para propagar aos threads.
        No-op silencioso quando o tracing está desligado."""
        stack = ExitStack()
        client = get_ai_telemetry_client()
        if client is None:
            return stack, otel_context.get_current()
        try:
            from langfuse import propagate_attributes

            propagation: dict[str, object] = {"trace_name": self.workflow_name}
            if user_id is not None:
                propagation["user_id"] = str(user_id)
            if session_id:
                propagation["session_id"] = session_id
            stack.enter_context(propagate_attributes(**propagation))
            stack.enter_context(
                client.start_as_current_observation(
                    as_type="span",
                    name=self.workflow_name,
                    metadata={"workflow": self.workflow_name, "essay_id": essay_id},
                )
            )
        except Exception:  # pragma: no cover - telemetria nunca bloqueia a correção
            stack.close()
            return ExitStack(), otel_context.get_current()
        return stack, otel_context.get_current()

    @staticmethod
    def _bind_ctx(parent_ctx: object, run: Callable[[], T]) -> Callable[[], T]:
        """Anexa o contexto OTel do trace raiz dentro do thread worker."""

        def runner() -> T:
            token = otel_context.attach(parent_ctx)
            try:
                return run()
            finally:
                otel_context.detach(token)

        return runner

    def _timed_call(self, run: Callable[[], T]) -> tuple[T, int, str, str | None]:
        start = time.perf_counter()
        status = "success"
        error: str | None = None
        try:
            result = run()
        except Exception as exc:
            status = "error"
            error = str(exc)
            raise
        finally:
            latency_ms = int((time.perf_counter() - start) * 1000)
        return result, latency_ms, status, error  # type: ignore[return-value]

    def _step(
        self,
        agent: str,
        run: Callable[[], T],
        *,
        user_id: int | None,
        job_id: str | None,
        prompt: str,
        runner: AgnoAgentRunner | None = None,
    ) -> T:
        start = time.perf_counter()
        status = "success"
        error = None
        try:
            return run()
        except Exception as exc:
            status = "error"
            error = str(exc)
            raise
        finally:
            latency_ms = int((time.perf_counter() - start) * 1000)
            self._log(agent=agent, status=status, latency_ms=latency_ms, user_id=user_id, job_id=job_id, prompt=prompt, error=error, runner=runner)

    def _log(
        self,
        *,
        agent: str,
        status: str,
        latency_ms: int,
        user_id: int | None,
        job_id: str | None,
        prompt: str,
        error: str | None,
        runner: AgnoAgentRunner | None = None,
    ) -> None:
        if self.db is None:
            return
        try:
            log = build_interaction_log(
                workflow=self.workflow_name,
                agent=agent,
                user_id=user_id,
                job_id=job_id,
                runner=runner,
                prompt=prompt,
                status=status,
                latency_ms=latency_ms,
                error=error,
            )
        except Exception:
            return
        # Telemetria é não-crítica: SAVEPOINT isola um INSERT ruim do commit da correção.
        safe_persist_interaction(self.db, log)

