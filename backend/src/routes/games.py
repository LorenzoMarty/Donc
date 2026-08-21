from datetime import UTC, datetime, timedelta

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
from src.models import GameAttempt, StaticGame, User, UserGameProgress
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
    engine: str = "quiz"
    questions: list[PublishedGameQuestion]
    payload: dict | None = None
    description: str | None = None
    thumbnail: str | None = None
    estimated_time: str | None = None


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
                engine=game.engine,
                payload=game.payload,
                description=game.description,
                thumbnail=game.thumbnail,
                estimated_time=game.estimated_time,
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
    aprovado. Jogo estatico (catalogo do frontend) valida contra `StaticGame` — registro minimo
    (id+categoria) seedado a partir do catalogo real, nao sincronizado automaticamente (auditoria
    arquitetural 2026-08-21)."""
    if not game_id.startswith("ai-"):
        if not db.get(StaticGame, game_id):
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        return
    raw_id = game_id.removeprefix("ai-")
    if not raw_id.isdigit():
        raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
    game = db.get(AIGeneratedGame, int(raw_id))
    if not game or game.status != "approved":
        raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")


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
        raise AppError("Tentativa não encontrada.", status_code=404, code="attempt_not_found")
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiResponse[GameProgressRead]:
    """Ressincroniza UserGameProgress a partir das GameAttempt reais do usuario pra esse jogo —
    nao aceita mais best_score/best_accuracy/progress prontos do cliente (payload antigo permitia
    qualquer cliente autenticado inflar o proprio progresso sem uma tentativa real por tras)."""
    _assert_game_playable(db, game_id)
    attempts = db.query(GameAttempt).filter(
        GameAttempt.user_id == current_user.id,
        GameAttempt.game_id == game_id,
    ).all()
    if not attempts:
        raise AppError("Nenhuma tentativa registrada para este jogo.", status_code=404, code="no_attempts_for_game")

    plays = len(attempts)
    best_score = max(a.score for a in attempts)
    best_accuracy = max(a.accuracy for a in attempts)
    progress = best_accuracy
    last_played_at = max(a.completed_at for a in attempts)

    row = db.query(UserGameProgress).filter(
        UserGameProgress.user_id == current_user.id,
        UserGameProgress.game_id == game_id,
    ).first()
    if row:
        row.plays = plays
        row.best_score = best_score
        row.best_accuracy = best_accuracy
        row.progress = progress
        row.last_played_at = last_played_at
    else:
        row = UserGameProgress(
            user_id=current_user.id,
            game_id=game_id,
            plays=plays,
            best_score=best_score,
            best_accuracy=best_accuracy,
            progress=progress,
            last_played_at=last_played_at,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return success_response(GameProgressRead.model_validate(row))
