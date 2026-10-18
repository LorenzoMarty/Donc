from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.session import Base


class SupportTicketStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"


class SupportTicketCategory(str, Enum):
    BILLING = "billing"
    TECHNICAL_BUG = "technical_bug"
    CORRECTION_QUESTION = "correction_question"
    ACCOUNT_ACCESS = "account_access"
    SUGGESTION = "suggestion"
    OTHER = "other"


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(40), nullable=False)
    subject: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=SupportTicketStatus.OPEN.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    messages = relationship(
        "SupportTicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="SupportTicketMessage.id"
    )


class SupportTicketMessage(Base):
    """Respostas na thread do chamado (a mensagem inicial continua em `SupportTicket.message`)."""

    __tablename__ = "support_ticket_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    author_role: Mapped[str] = mapped_column(String(20), nullable=False)  # "student" | "admin"
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("SupportTicket", back_populates="messages")
