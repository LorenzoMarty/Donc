from __future__ import annotations

import logging
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
from src.agents.schemas import (
    ArgumentationAnalysisV2,
    EliminationGateOutput,
    EssayCorrectionResult,
    GrammarAnalysisV2,
    InterventionAnalysisV2,
    InterventionElements,
    PipelineAnalyses,
    PreProcessorOutput,
    RepertoireAnalysisV2,
    ThemeAnalysisV2,
    ThesisAnalysisV2,
)
from src.agents.score_auditor import ScoreAuditor
from src.agents.theme_analyzer import ThemeAnalyzerAgent
from src.agents.thesis_v2 import ThesisAnalyzerAgent
from src.memory import update_learning_profile
from src.services.ai_telemetry import build_interaction_log, safe_persist_interaction
from src.telemetry import flush_ai_telemetry, get_ai_telemetry_client
from src.utils.ai_security import guarded_student_text, sanitize_ai_text


T = TypeVar("T")
logger = logging.getLogger("src.workflows.correction")

# Usado quando um analisador quebra por bug de codigo (nao falha de API — essa ja tem fallback
# heuristico interno em AgnoAgentRunner e nunca propaga). Degrada só a competencia afetada pra
# nota zero em vez de abortar a correcao inteira e desperdicar as chamadas que ja tiveram sucesso.
_DEGRADED_DEFAULTS: dict[str, Callable[[], object]] = {
    "ThemeAnalyzerAgent": lambda: ThemeAnalysisV2(theme_alignment=0, tangenciamento=True, severity="high"),
    "ThesisAnalyzerAgent": lambda: ThesisAnalysisV2(thesis_present=False, clarity="absent", score=0),
    "RepertoireAnalyzerV2Agent": lambda: RepertoireAnalysisV2(quality="INVALIDO", score=0),
    "ArgumentationAnalyzerAgent": lambda: ArgumentationAnalysisV2(overall_score=0),
    "InterventionAnalyzerAgent": lambda: InterventionAnalysisV2(elements=InterventionElements(), completeness_score=0, absent=True),
    "GrammarAnalyzerV2Agent": lambda: GrammarAnalysisV2(orthography_score=0, cohesion_score=0, formality_score=0),
}


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
            essay_id=essay_id,
        )
        if gate.status in ("ZERO", "DESVIO_GRAVE"):
            return self.mapper.map(
                self._zero_analyses(pre, gate),
                {"c1": 0, "c2": 0, "c3": 0, "c4": 0, "c5": 0},
                used_fallback=self.gate_agent.runner.last_used_fallback,
            )

        # Stage 3: 6 analyzers in parallel (all independent — theme + content only)
        with ThreadPoolExecutor(max_workers=6) as pool:
            th_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.theme_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            ts_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.thesis_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            rp_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.repertoire_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            ar_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.arg_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            iv_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.intervention_agent.analyze(safe_theme, safe_content, user_id=user_id, session_id=session_id)))
            gr_fut = pool.submit(self._timed_call, self._bind_ctx(parent_ctx, lambda: self.grammar_agent.analyze(safe_content, user_id=user_id, session_id=session_id)))
            wait([th_fut, ts_fut, rp_fut, ar_fut, iv_fut, gr_fut])

        # Unpack + log telemetry from main thread (SQLAlchemy Session not thread-safe).
        # Each future is logged individually as soon as its result is unpacked, so a failure in
        # one analyzer doesn't discard the (already-billed) telemetry of analyzers that succeeded.
        futures: list[tuple[str, object, AgnoAgentRunner | None]] = [
            ("ThemeAnalyzerAgent", th_fut, self.theme_agent.runner),
            ("ThesisAnalyzerAgent", ts_fut, self.thesis_agent.runner),
            ("RepertoireAnalyzerV2Agent", rp_fut, self.repertoire_agent.runner),
            ("ArgumentationAnalyzerAgent", ar_fut, self.arg_agent.runner),
            ("InterventionAnalyzerAgent", iv_fut, self.intervention_agent.runner),
            ("GrammarAnalyzerV2Agent", gr_fut, self.grammar_agent.runner),
        ]
        results: dict[str, object] = {}
        # True se o gate ou qualquer analisador caiu em heuristica (sem API key, falha apos todas
        # as tentativas, JSON invalido) ou quebrou com bug de codigo (degradado pra nota zero) —
        # nos dois casos a competencia nao reflete analise real da IA (ver EssayCorrectionResult.used_fallback).
        any_fallback = self.gate_agent.runner.last_used_fallback
        for name, fut, runner in futures:
            try:
                result, ms, status, err = fut.result()
            except Exception as exc:
                # Bug de codigo no proprio agente (nao falha de API — essa nunca chega aqui, ver
                # AgnoAgentRunner.run_structured). Degrada so essa competencia em vez de abortar a
                # correcao inteira e jogar fora as chamadas que ja tiveram sucesso.
                logger.warning("Analisador %s quebrou com excecao nao tratada — degradando para nota zero nessa competencia: %s", name, exc)
                self._log(agent=name, status="error", latency_ms=0, user_id=user_id, job_id=job_id, prompt=safe_content, error=str(exc), runner=runner, essay_id=essay_id)
                results[name] = _DEGRADED_DEFAULTS[name]()
                any_fallback = True
                continue
            self._log(agent=name, status=status, latency_ms=ms, user_id=user_id, job_id=job_id, prompt=safe_content, error=err, runner=runner, essay_id=essay_id)
            if runner is not None and runner.last_used_fallback:
                any_fallback = True
            results[name] = result

        analyses = PipelineAnalyses(
            preprocessor=pre,
            gate=gate,
            theme=results["ThemeAnalyzerAgent"],
            thesis=results["ThesisAnalyzerAgent"],
            repertoire=results["RepertoireAnalyzerV2Agent"],
            argumentation=results["ArgumentationAnalyzerAgent"],
            intervention=results["InterventionAnalyzerAgent"],
            grammar=results["GrammarAnalyzerV2Agent"],
        )

        # Stage 4: CompetencyScorer (Python)
        raw_scores = self.scorer.score(analyses)

        # Stage 5: ScoreAuditor (Python — only reduces, never raises)
        audited = self.auditor.audit(raw_scores, analyses)

        # Stage 6: OutputMapper (Python → EssayCorrectionResult)
        correction = self.mapper.map(analyses, audited, used_fallback=any_fallback)

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
        essay_id: int | None = None,
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
            self._log(
                agent=agent, status=status, latency_ms=latency_ms, user_id=user_id, job_id=job_id,
                prompt=prompt, error=error, runner=runner, essay_id=essay_id,
            )

    @staticmethod
    def _zero_analyses(pre: PreProcessorOutput, gate: EliminationGateOutput) -> PipelineAnalyses:
        return PipelineAnalyses(
            preprocessor=pre,
            gate=gate,
            theme=_DEGRADED_DEFAULTS["ThemeAnalyzerAgent"](),
            thesis=_DEGRADED_DEFAULTS["ThesisAnalyzerAgent"](),
            repertoire=_DEGRADED_DEFAULTS["RepertoireAnalyzerV2Agent"](),
            argumentation=_DEGRADED_DEFAULTS["ArgumentationAnalyzerAgent"](),
            intervention=_DEGRADED_DEFAULTS["InterventionAnalyzerAgent"](),
            grammar=_DEGRADED_DEFAULTS["GrammarAnalyzerV2Agent"](),
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
        essay_id: int | None = None,
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
                content_id=essay_id,
                content_type="essay" if essay_id is not None else None,
            )
        except Exception:
            logger.warning("Falha ao montar log de telemetria de IA (agent=%s) — sem rastro registrado.", agent, exc_info=True)
            return
        safe_persist_interaction(self.db, log)
