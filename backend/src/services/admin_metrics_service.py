from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import Essay, EssayCorrection, EssayTheme, Exercise, Lesson, User
from src.schemas.admin import AdminMetricsResponse


class AdminMetricsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def metrics(self) -> AdminMetricsResponse:
        corrected = self.db.scalar(select(func.count(EssayCorrection.id))) or 0
        average = self.db.scalar(select(func.avg(EssayCorrection.total_score))) or 0
        return AdminMetricsResponse(
            users=self.db.scalar(select(func.count(User.id))) or 0,
            essays=self.db.scalar(select(func.count(Essay.id))) or 0,
            corrected_essays=corrected,
            lessons=self.db.scalar(select(func.count(Lesson.id))) or 0,
            exercises=self.db.scalar(select(func.count(Exercise.id))) or 0,
            average_score=int(average),
            active_themes=self.db.scalar(select(func.count(EssayTheme.id)).where(EssayTheme.is_active.is_(True))) or 0,
        )
