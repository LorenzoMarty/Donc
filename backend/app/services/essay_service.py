import re
from collections import Counter
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.middlewares.errors import AppError
from app.models import Essay, EssayCorrection, EssayStatus, User
from app.repositories.essays import EssayRepository
from app.schemas.essays import EssayEvolutionPoint, EssayHistoryResponse
from app.services.ai_service import EssayAIService


class EssayService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = EssayRepository(db)
        self.ai = EssayAIService()

    def list_themes(self):
        return self.repo.list_themes()

    def create(self, *, user_id: int, theme_id: int, title: str) -> Essay:
        theme = self.repo.get_theme(theme_id)
        if not theme:
            raise AppError("Tema de redacao nao encontrado.", status_code=404, code="theme_not_found")
        essay = Essay(user_id=user_id, theme_id=theme_id, title=title, content="")
        self.db.add(essay)
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def autosave(self, *, essay_id: int, user_id: int, title: str, content: str) -> Essay:
        essay = self.repo.get_essay(essay_id, user_id)
        if not essay:
            raise AppError("Redacao nao encontrada.", status_code=404, code="essay_not_found")
        if essay.status == EssayStatus.CORRECTED:
            raise AppError("Redacoes corrigidas nao podem ser editadas.", status_code=409, code="essay_locked")
        essay.title = title
        essay.content = content
        essay.word_count = self._word_count(content)
        essay.line_count = self._line_count(content)
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def submit_for_correction(self, *, essay_id: int, user: User) -> Essay:
        essay = self.repo.get_essay(essay_id, user.id)
        if not essay:
            raise AppError("Redacao nao encontrada.", status_code=404, code="essay_not_found")
        if essay.word_count < 80:
            raise AppError("A redacao precisa ter pelo menos 80 palavras para correcao.", status_code=422, code="essay_too_short")
        if essay.correction:
            return essay

        result = self.ai.correct(theme=essay.theme.title, context=essay.theme.context, content=essay.content)
        correction = EssayCorrection(
            essay_id=essay.id,
            total_score=result.total_score,
            competency_1=result.competency_1,
            competency_2=result.competency_2,
            competency_3=result.competency_3,
            competency_4=result.competency_4,
            competency_5=result.competency_5,
            strengths=result.strengths,
            errors=result.errors,
            suggestions=result.suggestions,
            feedback=result.feedback,
            recurrent_patterns=result.recurrent_patterns,
        )
        essay.status = EssayStatus.CORRECTED
        essay.score = result.total_score
        essay.submitted_at = datetime.now(UTC)
        user.xp += 120
        user.level = max(user.level, user.xp // 250 + 1)
        self.db.add(correction)
        self.db.commit()
        return self.repo.get_essay(essay.id, user.id)  # type: ignore[return-value]

    def history(self, user_id: int) -> EssayHistoryResponse:
        essays = self.repo.list_by_user(user_id)
        corrected = [essay for essay in essays if essay.correction]
        average = int(sum(essay.correction.total_score for essay in corrected) / len(corrected)) if corrected else 0
        competency_totals = {
            "Competencia 1": sum(e.correction.competency_1 for e in corrected) if corrected else 0,
            "Competencia 2": sum(e.correction.competency_2 for e in corrected) if corrected else 0,
            "Competencia 3": sum(e.correction.competency_3 for e in corrected) if corrected else 0,
            "Competencia 4": sum(e.correction.competency_4 for e in corrected) if corrected else 0,
            "Competencia 5": sum(e.correction.competency_5 for e in corrected) if corrected else 0,
        }
        weakest = min(competency_totals, key=competency_totals.get) if corrected else "Sem dados"
        errors = Counter(error for essay in corrected for error in essay.correction.recurrent_patterns)
        evolution = [
            EssayEvolutionPoint(
                label=essay.created_at.strftime("%d/%m"),
                score=essay.correction.total_score,
                c1=essay.correction.competency_1,
                c2=essay.correction.competency_2,
                c3=essay.correction.competency_3,
                c4=essay.correction.competency_4,
                c5=essay.correction.competency_5,
            )
            for essay in reversed(corrected[-8:])
        ]
        return EssayHistoryResponse(
            essays=essays,
            average_score=average,
            weakest_competency=weakest,
            recurrent_errors=[item for item, _ in errors.most_common(5)],
            evolution=evolution,
        )

    def _word_count(self, content: str) -> int:
        return len(re.findall(r"\b[\wÀ-ÿ'-]+\b", content))

    def _line_count(self, content: str) -> int:
        physical_lines = len([line for line in content.splitlines() if line.strip()])
        visual_lines = max(1, len(content) // 92)
        return max(physical_lines, visual_lines)

