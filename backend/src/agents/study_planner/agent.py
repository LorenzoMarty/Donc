from __future__ import annotations

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import DifficultyLevel, RecommendationResult, StudyPlanDay, StudyPlanResult
from src.prompts.agent_instructions import STUDY_PLANNER_INSTRUCTIONS


class StudyPlannerAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def recommend(
        self,
        *,
        profile: dict,
        history: dict,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> RecommendationResult:
        fallback = RecommendationResult(
            lessons=["Tese forte em 3 movimentos", "Competencia 5 sem formula vazia", "Pontuacao que muda sentido"],
            games=["Desafio de conectivos", "Sprint da intervencao", "Mapa de repertorio"],
            skills=["Competencia 3", "Competencia 4", "Competencia 5"],
            difficulty=self._difficulty(history),
            rationale="Recomendacao baseada em padroes recorrentes e competencias mais fracas.",
        )
        prompt = f"""
Gere recomendacoes de aulas, jogos e habilidades.
Perfil: {profile}
Historico: {history}
"""
        return self.runner.run_structured(
            agent_name="StudyPlannerAgent",
            description="Recomenda aulas, jogos e habilidades para estudo personalizado.",
            instructions=STUDY_PLANNER_INSTRUCTIONS,
            prompt=prompt,
            output_schema=RecommendationResult,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def plan(
        self,
        *,
        profile: dict,
        history: dict,
        days: int = 7,
        minutes_per_day: int = 45,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> StudyPlanResult:
        days = max(1, min(days, 30))
        minutes_per_day = max(10, min(minutes_per_day, 180))
        fallback = self._fallback_plan(days=days, minutes_per_day=minutes_per_day)
        prompt = f"""
Dias: {days}
Minutos por dia: {minutes_per_day}
Perfil: {profile}
Historico: {history}
"""
        return self.runner.run_structured(
            agent_name="StudyPlannerAgent",
            description="Cria plano de estudo adaptativo para redacao ENEM.",
            instructions=STUDY_PLANNER_INSTRUCTIONS,
            prompt=prompt,
            output_schema=StudyPlanResult,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback_plan(self, *, days: int, minutes_per_day: int) -> StudyPlanResult:
        focuses = ["tese", "argumentacao", "repertorio", "coesao", "intervencao"]
        plan_days = [
            StudyPlanDay(
                day=index + 1,
                focus=focuses[index % len(focuses)],
                activities=[
                    "Revisar uma aula curta do curso Destrave a redacao.",
                    "Resolver um quiz objetivo.",
                    "Reescrever um trecho da ultima redacao.",
                ],
                minutes=minutes_per_day,
                expected_outcome="Produzir uma melhoria pontual aplicavel na proxima versao.",
            )
            for index in range(days)
        ]
        return StudyPlanResult(
            horizon_days=days,
            weekly_goal="Elevar consistencia nas competencias mais fracas da matriz ENEM.",
            days=plan_days,
            review_strategy="Ao final da semana, comparar a nova redacao com a correcao anterior e revisar padroes recorrentes.",
        )

    def _difficulty(self, history: dict) -> DifficultyLevel:
        average = history.get("average_score", 0)
        if average >= 840:
            return "hard"
        if average >= 700:
            return "medium"
        return "easy"
