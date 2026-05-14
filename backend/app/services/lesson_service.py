from sqlalchemy.orm import Session

from app.middlewares.errors import AppError
from app.models import LessonProgress
from app.repositories.learning import LearningRepository
from app.schemas.lessons import ExercisePreview, LessonProgressRead, LessonRead, ModuleRead, SubjectRead


class LessonService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LearningRepository(db)

    def list_subjects(self, user_id: int) -> list[SubjectRead]:
        subjects = self.repo.list_subjects()
        return [
            SubjectRead(
                id=subject.id,
                title=subject.title,
                slug=subject.slug,
                description=subject.description,
                color=subject.color,
                modules=[
                    ModuleRead(
                        id=module.id,
                        title=module.title,
                        description=module.description,
                        order=module.order,
                        lessons=[self._lesson_schema(lesson, user_id) for lesson in sorted(module.lessons, key=lambda item: item.order)],
                    )
                    for module in sorted(subject.modules, key=lambda item: item.order)
                ],
            )
            for subject in subjects
        ]

    def get_lesson(self, lesson_id: int, user_id: int) -> LessonRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        return self._lesson_schema(lesson, user_id)

    def update_progress(self, lesson_id: int, user_id: int, *, progress_percent: int, last_position_seconds: int, completed: bool) -> LessonProgressRead:
        lesson = self.repo.get_lesson(lesson_id)
        if not lesson:
            raise AppError("Aula nao encontrada.", status_code=404, code="lesson_not_found")
        progress = self.repo.get_progress(user_id, lesson_id)
        if not progress:
            progress = LessonProgress(user_id=user_id, lesson_id=lesson_id)
            self.db.add(progress)
        progress.progress_percent = 100 if completed else progress_percent
        progress.last_position_seconds = last_position_seconds
        progress.completed = completed or progress.progress_percent >= 100
        self.db.commit()
        self.db.refresh(progress)
        return LessonProgressRead(
            progress_percent=progress.progress_percent,
            last_position_seconds=progress.last_position_seconds,
            completed=progress.completed,
        )

    def _lesson_schema(self, lesson, user_id: int) -> LessonRead:
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
        )

