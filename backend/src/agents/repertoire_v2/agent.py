from __future__ import annotations

import re

from src.agents.base import AgnoAgentRunner
from src.agents.schemas import RepertoireAnalysisV2
from src.prompts.agent_instructions import REPERTOIRE_V2_INSTRUCTIONS

_REPERTOIRE_TERMS = re.compile(
    r"\b(constituicao|durkheim|bauman|freire|aristoteles|kant|foucault|ibge|onu|unesco|"
    r"modernismo|lei\s+\d|artigo\s+\d|marx|weber|bourdieu|hobbes|locke|rousseau|"
    r"hannah\s+arendt|zygmunt|pierre\s+bourdieu|edgar\s+morin|yuval\s+harari)\b",
    re.I,
)
_GENERIC_TERMS = re.compile(
    r"\b(segundo\s+estudos|pesquisas\s+mostram|de\s+acordo\s+com\s+especialistas|"
    r"conforme\s+dados|estudos\s+indicam|a\s+ciencia\s+mostra|historicamente)\b",
    re.I,
)
_CONNECTION_TERMS = re.compile(
    r"\b(demonstra|evidencia|comprova|ilustra|reforca|fundamenta|corrobora|"
    r"permite\s+compreender|ajuda\s+a\s+entender|prova\s+que|mostra\s+que)\b",
    re.I,
)
_AUTHORITY_ATTRIBUTION = re.compile(
    r"\b(?:segundo|conforme|de\s+acordo\s+com)\s+(?:o|a)\s+"
    r"(?:renomad[oa]|famos[oa]|grande|ilustre|celebre|c[eé]lebre)?\s*"
    r"(?:filosofo|fil[oó]sofo|sociologo|soci[oó]logo|historiador|cientista|escritor|"
    r"pensador|psicologo|psic[oó]logo|economista|autor)\s+"
    r"([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+[A-ZÀ-Ý][a-zà-ÿ]+){0,2})",
    re.I,
)
_UNSOURCED_STAT = re.compile(r"\b\d{1,3}%\s+d[aoe]s?\b")
_SOURCE_MARKERS = re.compile(
    r"\b(segundo|conforme|de\s+acordo\s+com|pesquisa|estudo|ibge|onu|unesco|dados\s+d[eo])\b",
    re.I,
)


def _has_suspicious_citation(content: str) -> bool:
    for match in _AUTHORITY_ATTRIBUTION.finditer(content):
        name = match.group(1)
        if not _REPERTOIRE_TERMS.search(name):
            return True
    for match in _UNSOURCED_STAT.finditer(content):
        window_start = max(0, match.start() - 60)
        window = content[window_start:match.end() + 10]
        if not _SOURCE_MARKERS.search(window):
            return True
    return False


class RepertoireAnalyzerV2Agent:
    def __init__(self, runner: AgnoAgentRunner | None = None) -> None:
        self.runner = runner or AgnoAgentRunner()

    def analyze(
        self,
        theme: str,
        content: str,
        user_id: int | None = None,
        session_id: str | None = None,
    ) -> RepertoireAnalysisV2:
        fallback = self._fallback(content=content)
        prompt = f"""Tema: {theme}
Redacao:
{content}"""
        return self.runner.run_structured(
            agent_name="RepertoireAnalyzerV2Agent",
            description="Avalia repertório com rigor máximo: FORTE/ACEITAVEL/FRACO/INVALIDO.",
            instructions=REPERTOIRE_V2_INSTRUCTIONS,
            prompt=prompt,
            output_schema=RepertoireAnalysisV2,
            fallback=fallback,
            user_id=user_id,
            session_id=session_id,
        )

    def _fallback(self, *, content: str) -> RepertoireAnalysisV2:
        rep_count = len(_REPERTOIRE_TERMS.findall(content))
        generic_count = len(_GENERIC_TERMS.findall(content))
        has_connection = bool(_CONNECTION_TERMS.search(content))
        items = list({m.lower() for m in _REPERTOIRE_TERMS.findall(content)})
        is_generic = generic_count > rep_count or (rep_count == 0 and generic_count > 0)
        false_citations = _has_suspicious_citation(content)
        if false_citations:
            quality: str = "INVALIDO"
            score = 15
        elif rep_count == 0 and generic_count == 0:
            quality = "FRACO"
            score = 20
        elif generic_count > 0 and rep_count == 0:
            quality = "FRACO"
            score = 25
        elif rep_count > 0 and has_connection:
            quality = "ACEITAVEL"
            score = 55
        elif rep_count > 0:
            quality = "FRACO"
            score = 30
        else:
            quality = "FRACO"
            score = 20
        return RepertoireAnalysisV2(
            quality=quality,
            items_found=items[:5],
            is_generic=is_generic,
            has_argumentative_connection=has_connection,
            false_citations=false_citations,
            score=score,
        )
