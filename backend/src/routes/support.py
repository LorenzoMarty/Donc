from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, MessageResponse, success_response
from src.schemas.support import SupportTicketCreateRequest
from src.services.support_service import SupportService
from src.utils.auth_rate_limit import check_auth_rate_limit


router = APIRouter(prefix="/support", tags=["support"])


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
