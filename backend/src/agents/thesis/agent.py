from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import ThesisAnalysis
from src.prompts.agent_instructions import THESIS_INSTRUCTIONS


class ThesisAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        *,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ThesisAnalysis:
        fallback = self._fallback(theme=theme, content=content)
        prompt = f"""
{THESIS_INSTRUCTIONS}

Tema: {theme}
Redacao:
{content}
"""
        return self.runner.run_structured(
            agent_name="ThesisAgent",
            description="Analisa tese, recorte e forca argumentativa de redacoes ENEM.",
            instructions=THESIS_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ThesisAnalysis,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, theme: str, content: str) -> ThesisAnalysis:
        first_paragraph = next((p.strip() for p in content.split("\n") if p.strip()), "")
        thesis_markers = re.findall(r"\b(portanto|logo|desse modo|nesse sentido|dessa forma|assim|e necessario|deve)\b", first_paragraph, re.I)
        thesis_present = len(first_paragraph.split()) >= 25 and bool(thesis_markers or re.search(r"\b(problema|desafio|necessario|urgente)\b", first_paragraph, re.I))
        clarity = 76 if thesis_present else 48
        strength = 72 if re.search(r"\b(causa|consequencia|responsabilidade|desigualdade|politica|social)\b", content, re.I) else 52
        issues = [] if thesis_present else ["A tese ainda nao aparece com posicao clara na introducao."]
        improvements = [
            "Explicite o problema social e a posicao defendida ja na introducao.",
            "Antecipe dois eixos argumentativos que possam orientar os paragrafos de desenvolvimento.",
        ]
        return ThesisAnalysis(
            thesis_present=thesis_present,
            thesis=first_paragraph[:360] or f"Recorte em construcao sobre {theme}.",
            clarity_score=clarity,
            argument_strength=strength,
            issues=issues,
            improvements=improvements,
        )
