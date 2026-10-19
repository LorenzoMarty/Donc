from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.schemas.support import SupportReplyRequest, SupportTicketCreateRequest, SupportTicketRead
from src.services.support_service import SupportService
from src.utils.auth_rate_limit import check_auth_rate_limit


router = APIRouter(prefix="/support", tags=["support"])


@router.get("/tickets", response_model=ApiResponse[list[SupportTicketRead]])
def my_tickets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[list[SupportTicketRead]]:
    tickets = SupportService(db).list_for_user(current_user.id)
    return success_response([SupportTicketRead.model_validate(ticket) for ticket in tickets])


@router.post("/tickets/{ticket_id}/messages", response_model=ApiResponse[SupportTicketRead], status_code=201)
def reply_to_ticket(
    ticket_id: int,
    payload: SupportReplyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[SupportTicketRead]:
    # Bucket próprio: uma conversa longa não consome a cota de abrir chamados novos.
    check_auth_rate_limit(request, bucket="support-reply", identifier=current_user.email)
    ticket = SupportService(db).add_student_message(user_id=current_user.id, ticket_id=ticket_id, body=payload.message)
    return success_response(SupportTicketRead.model_validate(ticket), "Mensagem enviada.")


@router.post("/tickets", response_model=ApiResponse[MessageResponse], status_code=201)
def create_ticket(
    payload: SupportTicketCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    check_auth_rate_limit(request, bucket="support-ticket", identifier=current_user.email)
    SupportService(db).create_ticket(
        user_id=current_user.id,
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
    )
    return success_response(
        MessageResponse(message="Chamado enviado. Nossa equipe vai responder em breve."),
        "Chamado enviado.",
    )
