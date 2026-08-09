"""Relatorio de qualidade do conteudo pedagogico — P1 Bloco 10 (REQ-29..31).

Objetivo e so encontrar rapidamente conteudo que nao consegue participar do sistema adaptativo:
sem target, nunca usado pelo aluno, jogo IA rejeitado/editado apos geracao, e quantos itens cada
CognitiveIssue tem disponivel. Leitura pura — nenhuma mutacao de dados aqui.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.memory.cognitive_issues import ISSUE_CODES
from src.models import Exercise, ExerciseAnswer, GameAttempt, Lesson, LessonProgress
from src.models.events import AIGeneratedGame
from src.schemas.admin import AdminContentQualityResponse, ContentByIssueRow, ContentQualityItem


class AdminContentQualityService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def report(self) -> AdminContentQualityResponse:
        lessons = list(self.db.scalars(select(Lesson)))
        exercises = list(self.db.scalars(select(Exercise)))
        games = list(self.db.scalars(select(AIGeneratedGame)))

        used_lesson_ids = set(self.db.scalars(select(LessonProgress.lesson_id)))
        used_exercise_ids = set(self.db.scalars(select(ExerciseAnswer.exercise_id)))
        used_game_ids = {
            gid.removeprefix("ai-")
            for gid in self.db.scalars(select(GameAttempt.game_id))
            if gid.startswith("ai-") and gid.removeprefix("ai-").isdigit()
        }

        content_by_issue = {code: {"lessons": 0, "exercises": 0, "games": 0} for code in sorted(ISSUE_CODES)}
        for lesson in lessons:
            for code in lesson.targets or []:
                if code in content_by_issue:
                    content_by_issue[code]["lessons"] += 1
        for exercise in exercises:
            for code in exercise.targets or []:
                if code in content_by_issue:
                    content_by_issue[code]["exercises"] += 1
        for game in games:
            for code in game.targets or []:
                if code in content_by_issue:
                    content_by_issue[code]["games"] += 1

        return AdminContentQualityResponse(
            lessons_without_target=[
                ContentQualityItem(id=lesson.id, label=lesson.title, kind="lesson") for lesson in lessons if not lesson.targets
            ],
            exercises_without_target=[
                ContentQualityItem(id=exercise.id, label=exercise.statement[:80], kind="exercise")
                for exercise in exercises
                if not exercise.targets
            ],
            games_without_target=[
                ContentQualityItem(id=game.id, label=game.name, kind="game") for game in games if not game.targets
            ],
            unused_lessons=[
                ContentQualityItem(id=lesson.id, label=lesson.title, kind="lesson")
                for lesson in lessons
                if lesson.id not in used_lesson_ids
            ],
            unused_exercises=[
                ContentQualityItem(id=exercise.id, label=exercise.statement[:80], kind="exercise")
                for exercise in exercises
                if exercise.id not in used_exercise_ids
            ],
            unused_games=[
                ContentQualityItem(id=game.id, label=game.name, kind="game")
                for game in games
                if game.status == "approved" and str(game.id) not in used_game_ids
            ],
            rejected_games=[
                ContentQualityItem(id=game.id, label=game.name, kind="game") for game in games if game.status == "rejected"
            ],
            edited_games=[
                ContentQualityItem(id=game.id, label=game.name, kind="game") for game in games if game.edited_after_generation
            ],
            content_by_issue=[
                ContentByIssueRow(code=code, lessons=counts["lessons"], exercises=counts["exercises"], games=counts["games"])
                for code, counts in content_by_issue.items()
            ],
        )
