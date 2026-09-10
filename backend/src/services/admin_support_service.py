from __future__ import annotations

from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import SupportTicket
from src.repositories.support import SupportTicketRepository
from src.schemas.support import AdminSupportTicketListResponse, AdminSupportTicketRead


class AdminSupportTicketService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SupportTicketRepository(db)

    def list_tickets(self, *, limit: int, offset: int, status: str | None, category: str | None) -> AdminSupportTicketListResponse:
        items, total = self.repository.list_for_admin(limit=limit, offset=offset, status=status, category=category)
        return AdminSupportTicketListResponse(items=[self._to_read(ticket) for ticket in items], total=total)

    def update_status(self, *, ticket_id: int, status: str) -> AdminSupportTicketRead:
        ticket = self.repository.get(ticket_id)
        if not ticket:
            raise AppError("Chamado não encontrado.", status_code=404, code="support_ticket_not_found")
        ticket.status = status
        self.db.commit()
        self.db.refresh(ticket)
        return self._to_read(ticket)

    def _to_read(self, ticket: SupportTicket) -> AdminSupportTicketRead:
        return AdminSupportTicketRead(
            id=ticket.id,
            category=ticket.category,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            user_id=ticket.user_id,
            user_name=ticket.user.name,
            user_email=ticket.user.email,
        )
