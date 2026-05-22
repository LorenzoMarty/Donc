from __future__ import annotations

import hashlib
import time
from collections.abc import Callable
from typing import TypeVar

from sqlalchemy.orm import Session

from app.agents.correction import EssayCorrectionAgent
from app.agents.enem import ENEMCompetencyAgent
from app.agents.grammar import GrammarAgent
from app.agents.repertoire import RepertoireAgent
from app.agents.schemas import EssayCorrectionResult
from app.agents.thesis import ThesisAgent
from app.memory import update_learning_profile
from app.models import AIInteractionLog
from app.utils.ai_security import guarded_student_text, sanitize_ai_text


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

        thesis = self._step(
            "ThesisAgent",
            lambda: self.thesis_agent.analyze(theme=safe_theme, content=safe_content, user_id=user_id, session_id=session_id),
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        grammar = self._step(
            "GrammarAgent",
            lambda: self.grammar_agent.analyze(content=safe_content, user_id=user_id, session_id=session_id),
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        repertoire = self._step(
            "RepertoireAgent",
            lambda: self.repertoire_agent.analyze(theme=safe_theme, content=safe_content, user_id=user_id, session_id=session_id),
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
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
            user_id=user_id,
            job_id=job_id,
            prompt=safe_content,
        )
        if self.db is not None and user_id is not None:
            update_learning_profile(self.db, user_id=user_id, correction=correction)
        return correction

    def _step(
        self,
        agent: str,
        run: Callable[[], T],
        *,
        user_id: int | None,
        job_id: str | None,
        prompt: str,
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
            self._log(agent=agent, status=status, latency_ms=latency_ms, user_id=user_id, job_id=job_id, prompt=prompt, error=error)

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
    ) -> None:
        if self.db is None:
            return
        self.db.add(
            AIInteractionLog(
                user_id=user_id,
                job_id=job_id,
                workflow=self.workflow_name,
                agent=agent,
                status=status,
                latency_ms=latency_ms,
                token_count=0,
                cost_estimate=0,
                prompt_hash=hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
                error=error,
            )
        )

