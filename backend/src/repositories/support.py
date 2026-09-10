from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from src.models import SupportTicket


class SupportTicketRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, user_id: int, category: str, subject: str, message: str) -> SupportTicket:
        ticket = SupportTicket(user_id=user_id, category=category, subject=subject, message=message)
        self.db.add(ticket)
        self.db.flush()
        return ticket

    def get(self, ticket_id: int) -> SupportTicket | None:
        return self.db.get(SupportTicket, ticket_id)

    def list_for_admin(
        self, *, limit: int, offset: int, status: str | None = None, category: str | None = None
    ) -> tuple[list[SupportTicket], int]:
        stmt = select(SupportTicket).options(joinedload(SupportTicket.user))
        count_stmt = select(func.count()).select_from(SupportTicket)
        if status:
            stmt = stmt.where(SupportTicket.status == status)
            count_stmt = count_stmt.where(SupportTicket.status == status)
        if category:
            stmt = stmt.where(SupportTicket.category == category)
            count_stmt = count_stmt.where(SupportTicket.category == category)
        total = self.db.scalar(count_stmt) or 0
        items = list(self.db.scalars(stmt.order_by(SupportTicket.created_at.desc()).limit(limit).offset(offset)))
        return items, total
