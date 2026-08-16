from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.agents.game_generator import GameGeneratorAgent, GamePayloadItemAgent, SUPPORTED_PAYLOAD_ENGINES
from src.middlewares.errors import AppError
from src.models.events import AIGeneratedGame
from src.schemas.admin import AIGeneratedGameRead, GameQuestionRead
from src.services.ai_telemetry import record_ai_interaction
from src.services.content_versioning import record_version
from src.utils.game_questions import QUESTION_BASED_ENGINES, assign_question_ids


class AdminGameReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db

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
        payload: dict | None = None,
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
        content_changed = (
            (questions is not None and questions != game.questions)
            or (payload is not None and payload != game.payload)
            or (name is not None and name != game.name)
        )
        if content_changed:
            # REQ-7 (P2c): snapshot do estado ANTES da sobrescrita — grava so quando o conteudo
            # de fato muda, nao a cada review sem edicao.
            record_version(
                self.db,
                content_type="AIGeneratedGame",
                content_id=game.id,
                snapshot={"name": game.name, "questions": game.questions, "payload": game.payload},
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
        if payload is not None and payload != game.payload:
            game.payload = payload
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
        payload: dict | None = None,
        targets: list[str] | None = None,
        admin_user_id: int | None = None,
    ) -> AIGeneratedGameRead:
        game = self.db.get(AIGeneratedGame, game_id)
        if not game:
            raise AppError("Jogo não encontrado.", status_code=404, code="game_not_found")
        content_changed = (
            (name is not None and name != game.name)
            or (questions is not None and questions != game.questions)
            or (payload is not None and payload != game.payload)
        )
        if content_changed:
            record_version(
                self.db,
                content_type="AIGeneratedGame",
                content_id=game.id,
                snapshot={"name": game.name, "questions": game.questions, "payload": game.payload},
                edited_by=admin_user_id,
            )
        if name is not None and name != game.name:
            game.name = name
            game.edited_after_generation = True
        if questions is not None and questions != game.questions:
            game.questions = questions
            game.edited_after_generation = True
        if payload is not None and payload != game.payload:
            game.payload = payload
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

    def generate_more_questions(
        self,
        game_id: int,
        *,
        count: int,
        admin_user_id: int | None,
        idempotency_key: str | None = None,
    ) -> AIGeneratedGameRead:
        """REQ-2 (jogo-ia-perguntas-existentes): gera novas perguntas por IA reusando
        skill/categoria/dificuldade do jogo e as anexa como `pending` — nao mexe nas ja existentes,
        nao republica nada sozinho (fica a cargo de review_question).

        REQ-6 (migrar-jogos-estaticos-para-banco): so suportado pra engines baseados em
        `questions` — os outros 9 usam `payload` num formato que o GameGeneratorAgent nao sabe
        gerar ainda."""
        game = self._get_or_404(game_id)
        if game.engine not in QUESTION_BASED_ENGINES:
            raise AppError(
                f"Gerar perguntas com IA ainda não é suportado para o engine \"{game.engine}\".",
                status_code=422,
                code="unsupported_engine_for_ai_generation",
            )
        agent = GameGeneratorAgent()
        result = agent.generate(
            skill=game.skill,
            category=game.category,
            difficulty=game.difficulty,
            count=count,
            user_id=admin_user_id,
        )
        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "questions": game.questions},
            edited_by=admin_user_id,
        )
        new_questions, _ = assign_question_ids(
            [
                {
                    "prompt": q.prompt,
                    "options": q.options,
                    "answer_index": q.answer_index,
                    "explanation": q.explanation,
                    "status": "pending",
                }
                for q in result.questions
            ]
        )
        game.questions = [*(game.questions or []), *new_questions]
        self.db.flush()
        record_ai_interaction(
            self.db,
            workflow="admin_game_question_addition",
            agent="GameGeneratorAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"game_id": game.id, "count": count, "skill": game.skill, "difficulty": game.difficulty},
            content_id=game.id,
            content_type="AIGeneratedGame",
            idempotency_key=idempotency_key,
        )
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def generate_payload_items(
        self,
        game_id: int,
        *,
        count: int,
        admin_user_id: int | None,
        idempotency_key: str | None = None,
    ) -> AIGeneratedGameRead:
        """Gera rodada(s)/caso(s)/escada(s) novo(s) via IA pros engines nao-quiz e anexa ao
        `payload` existente — equivalente a `generate_more_questions`, so que pro outro formato
        de conteudo. `survival` fica de fora (nao guarda conteudo proprio, so pool de jogos)."""
        game = self._get_or_404(game_id)
        if game.engine not in SUPPORTED_PAYLOAD_ENGINES:
            raise AppError(
                f"Gerar conteúdo com IA não é suportado para o engine \"{game.engine}\".",
                status_code=422,
                code="unsupported_engine_for_ai_generation",
            )
        payload = dict(game.payload or {})
        existing_buckets = [b.get("label") for b in payload.get("buckets", []) if b.get("label")] if game.engine == "classify" else None

        agent = GamePayloadItemAgent()
        result = agent.generate(
            engine=game.engine,
            skill=game.skill,
            category=game.category,
            difficulty=game.difficulty,
            count=count,
            existing_buckets=existing_buckets,
            user_id=admin_user_id,
        )
        record_version(
            self.db,
            content_type="AIGeneratedGame",
            content_id=game.id,
            snapshot={"name": game.name, "payload": game.payload},
            edited_by=admin_user_id,
        )
        game.payload = _merge_payload_items(game.engine, payload, result)
        game.edited_after_generation = True
        self.db.flush()
        record_ai_interaction(
            self.db,
            workflow="admin_game_payload_generation",
            agent="GamePayloadItemAgent",
            user_id=admin_user_id,
            runner=agent.runner,
            meta={"game_id": game.id, "engine": game.engine, "count": count, "skill": game.skill, "difficulty": game.difficulty},
            content_id=game.id,
            content_type="AIGeneratedGame",
            idempotency_key=idempotency_key,
        )
        self.db.commit()
        self.db.refresh(game)
        return self._game_to_read(game)

    def review_question(
        self,
        game_id: int,
        *,
        question_id: str,
        action: str,
        admin_user_id: int | None,
    ) -> AIGeneratedGameRead:
        """REQ-5: aprova/rejeita 1 pergunta pendente sem reabrir a revisao do jogo inteiro."""
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
        if action == "approve":
            game.questions = [
                {**q, "status": "approved"} if q.get("id") == question_id else q for q in questions
            ]
        else:
            game.questions = [q for q in questions if q.get("id") != question_id]
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
                status=q.get("status", "approved"),
            )
            for q in (game.questions or [])
        ]
        return AIGeneratedGameRead(
            id=game.id,
            name=game.name,
            category=game.category,
            skill=game.skill,
            difficulty=game.difficulty,
            engine=game.engine,
            questions=questions,
            payload=game.payload,
            description=game.description,
            thumbnail=game.thumbnail,
            estimated_time=game.estimated_time,
            status=game.status,
            admin_notes=game.admin_notes,
            targets=game.targets or [],
            edited_after_generation=game.edited_after_generation,
            created_at=game.created_at,
            reviewed_at=game.reviewed_at,
        )


def _merge_payload_items(engine: str, payload: dict, result) -> dict:
    """Converte o resultado tipado da IA pro formato bruto de `payload` que o frontend espera
    (mesmo shape que `GamePayloadEditor` grava manualmente) e anexa aos itens ja existentes."""
    if engine == "order":
        new_rounds = [{"id": uuid4().hex[:8], "instruction": r.instruction, "items": r.items, "explanation": r.explanation} for r in result.rounds]
        return {**payload, "rounds": [*payload.get("rounds", []), *new_rounds]}

    if engine == "fill-blank":
        new_rounds = [{"id": uuid4().hex[:8], "prompt": r.prompt, "accepted": r.accepted, "explanation": r.explanation} for r in result.rounds]
        return {**payload, "rounds": [*payload.get("rounds", []), *new_rounds]}

    if engine == "duel":
        new_rounds = [
            {"id": uuid4().hex[:8], "context": r.context, "a": r.a, "b": r.b, "winner": r.winner, "dimension": r.dimension, "explanation": r.explanation}
            for r in result.rounds
        ]
        return {**payload, "rounds": [*payload.get("rounds", []), *new_rounds]}

    if engine == "argument-escalation":
        new_ladders = [
            {
                "id": uuid4().hex[:8],
                "theme": ladder.theme,
                "rungs": [
                    {"level": rung.level, "instruction": rung.instruction, "options": [o.model_dump() for o in rung.options]}
                    for rung in ladder.rungs
                ],
            }
            for ladder in result.ladders
        ]
        return {**payload, "ladders": [*payload.get("ladders", []), *new_ladders]}

    if engine == "artificiality":
        new_rounds = [{"id": uuid4().hex[:8], "passage": r.passage, "verdict": r.verdict, "explanation": r.explanation} for r in result.rounds]
        return {**payload, "rounds": [*payload.get("rounds", []), *new_rounds]}

    if engine == "corrector":
        new_cases = [
            {
                "id": uuid4().hex[:8],
                "paragraph": c.paragraph,
                "candidates": [
                    {"id": uuid4().hex[:8], "label": cand.label, "competency": cand.competency, "present": cand.present, "note": ""}
                    for cand in c.candidates
                ],
            }
            for c in result.cases
        ]
        return {**payload, "cases": [*payload.get("cases", []), *new_cases]}

    if engine == "essay-collapse":
        new_rounds = [
            {
                "id": uuid4().hex[:8],
                "brief": r.brief,
                "fragments": [{"id": uuid4().hex[:8], "text": text, "correctIndex": i} for i, text in enumerate(r.fragments)],
                "connectors": [],
                "explanation": r.explanation,
            }
            for r in result.rounds
        ]
        return {**payload, "rounds": [*payload.get("rounds", []), *new_rounds]}

    if engine == "text-surgery":
        def raw_segment(seg):
            if seg.kind == "text":
                return seg.text or ""
            return {"slotId": uuid4().hex[:8], "mode": "choice", "options": [o.model_dump() for o in (seg.options or [])]}

        new_cases = [{"id": uuid4().hex[:8], "brief": c.brief, "segments": [raw_segment(s) for s in c.segments]} for c in result.cases]
        return {**payload, "cases": [*payload.get("cases", []), *new_cases]}

    # classify
    existing_buckets = list(payload.get("buckets", []))
    label_to_id = {b.get("label"): b.get("id") for b in existing_buckets}
    new_buckets = list(existing_buckets)
    for label in result.buckets:
        if label not in label_to_id:
            bucket_id = uuid4().hex[:8]
            label_to_id[label] = bucket_id
            new_buckets.append({"id": bucket_id, "label": label})

    fallback_bucket_id = new_buckets[0]["id"] if new_buckets else uuid4().hex[:8]
    new_items = [
        {"id": uuid4().hex[:8], "text": item.text, "bucketId": label_to_id.get(item.bucket, fallback_bucket_id)}
        for item in result.items
    ]
    return {**payload, "buckets": new_buckets, "items": [*payload.get("items", []), *new_items]}
