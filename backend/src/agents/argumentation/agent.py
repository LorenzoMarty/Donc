from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import ArgumentationAnalysisV2, ParagraphAnalysis
from src.prompts.agent_instructions import ARGUMENTATION_INSTRUCTIONS

_FILLER_PATTERNS = re.compile(
    r"\b(como\s+ja\s+foi\s+dito|conforme\s+mencionado|como\s+vimos|"
    r"e\s+importante\s+ressaltar\s+que|vale\s+ressaltar|nesse\s+sentido|"
    r"e\s+notorio\s+que|diante\s+do\s+exposto)\b",
    re.I,
)
_TOPIC_SENTENCE_PATTERN = re.compile(
    r"\b(portanto|ademais|contudo|entretanto|alem\s+disso|todavia|"
    r"por\s+outro\s+lado|nessa\s+perspectiva|desse\s+modo)\b",
    re.I,
)
_ARGUMENT_TERMS = re.compile(
    r"\b(porque|pois|uma\s+vez\s+que|visto\s+que|devido|causa|consequencia|"
    r"portanto|logo|assim|dessa\s+forma|desse\s+modo)\b",
    re.I,
)


class ArgumentationAnalyzerAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ArgumentationAnalysisV2:
        fallback = self._fallback(content=content)
        prompt = f"""Tema: {theme}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="ArgumentationAnalyzerAgent",
            description="Avalia argumentação parágrafo a parágrafo; detecta enrolação e circularidade.",
            instructions=ARGUMENTATION_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ArgumentationAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> ArgumentationAnalysisV2:
        raw_paragraphs = re.split(r"\n\s*\n+", content.strip()) if "\n\n" in content else content.strip().splitlines()
        paragraphs = [p.strip() for p in raw_paragraphs if p.strip()]
        filler_count = len(_FILLER_PATTERNS.findall(content))
        filler_detected = filler_count >= 2
        para_analyses: list[ParagraphAnalysis] = []
        scores: list[int] = []
        for i, para in enumerate(paragraphs):
            words = para.split()
            arg_count = len(_ARGUMENT_TERMS.findall(para))
            has_topic = bool(_TOPIC_SENTENCE_PATTERN.search(para)) or i == 0
            dev_score = min(100, max(0, len(words) * 2 + arg_count * 10 - (20 if len(words) < 30 else 0)))
            dev_score = min(dev_score, 70)
            issues: list[str] = []
            if len(words) < 25:
                issues.append("Parágrafo muito curto, sem desenvolvimento suficiente.")
            if arg_count == 0 and i not in (0, len(paragraphs) - 1):
                issues.append("Ausência de marcadores argumentativos.")
            quote_words = words[:15]
            sample_quote = " ".join(quote_words) if quote_words else ""
            para_analyses.append(ParagraphAnalysis(
                index=i,
                has_topic_sentence=has_topic,
                development_score=dev_score,
                issues=issues,
                sample_quote=sample_quote,
            ))
            scores.append(dev_score)
        dev_paragraphs = [p for p in para_analyses if p.index not in (0, len(para_analyses) - 1)]
        overall = int(sum(p.development_score for p in dev_paragraphs) / max(len(dev_paragraphs), 1)) if dev_paragraphs else 30
        return ArgumentationAnalysisV2(
            paragraphs=para_analyses,
            overall_score=overall,
            has_circular_reasoning=False,
            has_progression=len(paragraphs) >= 3,
            filler_detected=filler_detected,
        )
