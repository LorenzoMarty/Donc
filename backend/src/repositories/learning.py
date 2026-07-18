from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from src.models import Exercise, Lesson, LessonProgress, Module, ModuleItem


class LearningRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_modules(self) -> list[Module]:
        stmt = (
            select(Module)
            .options(
                selectinload(Module.lessons),
                selectinload(Module.exercises),
                selectinload(Module.items).selectinload(ModuleItem.lesson),
                selectinload(Module.items).selectinload(ModuleItem.exercise),
            )
            .order_by(Module.order, Module.id)
        )
        return list(self.db.scalars(stmt))

    def get_lesson(self, lesson_id: int) -> Lesson | None:
        stmt = select(Lesson).options(selectinload(Lesson.exercises), selectinload(Lesson.module)).where(Lesson.id == lesson_id)
        return self.db.scalar(stmt)

    def get_exercise(self, exercise_id: int) -> Exercise | None:
        return self.db.get(Exercise, exercise_id)

    def list_exercises(self) -> list[Exercise]:
        stmt = select(Exercise).order_by(Exercise.id)
        return list(self.db.scalars(stmt))

    def get_progress(self, user_id: int, lesson_id: int) -> LessonProgress | None:
        stmt = select(LessonProgress).where(LessonProgress.user_id == user_id, LessonProgress.lesson_id == lesson_id)
        return self.db.scalar(stmt)
