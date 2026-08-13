from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.agents.game_generator import GameGeneratorAgent
from src.middlewares.errors import AppError
from src.models.events import AIGeneratedGame
from src.schemas.admin import AIGeneratedGameRead, GameQuestionRead
from src.services.ai_telemetry import record_ai_interaction
from src.services.content_versioning import record_version
from src.utils.ai_idempotency import find_cached_generation
from src.utils.game_questions import assign_question_ids


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
        idempotency_key: str | None = None,
    ) -> AIGeneratedGameRead:
        cached = find_cached_generation(
            self.db, user_id=admin_user_id, workflow="admin_game_generation", idempotency_key=idempotency_key
        )
        if cached is not None and cached.content_id is not None:
            existing = self.db.get(AIGeneratedGame, cached.content_id)
            if existing is not None:
                return self._game_to_read(existing)

        agent = GameGeneratorAgent()
        result = agent.generate(skill=skill, category=category, difficulty=difficulty, count=count, user_id=admin_user_id)
        game = AIGeneratedGame(
            name=name or result.name,
            category=category,
            skill=skill,
            difficulty=difficulty,
            questions=assign_question_ids(
                [{"prompt": q.prompt, "options": q.options, "answer_index": q.answer_index, "explanation": q.explanation} for q in result.questions]
            )[0],
            status="pending",
        )
        self.db.add(game)
        self.db.flush()  # popula game.id — usado como content_id do AIInteractionLog abaixo.
        record_ai_interaction(
            self.db,
            workflow="admin_game_generation",
            agent="GameGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"skill": skill, "category": category, "difficulty": difficulty, "count": count},
            content_id=game.id,
            content_type="AIGeneratedGame",
            idempotency_key=idempotency_key,
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
        targets: list[str] | None,
        reviewer_id: int,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        if targets is not None:
            game.targets = targets
        if action == "approve" and not game.targets:
            raise AppError(
                "Defina ao menos um problema cognitivo treinado antes de aprovar.",
                status_code=422,
                code="game_target_required",
            )
        if (questions is not None and questions != game.questions) or (name is not None and name != game.name):
            # REQ-7 (P2c): snapshot do estado ANTES da sobrescrita — grava so quando o conteudo
            # de fato muda, nao a cada review sem edicao.
            record_version(
                self.db,
                content_type="AIGeneratedGame",
                content_id=game.id,
                snapshot={"name": game.name, "questions": game.questions},
                edited_by=reviewer_id,
            )
        game.status = "approved" if action == "approve" else "rejected"
        game.reviewed_at = datetime.now(timezone.utc)
        game.reviewed_by = reviewer_id
        if notes is not None:
            game.admin_notes = notes
        if questions is not None and questions != game.questions:
            game.questions = questions
            game.edited_after_generation = True
        if name is not None and name != game.name:
            game.name = name
            game.edited_after_generation = True
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def update_game(
        self,
        game_id: int,
        *,
        name: str | None = None,
        questions: list[dict] | None = None,
        targets: list[str] | None = None,
        admin_user_id: int | None = None,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        if (name is not None and name != game.name) or (questions is not None and questions != game.questions):
            record_version(
                self.db,
                content_type="AIGeneratedGame",
                content_id=game.id,
                snapshot={"name": game.name, "questions": game.questions},
                edited_by=admin_user_id,
            )
        if name is not None and name != game.name:
            game.name = name
            game.edited_after_generation = True
        if questions is not None and questions != game.questions:
            game.questions = questions
            game.edited_after_generation = True
        if targets is not None:
            game.targets = targets
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def add_question(
        self,
        game_id: int,
        *,
        prompt: str,
        options: list[str],
        answer_index: int,
        explanation: str,
        admin_user_id: int | None,
    ) -> AIGeneratedGameRead:
        game = self._get_or_404(game_id)
        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "questions": game.questions},
            edited_by=admin_user_id,
        )
        new_question = {
            "id": uuid4().hex[:8],
            "prompt": prompt,
            "options": options,
            "answer_index": answer_index,
            "explanation": explanation,
        }
        game.questions = [*(game.questions or []), new_question]
        game.edited_after_generation = True
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def remove_question(self, game_id: int, *, question_id: str, admin_user_id: int | None) -> AIGeneratedGameRead:
        game = self._get_or_404(game_id)
        questions = game.questions or []
        if not any(q.get("id") == question_id for q in questions):
            raise AppError("Pergunta não encontrada.", status_code=404, code="question_not_found")
        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "questions": game.questions},
            edited_by=admin_user_id,
        )
        game.questions = [q for q in questions if q.get("id") != question_id]
        game.edited_after_generation = True
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def reorder_questions(self, game_id: int, *, question_ids: list[str], admin_user_id: int | None) -> AIGeneratedGameRead:
        game = self._get_or_404(game_id)
        questions = game.questions or []
        current_ids = {q.get("id") for q in questions}
        if set(question_ids) != current_ids or len(question_ids) != len(questions):
            raise AppError(
                "A nova ordem precisa conter exatamente as perguntas já existentes no jogo.",
                status_code=422,
                code="invalid_question_order",
            )
        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "questions": game.questions},
            edited_by=admin_user_id,
        )
        by_id = {q.get("id"): q for q in questions}
        game.questions = [by_id[qid] for qid in question_ids]
        game.edited_after_generation = True
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def regenerate_question(
        self,
        game_id: int,
        *,
        question_id: str,
        admin_user_id: int | None,
        idempotency_key: str | None = None,
    ) -> AIGeneratedGameRead:
        game = self._get_or_404(game_id)
        questions = game.questions or []
        if not any(q.get("id") == question_id for q in questions):
            raise AppError("Pergunta não encontrada.", status_code=404, code="question_not_found")

        # REQ-5: gera so 1 pergunta, com skill/category/difficulty do jogo — preserva competencia
        # e dificuldade configuradas, nunca regenera as demais perguntas.
        agent = GameGeneratorAgent()
        result = agent.generate(
            skill=game.skill,
            category=game.category,
            difficulty=game.difficulty,
            count=1,
            user_id=admin_user_id,
        )
        generated = result.questions[0]

        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "questions": game.questions},
            edited_by=admin_user_id,
        )
        game.questions = [
            {
                "id": question_id,
                "prompt": generated.prompt,
                "options": generated.options,
                "answer_index": generated.answer_index,
                "explanation": generated.explanation,
            }
            if q.get("id") == question_id
            else q
            for q in questions
        ]
        game.edited_after_generation = True
        self.db.flush()
        record_ai_interaction(
            self.db,
            workflow="admin_game_question_regeneration",
            agent="GameGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"game_id": game.id, "question_id": question_id, "skill": game.skill, "difficulty": game.difficulty},
            content_id=game.id,
            content_type="AIGeneratedGame",
            idempotency_key=idempotency_key,
        )
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def _get_or_404(self, game_id: int) -> AIGeneratedGame:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        return game

    def archive_game(self, game_id: int) -> AIGeneratedGameRead:
        """REQ-11 (P2c): despublica reversivelmente — jogo some de /games/published
        (que so serve status=='approved') mas continua no banco."""
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        game.status = "archived"
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def unarchive_game(self, game_id: int) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        game.status = "approved"
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def delete_game(self, game_id: int) -> None:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        self.db.delete(game)
        self.db.commit()

    def _game_to_read(self, game: AIGeneratedGame) -> AIGeneratedGameRead:
        # REQ-12: jogos gravados antes do P3a (sem id por pergunta) continuam legiveis — o backfill
        # e persistido aqui pra as proximas leituras/edicoes ja acharem o id estavel.
        backfilled, changed = assign_question_ids(game.questions or [])
        if changed:
            game.questions = backfilled
            self.db.commit()
            self.db.refresh(game)
        questions = [
            GameQuestionRead(
                id=q["id"],
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
            questions=questions,
            status=game.status,
            admin_notes=game.admin_notes,
            targets=game.targets or [],
            edited_after_generation=game.edited_after_generation,
            created_at=game.created_at,
            reviewed_at=game.reviewed_at,
        )
