import re

from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# Mesma defesa em profundidade usada em schemas/essays.py — duplicada aqui porque a função de lá
# é privada ao módulo (_reject_dangerous_html), não uma utilidade compartilhada.
_DANGEROUS_HTML_PATTERN = re.compile(
    r"<\s*(script|iframe|object|embed|link|style)\b|\bon\w+\s*=|javascript\s*:(?!\s)",
    re.IGNORECASE,
)


def _reject_dangerous_html(value: str) -> str:
    if _DANGEROUS_HTML_PATTERN.search(value):
        raise ValueError("Conteúdo não pode conter tags/atributos de script ou HTML executável.")
    return value


SUPPORT_TICKET_CATEGORIES = ("billing", "technical_bug", "correction_question", "account_access", "other")
SupportTicketCategoryLiteral = Literal["billing", "technical_bug", "correction_question", "account_access", "other"]
SupportTicketStatusLiteral = Literal["open", "resolved"]


class SupportTicketCreateRequest(BaseModel):
    category: SupportTicketCategoryLiteral
    subject: str = Field(min_length=4, max_length=160)
    message: str = Field(min_length=10, max_length=4000)

    _validate_no_dangerous_html = field_validator("subject", "message")(_reject_dangerous_html)


class SupportTicketRead(BaseModel):
    id: int
    category: str
    subject: str
    message: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminSupportTicketRead(SupportTicketRead):
    user_id: int
    user_name: str
    user_email: str


class AdminSupportTicketListResponse(BaseModel):
    items: list[AdminSupportTicketRead]
    total: int


class AdminSupportTicketStatusUpdateRequest(BaseModel):
    status: SupportTicketStatusLiteral
