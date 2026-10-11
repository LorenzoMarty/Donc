from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.memory.cognitive_issues import EVENT_DIRECTION, HUB_TO_ISSUE, apply_cognitive_signal
from src.memory.learning_outcomes import SOURCE_WEIGHT, record_learning_outcome
from src.memory.profile import get_or_create_learning_profile
from src.memory.recommendation_log import mark_completed
from src.models import GameAttempt, User, UserGameProgress
from src.models.events import AIGeneratedGame
from src.services.streak_service import touch_daily_streak

if TYPE_CHECKING:
    from src.routes.games import GameCompleteRequest


class GameService:
    """Serve conteudo de jogos para alunos (somente leitura)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def published(self) -> list[AIGeneratedGame]:
        return list(
            self.db.scalars(
                select(AIGeneratedGame)
                .where(AIGeneratedGame.status == "approved")
                .order_by(AIGeneratedGame.created_at.desc())
            )
        )

    def complete(self, *, user: User, payload: GameCompleteRequest) -> tuple[GameAttempt, list[dict]]:
        """Registra uma tentativa de jogo: GameAttempt, UserGameProgress, sinais cognitivos no
        perfil, LearningOutcome, vinculo com a recomendacao e streak diario. Commit unico aqui."""
        accuracy = round((payload.score / payload.total) * 100) if payload.total else 0
        completed_at = datetime.now(UTC)
        started_at = completed_at - timedelta(seconds=payload.duration_seconds)

        attempt = GameAttempt(
            user_id=user.id,
            game_id=payload.game_id,
            score=payload.score,
            total=payload.total,
            accuracy=accuracy,
            duration_seconds=payload.duration_seconds,
            cognitive_outcomes=[o.model_dump() for o in payload.cognitive_outcomes],
            started_at=started_at,
            completed_at=completed_at,
        )
        self.db.add(attempt)
        self.db.flush()  # popula attempt.id — usado como source_id do LearningOutcome abaixo.

        row = self.db.query(UserGameProgress).filter(
            UserGameProgress.user_id == user.id,
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
                user_id=user.id,
                game_id=payload.game_id,
                plays=1,
                best_score=payload.score,
                best_accuracy=accuracy,
                progress=accuracy,
                last_played_at=completed_at,
            )
            self.db.add(row)

        profile = get_or_create_learning_profile(self.db, user.id)
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
                self.db,
                user_id=user.id,
                cognitive_issue_code=issue_code,
                source="GAME",
                source_id=attempt.id,
                direction=direction,
            )
            self.db.flush()
            if first_learning_outcome_id is None:
                first_learning_outcome_id = learning_outcome.id
        profile.cognitive_issues = issues

        if payload.recommendation_log_id is not None:
            # REQ-17/REQ-18: vinculo frouxo — log inexistente/de outro usuario nao bloqueia o fluxo.
            mark_completed(
                self.db,
                log_id=payload.recommendation_log_id,
                user_id=user.id,
                learning_outcome_id=first_learning_outcome_id,
            )

        self.db.commit()
        self.db.refresh(attempt)
        touch_daily_streak(self.db, user)

        issue_updates = [
            {
                "code": code,
                "previous_state": (issues_before.get(code) or {}).get("state"),
                "new_state": (issues.get(code) or {}).get("state"),
            }
            for code in touched_codes
        ]
        return attempt, issue_updates
