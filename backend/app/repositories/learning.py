from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Exercise, Lesson, LessonProgress, Module, Subject


class LearningRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_subjects(self) -> list[Subject]:
        stmt = (
            select(Subject)
            .options(selectinload(Subject.modules).selectinload(Module.lessons), selectinload(Subject.modules).selectinload(Module.exercises))
            .order_by(Subject.id)
        )
        return list(self.db.scalars(stmt))

    def get_lesson(self, lesson_id: int) -> Lesson | None:
        stmt = select(Lesson).options(selectinload(Lesson.exercises), selectinload(Lesson.module)).where(Lesson.id == lesson_id)
        return self.db.scalar(stmt)

    def get_exercise(self, exercise_id: int) -> Exercise | None:
        return self.db.get(Exercise, exercise_id)

    def list_exercises(self) -> list[Exercise]:
        return list(self.db.scalars(select(Exercise).order_by(Exercise.id)))

    def get_progress(self, user_id: int, lesson_id: int) -> LessonProgress | None:
        stmt = select(LessonProgress).where(LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson_id)
        return self.db.scalar(stmt)
