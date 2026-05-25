from __future__ import annotations

from src.agents.base import AgnoAgentRunner
from src.agents.correction.fallback import FallbackCorrectionProvider
from src.agents.schemas import ENEMCompetencyAnalysis, GrammarAnalysis, RepertoireAnalysis, ThesisAnalysis
from src.prompts.agent_instructions import ENEM_COMPETENCY_INSTRUCTIONS


class ENEMCompetencyAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()
        self.fallback = FallbackCorrectionProvider()

    def evaluate(
        self,
        *,
        theme: str,
        content: str,
        thesis: ThesisAnalysis,
        grammar: GrammarAnalysis,
        repertoire: RepertoireAnalysis,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ENEMCompetencyAnalysis:
        fallback = self._fallback(theme=theme, content=content, thesis=thesis, grammar=grammar, repertoire=repertoire)
        prompt = f"""
Tema: {theme}
Analise da tese: {thesis.model_dump_json()}
Analise gramatical: {grammar.model_dump_json()}
Analise de repertorio: {repertoire.model_dump_json()}

Redacao:
{content}
"""
        return self.runner.run_structured(
            agent_name="ENEMCompetencyAgent",
            description="Avalia competencias 1 a 5 da matriz ENEM com justificativa pedagogica.",
            instructions=ENEM_COMPETENCY_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ENEMCompetencyAnalysis,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(
        self,
        *,
        theme: str,
        content: str,
        thesis: ThesisAnalysis,
        grammar: GrammarAnalysis,
        repertoire: RepertoireAnalysis,
    ) -> ENEMCompetencyAnalysis:
        base = self.fallback.correct(theme=theme, content=content)
        c1 = self.fallback._round_competency(grammar.grammar_score * 2)
        c2 = base.competency_2
        c3 = self.fallback._round_competency(int((thesis.argument_strength + repertoire.repertoire_score) * 1.05))
        c4 = self.fallback._round_competency(grammar.cohesion_score * 2)
        c5 = base.competency_5
        scores = {"c1": c1, "c2": c2, "c3": c3, "c4": c4, "c5": c5}
        weak = [key for key, value in scores.items() if value < 160]
        return ENEMCompetencyAnalysis(
            c1=c1,
            c2=c2,
            c3=c3,
            c4=c4,
            c5=c5,
            justifications={
                "c1": "Pontuacao estimada por dominio de norma-padrao e formalidade.",
                "c2": "Pontuacao estimada por estrutura, recorte tematico e atendimento ao genero dissertativo-argumentativo.",
                "c3": "Pontuacao estimada por projeto argumentativo, tese e repertorio.",
                "c4": "Pontuacao estimada por coesao e progressao textual.",
                "c5": "Pontuacao estimada por presenca e detalhamento da intervencao.",
            },
            pedagogical_feedback=[
                "Priorize a competencia mais baixa no proximo treino.",
                "Reescreva um paragrafo de desenvolvimento conectando tese, repertorio e consequencia.",
            ],
            weak_competencies=weak,
        )
