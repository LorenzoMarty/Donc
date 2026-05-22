from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, success_response
from src.schemas.dashboard import DashboardResponse
from src.services.dashboard_service import DashboardService


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=ApiResponse[DashboardResponse])
def dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ApiResponse[DashboardResponse]:
    return success_response(DashboardService(db).get(current_user.id))
