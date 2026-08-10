from __future__ import annotations

import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, wait
from contextlib import ExitStack
from typing import TypeVar

from opentelemetry import context as otel_context
from sqlalchemy.orm import Session

from src.agents.argumentation import ArgumentationAnalyzerAgent
from src.agents.base import AgnoAgentRunner
from src.agents.competency_scorer import CompetencyScorer
from src.agents.elimination_gate import EliminationGateAgent
from src.agents.grammar_v2 import GrammarAnalyzerV2Agent
from src.agents.intervention import InterventionAnalyzerAgent
from src.agents.output_mapper import OutputMapper
from src.agents.preprocessor import PreProcessor
from src.agents.repertoire_v2 import RepertoireAnalyzerV2Agent
from src.agents.schemas import EliminationGateOutput, EssayCorrectionResult, PipelineAnalyses, PreProcessorOutput
from src.agents.score_auditor import ScoreAuditor
from src.agents.theme_analyzer import ThemeAnalyzerAgent
from src.agents.thesis_v2 import ThesisAnalyzerAgent
from src.memory import update_learning_profile
from src.services.ai_telemetry import build_interaction_log, safe_persist_interaction
from src.telemetry import flush_ai_telemetry, get_ai_telemetry_client
from src.utils.ai_security import guarded_student_text, sanitize_ai_text


T = TypeVar("T")


class CorrectionOrchestratorWorkflow:
    workflow_name = "essay_correction"

    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        # Shared runner — all LLM agents use the same AgnoAgentRunner instance
        runner = AgnoAgentRunner()
        # Python pure
        self.preprocessor = PreProcessor()
        self.scorer = CompetencyScorer()
        self.auditor = ScoreAuditor()
        self.mapper = OutputMapper()
        # LLM agents
        self.gate_agent = EliminationGateAgent(runner)
        self.theme_agent = ThemeAnalyzerAgent(runner)
        self.thesis_agent = ThesisAnalyzerAgent(runner)
        self.repertoire_agent = RepertoireAnalyzerV2Agent(runner)
        self.arg_agent = ArgumentationAnalyzerAgent(runner)
        self.intervention_agent = InterventionAnalyzerAgent(runner)
        self.grammar_agent = GrammarAnalyzerV2Agent(runner)

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
        safe_content = guarded_student_text(content, max_chars=20000)
        session_id = f"essay:{essay_id}" if essay_id is not None else None

        trace_stack, parent_ctx = self._start_trace(user_id=user_id, session_id=session_id, essay_id=essay_id)
        with trace_stack:
            try:
                return self._run_pipeline(
                    safe_theme=safe_theme,
                    safe_content=safe_content,
                    session_id=session_id,
                    user_id=user_id,
                    essay_id=essay_id,
                    job_id=job_id,
                    parent_ctx=parent_ctx,
                )
            finally:
                flush_ai_telemetry()

    def _run_pipeline(
        self,
        *,
        safe_theme: str,
        safe_content: str,
        session_id: str | None,
        user_id: int | None,
        essay_id: int | None = None,
        job_id: str | None,
        parent_ctx: object,
    ) -> EssayCorrectionResult:
        # Stage 1: PreProcessor (Python, instant)
        pre = self.preprocessor.process(safe_content)

        # Stage 2: EliminationGate (LLM) — early stop on ZERO
        gate = self._step(
            "EliminationGateAgent",
            self._bind_ctx(parent_ctx, lambda: self.gate_agent.evaluate(safe_theme, safe_content, pre, user_id=user_id, session_id=session_id)),
            runner=self.gate_agent.runner,
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        if gate.status == "ZERO":
            return self.mapper.map(self._zero_analyses(pre, gate), {"c1": 0, "c2": 0, "c3": 0, "c4": 0, "c5": 0})

        # Stage 3: 6 analyzers in parallel (all independent — theme + content only)
        with ThreadPoolExecutor(max_workers=6) as pool:
            th_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.theme_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            ts_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.thesis_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            rp_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.repertoire_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            ar_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.arg_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            iv_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.intervention_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            gr_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.grammar_agent.analyze(safe_content, user_id=user_id, session_id=session_id)))
            wait([th_fut, ts_fut, rp_fut, ar_fut, iv_fut, gr_fut])

        theme_a, th_ms, th_st, th_err = th_fut.result()
        thesis_a, ts_ms, ts_st, ts_err = ts_fut.result()
        rep_a, rp_ms, rp_st, rp_err = rp_fut.result()
        arg_a, ar_ms, ar_st, ar_err = ar_fut.result()
        iv_a, iv_ms, iv_st, iv_err = iv_fut.result()
        grammar_a, gr_ms, gr_st, gr_err = gr_fut.result()

        # Log telemetry from main thread (SQLAlchemy Session not thread-safe)
        for name, ms, status, err, runner in [
            ("ThemeAnalyzerAgent", th_ms, th_st, th_err, self.theme_agent.runner),
            ("ThesisAnalyzerAgent", ts_ms, ts_st, ts_err, self.thesis_agent.runner),
            ("RepertoireAnalyzerV2Agent", rp_ms, rp_st, rp_err, self.repertoire_agent.runner),
            ("ArgumentationAnalyzerAgent", ar_ms, ar_st, ar_err, self.arg_agent.runner),
            ("InterventionAnalyzerAgent", iv_ms, iv_st, iv_err, self.intervention_agent.runner),
            ("GrammarAnalyzerV2Agent", gr_ms, gr_st, gr_err, self.grammar_agent.runner),
        ]:
            self._log(agent=name, status=status, latency_ms=ms, user_id=user_id, job_id=job_id, prompt=safe_content, error=err, runner=runner)

        analyses = PipelineAnalyses(
            preprocessor=pre,
            gate=gate,
            theme=theme_a,
            thesis=thesis_a,
            repertoire=rep_a,
            argumentation=arg_a,
            intervention=iv_a,
            grammar=grammar_a,
        )

        # Stage 4: CompetencyScorer (Python)
        raw_scores = self.scorer.score(analyses)

        # Stage 5: ScoreAuditor (Python — only reduces, never raises)
        audited = self.auditor.audit(raw_scores, analyses)

        # Stage 6: OutputMapper (Python → EssayCorrectionResult)
        correction = self.mapper.map(analyses, audited)

        if self.db is not None and user_id is not None:
            update_learning_profile(self.db, user_id=user_id, correction=correction, essay_id=essay_id)

        return correction

    def _start_trace(self, *, user_id: int | None, session_id: str | None, essay_id: int | None) -> tuple[ExitStack, object]:
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
        except Exception:  # pragma: no cover
            stack.close()
            return ExitStack(), otel_context.get_current()
        return stack, otel_context.get_current()

    @staticmethod
    def _bind_ctx(parent_ctx: object, run: Callable[[], T]) -> Callable[[], T]:
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

    @staticmethod
    def _zero_analyses(pre: PreProcessorOutput, gate: EliminationGateOutput) -> PipelineAnalyses:
        from src.agents.schemas import (
            ArgumentationAnalysisV2,
            GrammarAnalysisV2,
            InterventionAnalysisV2,
            InterventionElements,
            RepertoireAnalysisV2,
            ThemeAnalysisV2,
            ThesisAnalysisV2,
        )
        return PipelineAnalyses(
            preprocessor=pre,
            gate=gate,
            theme=ThemeAnalysisV2(theme_alignment=0, tangenciamento=True, severity="high"),
            thesis=ThesisAnalysisV2(thesis_present=False, clarity="absent", score=0),
            repertoire=RepertoireAnalysisV2(quality="INVALIDO", score=0),
            argumentation=ArgumentationAnalysisV2(overall_score=0),
            intervention=InterventionAnalysisV2(elements=InterventionElements(), completeness_score=0, absent=True),
            grammar=GrammarAnalysisV2(orthography_score=0, cohesion_score=0, formality_score=0),
        )

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
        safe_persist_interaction(self.db, log)
