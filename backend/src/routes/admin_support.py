from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.support import (
    AdminSupportTicketListResponse,
    AdminSupportTicketRead,
    AdminSupportTicketStatusUpdateRequest,
)
from src.services.admin_support_service import AdminSupportTicketService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/support-tickets", response_model=ApiResponse[AdminSupportTicketListResponse])
def list_support_tickets(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminSupportTicketListResponse]:
    return success_response(
        AdminSupportTicketService(db).list_tickets(limit=limit, offset=offset, status=status, category=category)
    )


@router.patch("/support-tickets/{ticket_id}", response_model=ApiResponse[AdminSupportTicketRead])
def update_support_ticket_status(
    ticket_id: int,
    payload: AdminSupportTicketStatusUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ApiResponse[AdminSupportTicketRead]:
    ticket = AdminSupportTicketService(db).update_status(ticket_id=ticket_id, status=payload.status)
    return success_response(ticket, "Status atualizado.")
