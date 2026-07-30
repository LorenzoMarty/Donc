import re
from collections import Counter
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from src.agents.theme_generator import ThemeGeneratorAgent
from src.middlewares.errors import AppError
from src.models import Essay, EssayCorrection, EssayStatus, EssayTheme, EssayVersion, EssayVersionCorrection, User
from src.repositories.essays import EssayRepository
from src.schemas.essays import EssayEvolutionPoint, EssayHistoryResponse
from src.services.ai_telemetry import record_ai_interaction
from src.services.ai_service import EssayAIService


class EssayService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = EssayRepository(db)
        self.ai = EssayAIService(db)

    def list_themes(self):
        return self.repo.list_themes()

    def list_random_themes(self, *, limit: int = 4):
        themes = self.repo.list_random_themes(limit=limit)
        if len(themes) < limit:
            raise AppError(
                "Cadastre pelo menos 4 temas ativos para liberar o sorteio.",
                status_code=409,
                code="insufficient_themes",
            )
        return themes

    def generate_theme(self, *, user_id: int, focus: str | None = None) -> EssayTheme:
        return self.generate_themes(user_id=user_id, focus=focus)[0]

    def generate_themes(self, *, user_id: int, focus: str | None = None) -> list[EssayTheme]:
        existing_titles = [theme.title for theme in self.repo.list_themes()]
        agent = ThemeGeneratorAgent()
        result = agent.generate_batch(
            focus=focus,
            existing_titles=existing_titles,
            user_id=user_id,
            session_id=f"user:{user_id}:theme-generator",
        )
        themes = [
            EssayTheme(
                title=item.title,
                context=item.context,
                source="IA Donc ENEM",
                supporting_texts=[supporting_text.model_dump() for supporting_text in item.supporting_texts],
                is_active=True,
            )
            for item in result.themes
        ]
        self.db.add_all(themes)
        record_ai_interaction(
            self.db,
            workflow="essay_theme_generation",
            agent="ThemeGeneratorAgent",
            user_id=user_id,
            runner=agent.runner,
            meta={"focus": focus, "generated_count": len(themes)},
        )
        self.db.commit()
        for theme in themes:
            self.db.refresh(theme)
        return themes

    def create(self, *, user_id: int, theme_id: int, title: str, content: str = "") -> Essay:
        theme = self.repo.get_theme(theme_id)
        if not theme:
            raise AppError("Tema de redacao nao encontrado.", status_code=404, code="theme_not_found")
        if not content.strip():
            raise AppError("Rascunhos vazios nao sao salvos.", status_code=422, code="empty_draft")
        essay = Essay(
            user_id=user_id,
            theme_id=theme_id,
            title=title,
            content=content,
            word_count=self._word_count(content),
            line_count=self._line_count(content),
            paragraph_count=self._paragraph_count(content),
        )
        self.db.add(essay)
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def get(self, *, essay_id: int, user_id: int) -> Essay:
        essay = self.repo.get_essay(essay_id, user_id)
        if not essay:
            raise AppError("Redacao nao encontrada.", status_code=404, code="essay_not_found")
        self._ensure_initial_version(essay)
        return self.repo.get_essay(essay_id, user_id) or essay

    def autosave(self, *, essay_id: int, user_id: int, title: str, content: str) -> Essay:
        essay = self.repo.get_essay(essay_id, user_id)
        if not essay:
            raise AppError("Redacao nao encontrada.", status_code=404, code="essay_not_found")
        if essay.status == EssayStatus.CORRECTED:
            raise AppError("Redacoes corrigidas nao podem ser editadas.", status_code=409, code="essay_locked")
        if not content.strip():
            raise AppError("Rascunhos vazios nao sao salvos.", status_code=422, code="empty_draft")
        essay.title = title
        essay.content = content
        essay.word_count = self._word_count(content)
        essay.line_count = self._line_count(content)
        essay.paragraph_count = self._paragraph_count(content)
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def submit_for_correction(self, *, essay_id: int, user: User, job_id: str | None = None) -> Essay:
        essay = self.repo.get_essay(essay_id, user.id)
        if not essay:
            raise AppError("Redacao nao encontrada.", status_code=404, code="essay_not_found")
        if essay.word_count < 80:
            raise AppError("A redacao ainda esta curta para correcao. Desenvolva melhor a tese antes de enviar.", status_code=422, code="essay_too_short")
        self._ensure_initial_version(essay)
        essay = self.repo.get_essay(essay_id, user.id) or essay
        self._require_edit_before_new_correction(essay)

        return self._apply_correction(essay=essay, user=user, job_id=job_id)

    def duplicate(self, *, essay_id: int, user_id: int) -> Essay:
        essay = self.get(essay_id=essay_id, user_id=user_id)
        draft = Essay(
            user_id=user_id,
            theme_id=essay.theme_id,
            title=self._unique_copy_title(user_id=user_id, title=f"{essay.title} copia"),
            content=essay.content,
            word_count=essay.word_count,
            line_count=essay.line_count,
            paragraph_count=essay.paragraph_count,
            status=EssayStatus.DRAFT,
        )
        self.db.add(draft)
        self.db.commit()
        return self.repo.get_essay(draft.id, user_id)  # type: ignore[return-value]

    def new_version(self, *, essay_id: int, user_id: int) -> Essay:
        essay = self.get(essay_id=essay_id, user_id=user_id)
        latest_version = self._latest_version(essay)
        if latest_version:
            essay.title = self._version_base_title(latest_version.title)
            essay.content = latest_version.content
            essay.word_count = latest_version.word_count
            essay.line_count = latest_version.line_count
            essay.paragraph_count = latest_version.paragraph_count
        essay.status = EssayStatus.DRAFT
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def rewrite_from_version(self, *, essay_id: int, version_id: int, user_id: int) -> Essay:
        essay = self.get(essay_id=essay_id, user_id=user_id)
        version = next((item for item in essay.versions if item.id == version_id), None)
        if not version:
            raise AppError("Versao nao encontrada.", status_code=404, code="version_not_found")
        essay.title = self._version_base_title(version.title)
        essay.content = version.content
        essay.status = EssayStatus.DRAFT
        essay.word_count = version.word_count
        essay.line_count = version.line_count
        essay.paragraph_count = version.paragraph_count
        self.db.commit()
        return self.repo.get_essay(essay.id, user_id)  # type: ignore[return-value]

    def delete(self, *, essay_id: int, user_id: int) -> None:
        essay = self.get(essay_id=essay_id, user_id=user_id)
        self.db.delete(essay)
        self.db.commit()

    def reprocess(self, *, essay_id: int, user: User, job_id: str | None = None) -> Essay:
        return self.submit_for_correction(essay_id=essay_id, user=user, job_id=job_id)

    def _apply_correction(self, *, essay: Essay, user: User, job_id: str | None = None) -> Essay:
        result = self.ai.correct(
            theme=essay.theme.title,
            context=essay.theme.context,
            content=essay.content,
            user_id=user.id,
            essay_id=essay.id,
            job_id=job_id,
        )
        submitted_at = datetime.now(UTC)
        version = EssayVersion(
            essay_id=essay.id,
            version_number=self._next_version_number_for_essay(essay),
            title=self._version_base_title(essay.title),
            content=essay.content,
            status=EssayStatus.CORRECTED.value,
            word_count=self._word_count(essay.content),
            line_count=self._line_count(essay.content),
            paragraph_count=self._paragraph_count(essay.content),
            score=result.total_score,
            submitted_at=submitted_at,
        )
        self.db.add(version)
        essay.versions.append(version)
        self.db.flush()
        annotations_payload = [a.model_dump() for a in result.inline_annotations] if result.inline_annotations else None
        self.db.add(
            EssayVersionCorrection(
                version_id=version.id,
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
                inline_annotations=annotations_payload,
                created_at=submitted_at,
            )
        )
        correction = essay.correction or EssayCorrection(essay_id=essay.id)
        correction.total_score = result.total_score
        correction.competency_1 = result.competency_1
        correction.competency_2 = result.competency_2
        correction.competency_3 = result.competency_3
        correction.competency_4 = result.competency_4
        correction.competency_5 = result.competency_5
        correction.strengths = result.strengths
        correction.errors = result.errors
        correction.suggestions = result.suggestions
        correction.feedback = result.feedback
        correction.recurrent_patterns = result.recurrent_patterns
        correction.inline_annotations = annotations_payload
        correction.created_at = submitted_at
        essay.status = EssayStatus.CORRECTED
        essay.score = result.total_score
        essay.word_count = self._word_count(essay.content)
        essay.line_count = self._line_count(essay.content)
        essay.paragraph_count = self._paragraph_count(essay.content)
        essay.submitted_at = submitted_at
        if not correction.id:
            self.db.add(correction)
        self.db.commit()
        return self.repo.get_essay(essay.id, user.id)  # type: ignore[return-value]

    def history(self, user_id: int) -> EssayHistoryResponse:
        essays = [essay for essay in self.repo.list_by_user(user_id) if essay.status != EssayStatus.DRAFT or essay.content.strip()]
        for essay in essays:
            self._ensure_initial_version(essay)
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
        corrected_versions = sorted(
            [version for essay in essays for version in essay.versions if version.correction],
            key=lambda version: version.submitted_at or version.created_at,
        )
        evolution = [
            EssayEvolutionPoint(
                label=f"V{version.version_number}",
                score=version.correction.total_score,
                c1=version.correction.competency_1,
                c2=version.correction.competency_2,
                c3=version.correction.competency_3,
                c4=version.correction.competency_4,
                c5=version.correction.competency_5,
            )
            for version in corrected_versions[-8:]
        ]
        return EssayHistoryResponse(
            essays=essays,
            average_score=average,
            weakest_competency=weakest,
            recurrent_errors=[item for item, _ in errors.most_common(5)],
            evolution=evolution,
        )

    def _ensure_initial_version(self, essay: Essay) -> None:
        if essay.versions or not essay.content.strip() or not essay.correction:
            return
        version = EssayVersion(
            essay_id=essay.id,
            version_number=self._version_number(essay.title),
            title=self._version_base_title(essay.title),
            content=essay.content,
            status=essay.status.value if isinstance(essay.status, EssayStatus) else str(essay.status),
            word_count=essay.word_count,
            line_count=essay.line_count,
            paragraph_count=essay.paragraph_count or self._paragraph_count(essay.content),
            score=essay.score,
            created_at=essay.created_at,
            updated_at=essay.updated_at,
            submitted_at=essay.submitted_at,
        )
        self.db.add(version)
        self.db.flush()
        if essay.correction:
            self.db.add(
                EssayVersionCorrection(
                    version_id=version.id,
                    total_score=essay.correction.total_score,
                    competency_1=essay.correction.competency_1,
                    competency_2=essay.correction.competency_2,
                    competency_3=essay.correction.competency_3,
                    competency_4=essay.correction.competency_4,
                    competency_5=essay.correction.competency_5,
                    strengths=essay.correction.strengths,
                    errors=essay.correction.errors,
                    suggestions=essay.correction.suggestions,
                    feedback=essay.correction.feedback,
                    recurrent_patterns=essay.correction.recurrent_patterns,
                    inline_annotations=essay.correction.inline_annotations,
                    created_at=essay.correction.created_at,
                )
            )
        self.db.commit()

    def _require_edit_before_new_correction(self, essay: Essay) -> None:
        latest = self._latest_corrected_version(essay)
        if not latest:
            return
        if self._normalize_content(latest.content) == self._normalize_content(essay.content):
            raise AppError(
                "Faca uma edicao no texto antes de corrigir novamente.",
                status_code=422,
                code="edit_required",
            )

    def _latest_version(self, essay: Essay) -> EssayVersion | None:
        versions = sorted(essay.versions, key=lambda version: version.version_number)
        return versions[-1] if versions else None

    def _latest_corrected_version(self, essay: Essay) -> EssayVersion | None:
        versions = [version for version in essay.versions if version.correction]
        versions.sort(key=lambda version: version.version_number)
        return versions[-1] if versions else None

    def _next_version_number_for_essay(self, essay: Essay) -> int:
        return max((version.version_number for version in essay.versions), default=0) + 1

    def _normalize_content(self, content: str) -> str:
        return re.sub(r"\s+", " ", content).strip()

    def _word_count(self, content: str) -> int:
        return len(re.findall(r"\b\w+(?:[-']\w+)*\b", content, flags=re.UNICODE))

    def _line_count(self, content: str) -> int:
        physical_lines = len([line for line in content.splitlines() if line.strip()])
        visual_lines = max(1, len(content) // 92)
        return max(physical_lines, visual_lines)

    def _paragraph_count(self, content: str) -> int:
        stripped = content.strip()
        if not stripped:
            return 0
        if re.search(r"\n\s*\n", stripped):
            return len([paragraph for paragraph in re.split(r"\n\s*\n+", stripped) if paragraph.strip()])
        return len([line for line in stripped.splitlines() if line.strip()])

    def _version_base_title(self, title: str) -> str:
        return re.sub(r"\s+V\d+$", "", title.strip(), flags=re.IGNORECASE) or "Redacao"

    def _version_number(self, title: str) -> int:
        match = re.search(r"\s+V(\d+)$", title.strip(), flags=re.IGNORECASE)
        return int(match.group(1)) if match else 1

    def _next_version_number(self, *, user_id: int, theme_id: int, base_title: str) -> int:
        essays = self.repo.list_by_user(user_id)
        versions = [
            self._version_number(essay.title)
            for essay in essays
            if essay.theme_id == theme_id and self._version_base_title(essay.title).lower() == base_title.lower()
        ]
        return max(versions or [1]) + 1

    def _unique_copy_title(self, *, user_id: int, title: str) -> str:
        essays = self.repo.list_by_user(user_id)
        existing = {essay.title.lower() for essay in essays}
        base = title[:210].strip() or "Redacao copia"
        if base.lower() not in existing:
            return base
        suffix = 2
        while f"{base} {suffix}".lower() in existing:
            suffix += 1
        return f"{base[:205]} {suffix}"
