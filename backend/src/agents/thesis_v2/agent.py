from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import ThesisAnalysisV2
from src.prompts.agent_instructions import THESIS_V2_INSTRUCTIONS

_TEMPLATE_PATTERNS = re.compile(
    r"\b(desde os primordios|ao longo dos seculos|e notorio que|nesse contexto|nesse sentido|"
    r"diante do exposto|outrossim|destarte|por conseguinte|e mister|e imperioso)\b",
    re.I,
)
_VAGUE_PATTERNS = re.compile(
    r"\b(algo|coisas|muito importante|deve-se pensar|e necessario refletir|muito significativo)\b",
    re.I,
)


class ThesisAnalyzerAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ThesisAnalysisV2:
        fallback = self._fallback(content=content)
        prompt = f"""Tema: {theme}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="ThesisAnalyzerAgent",
            description="Avalia qualidade e presença da tese; detecta tese vaga, genérica ou decorada.",
            instructions=THESIS_V2_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ThesisAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> ThesisAnalysisV2:
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n", content) if p.strip()]
        first = paragraphs[0] if paragraphs else ""
        words = first.split()
        thesis_present = len(words) >= 20 and re.search(
            r"\b(problema|desafio|necessario|urgente|deve|precisa|causa|consequencia|ameaca|prejudica)\b",
            first, re.I,
        ) is not None
        is_template = bool(_TEMPLATE_PATTERNS.search(first))
        is_vague = bool(_VAGUE_PATTERNS.search(first))
        is_generic = len(words) < 15 or is_vague
        if not thesis_present:
            score = 0
            clarity = "absent"
        elif is_template or is_generic:
            score = 35
            clarity = "vague"
        else:
            score = 65
            clarity = "clear"
        return ThesisAnalysisV2(
            thesis_present=thesis_present,
            thesis_text=first[:300] if thesis_present else "",
            clarity=clarity,
            is_generic=is_generic,
            is_template=is_template,
            is_contradictory=False,
            sustained_throughout=False,
            score=score,
        )
