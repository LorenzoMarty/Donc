from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.agents.game_generator import GameGeneratorAgent
from src.middlewares.errors import AppError
from src.models.events import AIGeneratedGame
from src.schemas.admin import AIGeneratedGameRead, GameQuestionRead
from src.services.ai_telemetry import record_ai_interaction


class AdminGameReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def generate_game(
        self,
        *,
        skill: str,
        category: str,
        difficulty: str,
        count: int,
        name: str | None,
        admin_user_id: int,
    ) -> AIGeneratedGameRead:
        agent = GameGeneratorAgent()
        result = agent.generate(skill=skill, category=category, difficulty=difficulty, count=count, user_id=admin_user_id)
        game = AIGeneratedGame(
            name=name or result.name,
            category=category,
            skill=skill,
            difficulty=difficulty,
            xp_reward=40,
            questions=[{"prompt": q.prompt, "options": q.options, "answer_index": q.answer_index, "explanation": q.explanation} for q in result.questions],
            status="pending",
        )
        self.db.add(game)
        record_ai_interaction(
            self.db,
            workflow="admin_game_generation",
            agent="GameGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"skill": skill, "category": category, "difficulty": difficulty, "count": count},
        )
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def list_ai_games(self, status: str | None = None) -> list[AIGeneratedGameRead]:
        query = select(AIGeneratedGame).order_by(AIGeneratedGame.created_at.desc())
        if status:
            query = query.where(AIGeneratedGame.status == status)
        games = self.db.scalars(query).all()
        return [self._game_to_read(g) for g in games]

    def review_game(
        self,
        game_id: int,
        *,
        action: str,
        notes: str | None,
        questions: list[dict] | None,
        name: str | None,
        xp_reward: int | None,
        reviewer_id: int,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        game.status = "approved" if action == "approve" else "rejected"
        game.reviewed_at = datetime.now(timezone.utc)
        game.reviewed_by = reviewer_id
        if notes is not None:
            game.admin_notes = notes
        if questions is not None:
            game.questions = questions
        if name is not None:
            game.name = name
        if xp_reward is not None:
            game.xp_reward = xp_reward
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def update_game(
        self,
        game_id: int,
        *,
        name: str | None = None,
        xp_reward: int | None = None,
        questions: list[dict] | None = None,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        if name is not None:
            game.name = name
        if xp_reward is not None:
            game.xp_reward = xp_reward
        if questions is not None:
            game.questions = questions
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def delete_game(self, game_id: int) -> None:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo nao encontrado.", status_code=404, code="game_not_found")
        self.db.delete(game)
        self.db.commit()

    def _game_to_read(self, game: AIGeneratedGame) -> AIGeneratedGameRead:
        questions = [
            GameQuestionRead(
                prompt=q.get("prompt", ""),
                options=q.get("options", []),
                answer_index=q.get("answer_index", 0),
                explanation=q.get("explanation", ""),
            )
            for q in (game.questions or [])
        ]
        return AIGeneratedGameRead(
            id=game.id,
            name=game.name,
            category=game.category,
            skill=game.skill,
            difficulty=game.difficulty,
            xp_reward=game.xp_reward,
            questions=questions,
            status=game.status,
            admin_notes=game.admin_notes,
            created_at=game.created_at,
            reviewed_at=game.reviewed_at,
        )
