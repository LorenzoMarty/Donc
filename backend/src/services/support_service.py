from sqlalchemy import func
from sqlalchemy.orm import Session

from src.middlewares.errors import AppError
from src.models import SupportTicket, SupportTicketMessage
from src.repositories.support import SupportTicketRepository


class SupportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SupportTicketRepository(db)

    def create_ticket(self, *, user_id: int, category: str, subject: str, message: str) -> SupportTicket:
        ticket = self.repository.create(user_id=user_id, category=category, subject=subject.strip(), message=message.strip())
        self.db.commit()
        return ticket

    def list_for_user(self, user_id: int) -> list[SupportTicket]:
        return self.repository.list_for_user(user_id)

    def add_student_message(self, *, user_id: int, ticket_id: int, body: str) -> SupportTicket:
        ticket = self.repository.get(ticket_id)
        if not ticket or ticket.user_id != user_id:
            raise AppError("Chamado não encontrado.", status_code=404, code="support_ticket_not_found")
        ticket.messages.append(SupportTicketMessage(author_role="student", body=body.strip()))
        ticket.status = "open"  # réplica do aluno reabre o chamado
        ticket.updated_at = func.now()  # adicionar mensagem não faz UPDATE na linha: sobe o chamado na ordenação
        self.db.commit()
        self.db.refresh(ticket)
        return ticket
