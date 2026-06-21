from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import GrammarAnalysisV2, GrammarErrorV2
from src.prompts.agent_instructions import GRAMMAR_V2_INSTRUCTIONS

_INFORMAL = re.compile(r"\b(tipo|ai|pra|coisa|legal|muito\s+bom|a\s+gente|ta|num|tao|pro|nao\s+sei|sei\s+la)\b", re.I)
_LONG_SENTENCE = re.compile(r"[^.!?]+")
_CONNECTORS = re.compile(r"\b(portanto|ademais|contudo|entretanto|assim|alem\s+disso|logo|todavia|por\s+conseguinte|dessa\s+forma)\b", re.I)
_REPEATED_CONNECTOR = re.compile(r"\b(nesse\s+sentido|desse\s+modo|dessa\s+forma)\b", re.I)


class GrammarAnalyzerV2Agent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> GrammarAnalysisV2:
        fallback = self._fallback(content=content)
        prompt = f"Redacao:\n{content}"
        return self.runner.run_structured(
            agent_name="GrammarAnalyzerV2Agent",
            description="Mapeia erros linguísticos por categoria e severidade (LEVE/MEDIA/GRAVE).",
            instructions=GRAMMAR_V2_INSTRUCTIONS,
            prompt=prompt,
            output_schema=GrammarAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> GrammarAnalysisV2:
        informal_count = len(_INFORMAL.findall(content))
        long_sentences = [s for s in _LONG_SENTENCE.findall(content) if len(s.split()) > 38]
        connector_count = len(_CONNECTORS.findall(content))
        repeated_connector = len(_REPEATED_CONNECTOR.findall(content))
        errors: list[GrammarErrorV2] = []
        grave = 0
        media = 0
        leve = 0
        if informal_count >= 3:
            errors.append(GrammarErrorV2(category="oralidade", severity="GRAVE", count=informal_count))
            grave += informal_count
        elif informal_count > 0:
            errors.append(GrammarErrorV2(category="oralidade", severity="MEDIA", count=informal_count))
            media += informal_count
        if len(long_sentences) >= 3:
            errors.append(GrammarErrorV2(category="construcao_truncada", severity="MEDIA", count=len(long_sentences)))
            media += len(long_sentences)
        elif len(long_sentences) > 0:
            errors.append(GrammarErrorV2(category="construcao_truncada", severity="LEVE", count=len(long_sentences)))
            leve += len(long_sentences)
        if repeated_connector >= 3:
            errors.append(GrammarErrorV2(category="coesao", severity="MEDIA", count=repeated_connector))
            media += repeated_connector
        elif repeated_connector > 0:
            errors.append(GrammarErrorV2(category="coesao", severity="LEVE", count=repeated_connector))
            leve += repeated_connector
        orth_score = max(0, 90 - grave * 15 - media * 5 - leve * 2)
        cohesion_score = min(100, max(30, 60 + connector_count * 5 - repeated_connector * 8))
        formality_score = max(0, 95 - informal_count * 12)
        return GrammarAnalysisV2(
            errors=errors,
            orthography_score=orth_score,
            cohesion_score=cohesion_score,
            formality_score=formality_score,
            grave_count=grave,
            media_count=media,
            leve_count=leve,
        )
