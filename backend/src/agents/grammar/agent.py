from __future__ import annotations

import re
from collections import Counter

from src.agents.base import AgnoAgentRunner
from src.agents.correction.fallback import FallbackCorrectionProvider
from src.agents.schemas import GrammarAnalysis
from src.prompts.agent_instructions import GRAMMAR_INSTRUCTIONS


class GrammarAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()
        self.fallback_provider = FallbackCorrectionProvider()

    def analyze(self, *, content: str, user_id: int | None = None, session_id: str | None = None) -> GrammarAnalysis:
        fallback = self._fallback(content=content)
        prompt = f"""
Redacao:
{content}
"""
        return self.runner.run_structured(
            agent_name="GrammarAgent",
            description="Identifica problemas de norma-padrao, coesao, repeticao e formalidade.",
            instructions=GRAMMAR_INSTRUCTIONS,
            prompt=prompt,
            output_schema=GrammarAnalysis,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> GrammarAnalysis:
        repeated_terms = self.fallback_provider.recurrent_terms(content)
        informal = len(re.findall(r"\b(tipo|ai|pra|coisa|legal|muito bom|a gente)\b", content, re.I))
        long_sentences = len([sentence for sentence in re.split(r"[.!?]", content) if len(sentence.split()) > 38])
        connectors = len(re.findall(r"\b(portanto|ademais|contudo|entretanto|assim|desse modo|alem disso|logo)\b", content, re.I))
        repetition_penalty = min(22, len(repeated_terms) * 4)
        grammar_score = max(45, 86 - informal * 5 - long_sentences * 4 - repetition_penalty)
        cohesion_score = min(92, 52 + connectors * 8)
        formality_score = max(45, 90 - informal * 10)
        mistakes = []
        if repeated_terms:
            mistakes.append("Ha repeticao lexical que reduz precisao e fluidez.")
        if long_sentences:
            mistakes.append("Alguns periodos longos dificultam a leitura argumentativa.")
        if informal:
            mistakes.append("Ha marcas de informalidade pouco adequadas ao ENEM.")
        if not mistakes:
            mistakes.append("A revisao deve focar ajustes finos de pontuacao e concordancia.")
        term_counts = Counter(repeated_terms)
        repeated = [term for term, _ in term_counts.most_common(5)]
        return GrammarAnalysis(
            grammar_score=grammar_score,
            cohesion_score=cohesion_score,
            formality_score=formality_score,
            repeated_terms=repeated,
            mistakes=mistakes,
            suggestions=[
                "Substitua repeticoes por sinonimos ou retomadas referenciais precisas.",
                "Divida periodos muito longos para melhorar clareza.",
                "Use conectivos conclusivos, adversativos e explicativos com funcao clara.",
            ],
        )
