from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.tutor import TutorMessageRequest, TutorMessageResponse
from app.services.tutor_service import TutorService


router = APIRouter(prefix="/tutor", tags=["tutor"])


@router.post("/chat", response_model=TutorMessageResponse)
def chat(payload: TutorMessageRequest, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return TutorService(db).answer(message=payload.message, context=payload.context)

