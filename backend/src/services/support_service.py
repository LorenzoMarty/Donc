from sqlalchemy.orm import Session

from src.models import SupportTicket
from src.repositories.support import SupportTicketRepository


class SupportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SupportTicketRepository(db)

    def create_ticket(self, *, user_id: int, category: str, subject: str, message: str) -> SupportTicket:
        ticket = self.repository.create(user_id=user_id, category=category, subject=subject.strip(), message=message.strip())
        self.db.commit()
        return ticket
