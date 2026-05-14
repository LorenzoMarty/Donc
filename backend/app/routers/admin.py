from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import require_admin
from app.models import User
from app.schemas.admin import AdminMetricsResponse, AdminUserRead
from app.services.admin_service import AdminService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=AdminMetricsResponse)
def metrics(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> AdminMetricsResponse:
    return AdminService(db).metrics()


@router.get("/users", response_model=list[AdminUserRead])
def users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[AdminUserRead]:
    return AdminService(db).users_list()

