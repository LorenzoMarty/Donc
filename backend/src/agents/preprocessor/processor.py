from __future__ import annotations

import re

from src.agents.schemas import PreProcessorOutput


class PreProcessor:
    def process(self, content: str) -> PreProcessorOutput:
        paragraphs = self._split_paragraphs(content)
        words = re.findall(r"\b\w+\b", content)
        stripped = content.strip()
        is_truncated = bool(stripped) and stripped[-1] not in ".!?…"
        has_minimum_structure = len(paragraphs) >= 3 and len(words) >= 80
        return PreProcessorOutput(
            word_count=len(words),
            paragraph_count=len(paragraphs),
            has_minimum_structure=has_minimum_structure,
            is_truncated=is_truncated,
        )

    @staticmethod
    def _split_paragraphs(content: str) -> list[str]:
        stripped = content.strip()
        if not stripped:
            return []
        if re.search(r"\n\s*\n", stripped):
            return [p.strip() for p in re.split(r"\n\s*\n+", stripped) if p.strip()]
        return [line.strip() for line in stripped.splitlines() if line.strip()]
