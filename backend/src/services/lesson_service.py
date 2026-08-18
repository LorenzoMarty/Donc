from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.memory.recommendation_log import mark_completed
from src.middlewares.errors import AppError
from src.models import Lesson, LessonProgress, User
from src.repositories.learning import LearningRepository
from src.schemas.lessons import ExercisePreview, LessonProgressRead, LessonRead, ModuleActivityRead, ModuleItemRead, ModuleRead
from src.services.progression_service import ProgressionService


class LessonService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)
        self.progression = ProgressionService(db)

    def list_modules(self, user_id: int) -> list[ModuleRead]:
        modules = self.repo.list_modules()
        unlock_map = self.progression.unlock_map(modules, user_id)
        return [
            self._module_schema(module, user_id, unlock_map=unlock_map)
            for module in sorted(modules, key=lambda item: item.order)
        ]

    def get_lesson(self, lesson_id: int, user_id: int) -> LessonRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula não encontrada.", status_code=404, code="lesson_not_found")
        module = lesson.module
        unlock_map = self.progression.unlock_map(self.repo.list_modules(), user_id)
        if not unlock_map.get(module.id, True):
            raise AppError(
                "Este módulo ainda está bloqueado. Conclua o módulo anterior para liberar esta aula.",
                status_code=403,
                code="lesson_locked",
            )
        return self._lesson_schema(lesson, user_id, locked=False)

    def update_progress(
        self,
        lesson_id: int,
        user_id: int,
        *,
        progress_percent: int,
        last_position_seconds: int,
        completed: bool,
        recommendation_log_id: int | None = None,
    ) -> LessonProgressRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula não encontrada.", status_code=404, code="lesson_not_found")
        self._get_user(user_id)
        progress = self.repo.get_progress(user_id, lesson_id)
        if not progress:
            progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
            self.db.add(progress)

        progress.progress_percent = 100 if completed else progress_percent
        progress.last_position_seconds = last_position_seconds
        progress.completed = completed or progress.progress_percent >= 100

        if progress.completed and recommendation_log_id is not None:
            # REQ-17/REQ-18: aula nao gera LearningOutcome (REQ-3) — fecha o ciclo sem esse vinculo.
            mark_completed(self.db, log_id=recommendation_log_id, user_id=user_id)

        self.db.commit()
        self.db.refresh(progress)
        return LessonProgressRead(
            progress_percent=progress.progress_percent,
            last_position_seconds=progress.last_position_seconds,
            completed=progress.completed,
        )

    def _module_schema(self, module, user_id: int, *, unlock_map: dict[int, bool]) -> ModuleRead:
        locked = not unlock_map.get(module.id, True)
        mastery = self.progression.module_mastery(module, user_id)
        return ModuleRead(
            id=module.id,
            title=module.title,
            slug=module.slug,
            description=module.description,
            color=module.color,
            order=module.order,
            progress_percent=self._module_progress(module, user_id),
            completed=self._module_completed(module.id, user_id),
            lessons=[
                self._lesson_schema(lesson, user_id, locked=locked)
                for lesson in sorted(module.lessons, key=lambda item: item.order)
            ],
            items=self._module_items(module, user_id, locked=locked),
            locked=locked,
            mastered=mastery.mastered,
            unlock_requirements=self.progression.pending_requirements(mastery) if locked else [],
            target_competencies=module.target_competencies or [],
        )

    def _lesson_schema(self, lesson, user_id: int, *, locked: bool = False) -> LessonRead:
        progress = self.repo.get_progress(user_id, lesson.id)
        return LessonRead(
            id=lesson.id,
            title=lesson.title,
            description=lesson.description,
            thumbnail_url=lesson.thumbnail_url,
            video_url=lesson.video_url,
            summary=lesson.summary,
            duration_minutes=lesson.duration_minutes,
            order=lesson.order,
            progress=LessonProgressRead(
                progress_percent=progress.progress_percent if progress else 0,
                last_position_seconds=progress.last_position_seconds if progress else 0,
                completed=progress.completed if progress else False,
            ),
            exercises=[
                ExercisePreview(id=ex.id, statement=ex.statement, skill=ex.skill, difficulty=ex.difficulty.value)
                for ex in lesson.exercises
            ],
            locked=locked,
        )

    def _module_items(self, module, user_id: int, *, locked: bool = False) -> list[ModuleItemRead]:
        items = [
            item
            for item in getattr(module, "items", [])
            if (item.kind == "lesson" and item.lesson) or (item.kind == "activity" and item.exercise)
        ]
        if not items:
            return [
                ModuleItemRead(
                    id=0 - lesson.id,
                    kind="lesson",
                    order=lesson.order,
                    lesson=self._lesson_schema(lesson, user_id, locked=locked),
                )
                for lesson in sorted(module.lessons, key=lambda item: (item.order, item.id))
            ]
        result: list[ModuleItemRead] = []
        for item in sorted(items, key=lambda entry: (entry.order, entry.id)):
            if item.kind == "lesson" and item.lesson:
                result.append(
                    ModuleItemRead(
                        id=item.id,
                        kind="lesson",
                        order=item.order,
                        lesson=self._lesson_schema(item.lesson, user_id, locked=locked),
                    )
                )
            elif item.kind == "activity" and item.exercise:
                result.append(
                    ModuleItemRead(
                        id=item.id,
                        kind="activity",
                        order=item.order,
                        activity=ModuleActivityRead(
                            id=item.exercise.id,
                            statement=item.exercise.statement,
                            skill=item.exercise.skill,
                            difficulty=item.exercise.difficulty.value,
                            lesson_id=item.exercise.lesson_id,
                            base_lesson_ids=item.exercise.base_lesson_ids or [],
                        ),
                    )
                )
        return result

    def _get_user(self, user_id: int) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise AppError("Usuário não encontrado.", status_code=404, code="user_not_found")
        return user

    def _module_progress(self, module, user_id: int) -> int:
        lessons = list(module.lessons)
        if not lessons:
            return 0
        return round(sum(self._lesson_progress_percent(lesson, user_id) for lesson in lessons) / len(lessons))

    def _lesson_progress_percent(self, lesson, user_id: int) -> int:
        progress = self.repo.get_progress(user_id, lesson.id)
        return progress.progress_percent if progress else 0

    def _module_completed(self, module_id: int, user_id: int) -> bool:
        lesson_ids = list(self.db.scalars(select(Lesson.id).where(Lesson.module_id == module_id)))
        if not lesson_ids:
            return False
        completed_count = self.db.scalar(
            select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.completed.is_(True),
            )
        ) or 0
        return completed_count == len(lesson_ids)
