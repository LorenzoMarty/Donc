from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.models import Essay, EssayCorrection, EssayTheme, Exercise, Lesson, User
from src.repositories.users import UserRepository
from src.schemas.admin import AdminMetricsResponse, AdminUserRead


class AdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

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

    def users_list(self) -> list[AdminUserRead]:
        return [
            AdminUserRead(
                id=user.id,
                name=user.name,
                email=user.email,
                role=user.role.value,
                xp=user.xp,
                level=user.level,
                essays=len(user.essays),
            )
            for user in self.users.list_users()
        ]

