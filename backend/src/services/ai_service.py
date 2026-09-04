from __future__ import annotations

from sqlalchemy.orm import Session

from src.agents.correction import FallbackCorrectionProvider
from src.agents.schemas import EssayCorrectionResult
from src.services.ai_telemetry import record_ai_interaction
from src.workflows import CorrectionOrchestratorWorkflow


EssayAIResult = EssayCorrectionResult


class EssayAIService:
    def __init__(self, db: Session | None = None) -> None:
        self.db = db
        self.fallback = FallbackCorrectionProvider()

    def correct(
        self,
        *,
        theme: str,
        context: str,
        content: str,
        user_id: int | None = None,
        essay_id: int | None = None,
        job_id: str | None = None,
    ) -> EssayAIResult:
        try:
            return CorrectionOrchestratorWorkflow(self.db).correct(
                theme=theme,
                context=context,
                content=content,
                user_id=user_id,
                essay_id=essay_id,
                job_id=job_id,
            )
        except Exception as exc:
            result = self.fallback.correct(theme=theme, content=content)
            if self.db is not None:
                record_ai_interaction(
                    self.db,
                    workflow="essay_correction",
                    agent="FallbackCorrectionProvider",
                    user_id=user_id,
                    job_id=job_id,
                    prompt=content,
                    status="error",
                    error=str(exc),
                    meta={"essay_id": essay_id, "used_fallback": True},
                    content_id=essay_id,
                    content_type="essay" if essay_id is not None else None,
                )
            return result
