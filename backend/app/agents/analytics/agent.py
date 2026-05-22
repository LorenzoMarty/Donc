from __future__ import annotations

from app.agents.base import AgnoAgentRunner
from app.agents.schemas import AnalyticsResult
from app.prompts.agent_instructions import ANALYTICS_INSTRUCTIONS


class AnalyticsAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        *,
        profile: dict,
        history: dict,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> AnalyticsResult:
        fallback = self._fallback(profile=profile, history=history)
        prompt = f"""
{ANALYTICS_INSTRUCTIONS}

Perfil: {profile}
Historico: {history}
"""
        return self.runner.run_structured(
            agent_name="AnalyticsAgent",
            description="Analisa evolucao, fraquezas e padroes recorrentes do estudante.",
            instructions=ANALYTICS_INSTRUCTIONS,
            prompt=prompt,
            output_schema=AnalyticsResult,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, profile: dict, history: dict) -> AnalyticsResult:
        weak = list((profile.get("weak_competencies") or {}).keys()) or ["c3", "c5"]
        patterns = profile.get("recurring_errors") or history.get("recurrent_errors") or ["repertorio pouco desenvolvido"]
        average = history.get("average_score", 0)
        level = "avancado" if average >= 840 else "intermediario" if average >= 700 else "em consolidacao"
        return AnalyticsResult(
            summary="O estudante deve priorizar ajustes de projeto argumentativo e intervencao para ganhar consistencia.",
            estimated_level=level,
            strengths=["Regularidade de treino", "Base tematica em desenvolvimento"],
            weaknesses=weak,
            recurrent_patterns=patterns[:6],
            next_focuses=["Competencia 3", "Competencia 5", "Coesao entre paragrafos"],
        )
