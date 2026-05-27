from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User
from src.schemas.common import ApiResponse, success_response


router = APIRouter(prefix="/games", tags=["games"])


class GameCompleteRequest(BaseModel):
    game_id: str = Field(min_length=1, max_length=120)
    xp_earned: int = Field(ge=0, le=500)


class GameCompleteResponse(BaseModel):
    xp_earned: int
    total_xp: int
    level: int


@router.post("/complete", response_model=ApiResponse[GameCompleteResponse])
def complete_game(
    payload: GameCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GameCompleteResponse]:
    current_user.xp = (current_user.xp or 0) + payload.xp_earned
    current_user.level = max(current_user.level or 1, current_user.xp // 350 + 1)
    db.commit()
    return success_response(
        GameCompleteResponse(
            xp_earned=payload.xp_earned,
            total_xp=current_user.xp,
            level=current_user.level,
        )
    )
