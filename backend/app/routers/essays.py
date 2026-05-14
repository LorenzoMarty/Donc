from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.essays import EssayAutosaveRequest, EssayCreateRequest, EssayHistoryResponse, EssayRead, EssayThemeRead
from app.services.essay_service import EssayService


router = APIRouter(prefix="/essays", tags=["essays"])


@router.get("/themes", response_model=list[EssayThemeRead])
def themes(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return EssayService(db).list_themes()


@router.get("/history", response_model=EssayHistoryResponse)
def history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> EssayHistoryResponse:
    return EssayService(db).history(current_user.id)


@router.post("", response_model=EssayRead, status_code=201)
def create_essay(payload: EssayCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return EssayService(db).create(user_id=current_user.id, theme_id=payload.theme_id, title=payload.title)


@router.put("/{essay_id}/autosave", response_model=EssayRead)
def autosave(
    essay_id: int,
    payload: EssayAutosaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return EssayService(db).autosave(essay_id=essay_id, user_id=current_user.id, title=payload.title, content=payload.content)


@router.post("/{essay_id}/submit", response_model=EssayRead)
def submit_essay(essay_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return EssayService(db).submit_for_correction(essay_id=essay_id, user=current_user)

