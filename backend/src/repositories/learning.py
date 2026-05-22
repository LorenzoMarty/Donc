from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models import Course, Exercise, Lesson, LessonProgress, Module


class LearningRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_courses(self) -> list[Course]:
        stmt = (
            select(Course)
            .where(Course.slug == "destrave-redacao")
            .options(selectinload(Course.modules).selectinload(Module.lessons), selectinload(Course.modules).selectinload(Module.exercises))
            .order_by(Course.id)
        )
        return list(self.db.scalars(stmt))

    def get_lesson(self, lesson_id: int) -> Lesson | None:
        stmt = select(Lesson).options(selectinload(Lesson.exercises), selectinload(Lesson.module)).where(Lesson.id == lesson_id)
        return self.db.scalar(stmt)

    def get_exercise(self, exercise_id: int) -> Exercise | None:
        return self.db.get(Exercise, exercise_id)

    def list_exercises(self) -> list[Exercise]:
        stmt = (
            select(Exercise)
            .join(Exercise.module)
            .join(Module.course)
            .where(Course.slug == "destrave-redacao")
            .order_by(Exercise.id)
        )
        return list(self.db.scalars(stmt))

    def get_progress(self, user_id: int, lesson_id: int) -> LessonProgress | None:
        stmt = select(LessonProgress).where(LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson_id)
        return self.db.scalar(stmt)
