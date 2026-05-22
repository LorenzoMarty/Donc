from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import require_admin
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.admin import AdminMetricsResponse, AdminUserRead
from src.services.admin_service import AdminService


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=ApiResponse[AdminMetricsResponse])
def metrics(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[AdminMetricsResponse]:
    return success_response(AdminService(db).metrics())


@router.get("/users", response_model=ApiResponse[list[AdminUserRead]])
def users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> ApiResponse[list[AdminUserRead]]:
    return success_response(AdminService(db).users_list())
