from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from src.models import Essay, EssayTheme, EssayVersion


class EssayRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_themes(self) -> list[EssayTheme]:
        return list(self.db.scalars(select(EssayTheme).where(EssayTheme.is_active.is_(True)).order_by(EssayTheme.created_at.desc())))

    def list_random_themes(self, limit: int = 4) -> list[EssayTheme]:
        return list(
            self.db.scalars(
                select(EssayTheme)
                .where(EssayTheme.is_active.is_(True))
                .order_by(func.random())
                .limit(limit)
            )
        )

    def get_theme(self, theme_id: int) -> EssayTheme | None:
        return self.db.get(EssayTheme, theme_id)

    def get_essay(self, essay_id: int, user_id: int | None = None) -> Essay | None:
        stmt = (
            select(Essay)
            .options(selectinload(Essay.theme), selectinload(Essay.correction), selectinload(Essay.versions).selectinload(EssayVersion.correction))
            .where(Essay.id == essay_id)
        )
        if user_id is not None:
            stmt = stmt.where(Essay.user_id == user_id)
        return self.db.scalar(stmt)

    def list_by_user(self, user_id: int) -> list[Essay]:
        stmt = (
            select(Essay)
            .options(selectinload(Essay.theme), selectinload(Essay.correction), selectinload(Essay.versions).selectinload(EssayVersion.correction))
            .where(Essay.user_id == user_id)
            .order_by(Essay.updated_at.desc())
        )
        return list(self.db.scalars(stmt))
