from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.correction import FallbackCorrectionProvider
from app.agents.schemas import EssayCorrectionResult
from app.workflows import CorrectionOrchestratorWorkflow


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
        except Exception:
            return self.fallback.correct(theme=theme, content=content)

