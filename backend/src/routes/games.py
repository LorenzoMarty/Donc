from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from src.database.session import get_db
from src.dependencies import get_current_user
from src.memory.cognitive_issues import EVENT_DIRECTION, HUB_TO_ISSUE, apply_cognitive_signal
from src.memory.learning_outcomes import SOURCE_WEIGHT, record_learning_outcome
from src.memory.profile import get_or_create_learning_profile
from src.memory.recommendation_log import mark_completed
from src.middlewares.errors import AppError
from src.models import GameAttempt, User, UserGameProgress
from src.models.events import AIGeneratedGame
from src.schemas.common import ApiResponse, success_response
from src.services.game_service import GameService
from src.services.streak_service import touch_daily_streak


router = APIRouter(prefix="/games", tags=["games"])

# Hubs cognitivos reais do produto (features/gamification/symptoms.ts::HUBS no frontend) — usado
# pra rejeitar payload de cognitive_outcomes com hub inventado/arbitrario.
_KNOWN_HUBS = {
    "texto-robotico",
    "repete-ideias",
    "repertorio-nao-encaixa",
    "nao-aprofunda",
    "introducao-sem-tese",
    "perde-na-c3",
    "conclusao-formula",
}


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
    questions: list[PublishedGameQuestion]


class CognitiveOutcomeIn(BaseModel):
    hub: str = Field(min_length=1, max_length=60)
    event: str = Field(min_length=1, max_length=80)
    severity: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def _hub_and_event_known(self) -> "CognitiveOutcomeIn":
        if self.hub not in _KNOWN_HUBS:
            raise ValueError(f"hub desconhecido: {self.hub}")
        if self.event not in EVENT_DIRECTION:
            raise ValueError(f"evento cognitivo desconhecido: {self.event}")
        return self


class GameCompleteRequest(BaseModel):
    game_id: str = Field(min_length=1, max_length=120)
    score: int = Field(ge=0, le=500)
    total: int = Field(ge=1, le=500)
    duration_seconds: int = Field(ge=1, le=3600)
    cognitive_outcomes: list[CognitiveOutcomeIn] = Field(default_factory=list, max_length=20)
    recommendation_log_id: int | None = None

    @model_validator(mode="after")
    def _score_within_total(self) -> "GameCompleteRequest":
        if self.score > self.total:
            raise ValueError("score nao pode ser maior que total")
        return self


class IssueUpdate(BaseModel):
    code: str
    previous_state: str | None
    new_state: str


class GameCompleteResponse(BaseModel):
    attempt_id: int
    game_id: str
    score: int
    total: int
    accuracy: int
    issue_updates: list[IssueUpdate]


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
                questions=[
                    PublishedGameQuestion(
                        prompt=q.get("prompt", ""),
                        options=q.get("options", []),
                        answer_index=q.get("answer_index", 0),
                        explanation=q.get("explanation", ""),
                    )
                    for q in (game.questions or [])
                    # REQ-4 (jogo-ia-perguntas-existentes): pergunta pendente nunca aparece pro
                    # aluno, mesmo com o jogo approved — falta de status = pergunta legada, tratada
                    # como aprovada.
                    if q.get("status", "approved") == "approved"
                ],
            )
            for game in games
        ]
    )


def _assert_game_playable(db: Session, game_id: str) -> None:
    """Se o game_id referencia um jogo gerado por IA (`ai-<id>`), confirma que ele existe e esta
    aprovado. Jogos estaticos (catalogo do frontend) nao tem registro no backend hoje — validamos
    o que da pra validar (ownership, limites de score/duracao); nao ha tabela de jogos estaticos
    pra checar "existencia" contra ela."""
    if not game_id.startswith("ai-"):
        return
    raw_id = game_id.removeprefix("ai-")
    if not raw_id.isdigit():
        raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
    game = db.get(AIGeneratedGame, int(raw_id))
    if not game or game.status != "approved":
        raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")


@router.post("/complete", response_model=ApiResponse[GameCompleteResponse])
def complete_game(
    payload: GameCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GameCompleteResponse]:
    _assert_game_playable(db, payload.game_id)

    accuracy = round((payload.score / payload.total) * 100) if payload.total else 0
    completed_at = datetime.now(UTC)
    started_at = completed_at - timedelta(seconds=payload.duration_seconds)

    attempt = GameAttempt(
        user_id=current_user.id,
        game_id=payload.game_id,
        score=payload.score,
        total=payload.total,
        accuracy=accuracy,
        duration_seconds=payload.duration_seconds,
        cognitive_outcomes=[o.model_dump() for o in payload.cognitive_outcomes],
        started_at=started_at,
        completed_at=completed_at,
    )
    db.add(attempt)
    db.flush()  # popula attempt.id — usado como source_id do LearningOutcome abaixo.

    row = db.query(UserGameProgress).filter(
        UserGameProgress.user_id == current_user.id,
        UserGameProgress.game_id == payload.game_id,
    ).first()
    if row:
        row.plays = row.plays + 1
        row.best_score = max(row.best_score, payload.score)
        row.best_accuracy = max(row.best_accuracy, accuracy)
        row.progress = max(row.progress, accuracy)
        row.last_played_at = completed_at
    else:
        row = UserGameProgress(
            user_id=current_user.id,
            game_id=payload.game_id,
            plays=1,
            best_score=payload.score,
            best_accuracy=accuracy,
            progress=accuracy,
            last_played_at=completed_at,
        )
        db.add(row)

    profile = get_or_create_learning_profile(db, current_user.id)
    issues_before = dict(profile.cognitive_issues)
    issues = profile.cognitive_issues
    touched_codes: list[str] = []
    first_learning_outcome_id: int | None = None
    for outcome in payload.cognitive_outcomes:
        issue_code = HUB_TO_ISSUE.get(outcome.hub)
        direction = EVENT_DIRECTION.get(outcome.event)
        if not issue_code or not direction:
            continue
        if issue_code not in touched_codes:
            touched_codes.append(issue_code)
        issues = apply_cognitive_signal(issues, issue_code, direction, weight=SOURCE_WEIGHT["GAME"])
        learning_outcome = record_learning_outcome(
            db,
            user_id=current_user.id,
            cognitive_issue_code=issue_code,
            source="GAME",
            source_id=attempt.id,
            direction=direction,
        )
        db.flush()
        if first_learning_outcome_id is None:
            first_learning_outcome_id = learning_outcome.id
    profile.cognitive_issues = issues

    if payload.recommendation_log_id is not None:
        # REQ-17/REQ-18: vinculo frouxo — log inexistente/de outro usuario nao bloqueia o fluxo.
        mark_completed(
            db,
            log_id=payload.recommendation_log_id,
            user_id=current_user.id,
            learning_outcome_id=first_learning_outcome_id,
        )

    db.commit()
    db.refresh(attempt)
    touch_daily_streak(db, current_user)

    issue_updates = [
        IssueUpdate(
            code=code,
            previous_state=(issues_before.get(code) or {}).get("state"),
            new_state=(issues.get(code) or {}).get("state"),
        )
        for code in touched_codes
    ]

    return success_response(
        GameCompleteResponse(
            attempt_id=attempt.id,
            game_id=attempt.game_id,
            score=attempt.score,
            total=attempt.total,
            accuracy=attempt.accuracy,
            issue_updates=issue_updates,
        )
    )


class GameAttemptRead(BaseModel):
    id: int
    game_id: str
    score: int
    total: int
    accuracy: int
    duration_seconds: int
    cognitive_outcomes: list[CognitiveOutcomeIn]
    started_at: datetime
    completed_at: datetime

    class Config:
        from_attributes = True


@router.get("/attempts/{attempt_id}", response_model=ApiResponse[GameAttemptRead])
def get_game_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GameAttemptRead]:
    attempt = db.query(GameAttempt).filter(
        GameAttempt.id == attempt_id,
        GameAttempt.user_id == current_user.id,
    ).first()
    if not attempt:
        raise AppError("Tentativa nao encontrada.", status_code=404, code="attempt_not_found")
    return success_response(GameAttemptRead.model_validate(attempt))


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
