from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import ThemeAnalysisV2
from src.prompts.agent_instructions import THEME_ANALYZER_INSTRUCTIONS


class ThemeAnalyzerAgent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> ThemeAnalysisV2:
        fallback = self._fallback(theme=theme, content=content)
        prompt = f"""Tema: {theme}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="ThemeAnalyzerAgent",
            description="Avalia aderência ao tema e detecta tangenciamento.",
            instructions=THEME_ANALYZER_INSTRUCTIONS,
            prompt=prompt,
            output_schema=ThemeAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, theme: str, content: str) -> ThemeAnalysisV2:
        theme_words = set(re.findall(r"\b\w{4,}\b", theme.lower()))
        content_words = set(re.findall(r"\b\w{4,}\b", content.lower()))
        stopwords = {"para", "como", "uma", "com", "que", "por", "dos", "das", "esse", "essa", "isso", "mais", "nao"}
        theme_words -= stopwords
        content_words -= stopwords
        if not theme_words:
            alignment = 50
        else:
            alignment = int(len(theme_words & content_words) / len(theme_words) * 100)
            alignment = min(100, alignment)
        tangenciamento = alignment < 25
        severity: str
        if alignment >= 50:
            severity = "low"
        elif alignment >= 25:
            severity = "medium"
        else:
            severity = "high"
        return ThemeAnalysisV2(
            theme_alignment=alignment,
            tangenciamento=tangenciamento,
            severity=severity,
            evidence="",
        )
