from __future__ import annotations

from src.agents.base import AgnoAgentRunner
from src.agents.correction.fallback import FallbackCorrectionProvider
from src.agents.schemas import (
    ENEMCompetencyAnalysis,
    EssayCorrectionResult,
    GrammarAnalysis,
    RepertoireAnalysis,
    ThesisAnalysis,
)
from src.prompts.agent_instructions import ESSAY_CONSOLIDATION_INSTRUCTIONS


class EssayCorrectionAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()
        self.fallback = FallbackCorrectionProvider()

    def consolidate(
        self,
        *,
        theme: str,
        context: str,
        content: str,
        thesis: ThesisAnalysis,
        grammar: GrammarAnalysis,
        repertoire: RepertoireAnalysis,
        competencies: ENEMCompetencyAnalysis,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> EssayCorrectionResult:
        fallback = self._fallback_result(
            theme=theme,
            content=content,
            thesis=thesis,
            grammar=grammar,
            repertoire=repertoire,
            competencies=competencies,
        )
        prompt = f"""
Tema: {theme}
Contexto: {context}

Analise da tese: {thesis.model_dump_json()}
Analise gramatical: {grammar.model_dump_json()}
Analise de repertorio: {repertoire.model_dump_json()}
Competencias ENEM: {competencies.model_dump_json()}

Redacao:
{content}
"""
        return self.runner.run_structured(
            agent_name="EssayCorrectionAgent",
            description="Consolida correcao ENEM com nota final e feedback pedagogico.",
            instructions=ESSAY_CONSOLIDATION_INSTRUCTIONS,
            prompt=prompt,
            output_schema=EssayCorrectionResult,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback_result(
        self,
        *,
        theme: str,
        content: str,
        thesis: ThesisAnalysis,
        grammar: GrammarAnalysis,
        repertoire: RepertoireAnalysis,
        competencies: ENEMCompetencyAnalysis,
    ) -> EssayCorrectionResult:
        base = self.fallback.correct(theme=theme, content=content)
        errors = list(dict.fromkeys([*base.errors, *grammar.mistakes, *thesis.issues, *repertoire.weak_connections]))[:8]
        suggestions = list(dict.fromkeys([*base.suggestions, *grammar.suggestions, *thesis.improvements, *repertoire.suggested_repertories]))[:8]
        strengths = list(base.strengths)
        if thesis.thesis_present:
            strengths.append("A tese aparece de forma identificavel no projeto de texto.")
        if repertoire.repertories_found:
            strengths.append("O texto tenta mobilizar repertorio sociocultural.")
        recurrent_patterns = list(dict.fromkeys([*base.recurrent_patterns, *competencies.weak_competencies]))
        return EssayCorrectionResult(
            total_score=competencies.c1 + competencies.c2 + competencies.c3 + competencies.c4 + competencies.c5,
            competency_1=competencies.c1,
            competency_2=competencies.c2,
            competency_3=competencies.c3,
            competency_4=competencies.c4,
            competency_5=competencies.c5,
            strengths=strengths[:6],
            errors=errors or base.errors,
            suggestions=suggestions or base.suggestions,
            feedback=(
                f"A correcao consolidada indica desempenho de {competencies.c1 + competencies.c2 + competencies.c3 + competencies.c4 + competencies.c5} pontos. "
                "O proximo passo e transformar observacoes gerais em ajustes concretos: tese mais direta, repertorio conectado e intervencao detalhada."
            ),
            recurrent_patterns=recurrent_patterns[:8],
        )
