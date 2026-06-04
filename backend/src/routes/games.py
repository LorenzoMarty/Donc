from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.models import User, UserGameProgress
from src.schemas.common import ApiResponse, success_response
from src.services.game_service import GameService


router = APIRouter(prefix="/games", tags=["games"])


class PublishedGameQuestion(BaseModel):
    prompt: str
    options: list[str]
    answer_index: int
    explanation: str


class PublishedGameRead(BaseModel):
    id: int
    name: str
    category: str
    skill: str
    difficulty: str
    xp_reward: int
    questions: list[PublishedGameQuestion]


class GameCompleteRequest(BaseModel):
    game_id: str = Field(min_length=1, max_length=120)
    xp_earned: int = Field(ge=0, le=500)


class GameCompleteResponse(BaseModel):
    xp_earned: int
    total_xp: int
    level: int


class GameProgressUpsertRequest(BaseModel):
    plays: int = Field(ge=0)
    best_score: int = Field(ge=0)
    best_accuracy: int = Field(ge=0, le=100)
    progress: int = Field(ge=0, le=100)


class GameProgressRead(BaseModel):
    game_id: str
    plays: int
    best_score: int
    best_accuracy: int
    progress: int
    last_played_at: datetime | None = None

    class Config:
        from_attributes = True


@router.get("/published", response_model=ApiResponse[list[PublishedGameRead]])
def published_games(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[PublishedGameRead]]:
    games = GameService(db).published()
    return success_response(
        [
            PublishedGameRead(
                id=game.id,
                name=game.name,
                category=game.category,
                skill=game.skill,
                difficulty=game.difficulty,
                xp_reward=game.xp_reward,
                questions=[
                    PublishedGameQuestion(
                        prompt=q.get("prompt", ""),
                        options=q.get("options", []),
                        answer_index=q.get("answer_index", 0),
                        explanation=q.get("explanation", ""),
                    )
                    for q in (game.questions or [])
                ],
            )
            for game in games
        ]
    )


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


@router.get("/progress", response_model=ApiResponse[list[GameProgressRead]])
def list_game_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[list[GameProgressRead]]:
    rows = db.query(UserGameProgress).filter(UserGameProgress.user_id == current_user.id).all()
    return success_response([GameProgressRead.model_validate(r) for r in rows])


@router.put("/progress/{game_id}", response_model=ApiResponse[GameProgressRead])
def upsert_game_progress(
    game_id: str,
    payload: GameProgressUpsertRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GameProgressRead]:
    row = db.query(UserGameProgress).filter(
        UserGameProgress.user_id == current_user.id,
        UserGameProgress.game_id == game_id,
    ).first()
    if row:
        row.plays = max(row.plays, payload.plays)
        row.best_score = max(row.best_score, payload.best_score)
        row.best_accuracy = max(row.best_accuracy, payload.best_accuracy)
        row.progress = max(row.progress, payload.progress)
        row.last_played_at = datetime.now(UTC)
    else:
        row = UserGameProgress(
            user_id=current_user.id,
            game_id=game_id,
            plays=payload.plays,
            best_score=payload.best_score,
            best_accuracy=payload.best_accuracy,
            progress=payload.progress,
            last_played_at=datetime.now(UTC),
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return success_response(GameProgressRead.model_validate(row))
