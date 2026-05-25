from __future__ import annotations

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import DifficultyLevel, ExerciseGenerationResult, GeneratedQuizQuestion
from src.prompts.agent_instructions import EXERCISE_INSTRUCTIONS


class ExerciseGeneratorAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def generate(
        self,
        *,
        focus: str,
        difficulty: DifficultyLevel = "medium",
        count: int = 3,
        profile: dict | None = None,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ExerciseGenerationResult:
        fallback = self._fallback(focus=focus, difficulty=difficulty, count=count)
        prompt = f"""
Foco: {focus}
Dificuldade: {difficulty}
Quantidade: {count}
Perfil consolidado: {profile or {}}
"""
        return self.runner.run_structured(
            agent_name="ExerciseGeneratorAgent",
            description="Gera quizzes personalizados para treino de redacao ENEM.",
            instructions=EXERCISE_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ExerciseGenerationResult,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, focus: str, difficulty: DifficultyLevel, count: int) -> ExerciseGenerationResult:
        questions = []
        for index in range(max(1, min(count, 5))):
            questions.append(
                GeneratedQuizQuestion(
                    statement=f"Qual alternativa melhora mais o foco '{focus}' em uma redacao ENEM?",
                    options=[
                        "A) Copiar a frase do tema sem desenvolver.",
                        "B) Relacionar tese, evidencia e consequencia social.",
                        "C) Encerrar com opiniao sem proposta.",
                        "D) Usar repertorio sem explicar conexao.",
                        "E) Repetir o mesmo conectivo em todos os paragrafos.",
                    ],
                    correct_answer="B",
                    explanation="A alternativa B articula projeto argumentativo, evidencia e impacto social, que e o centro do treino.",
                    skill=focus,
                    difficulty=difficulty,
                )
            )
        return ExerciseGenerationResult(
            focus=focus,
            difficulty=difficulty,
            questions=questions,
            adaptation_reason="Fallback calibrado pelo foco informado e pelo nivel solicitado.",
        )
