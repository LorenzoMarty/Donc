from __future__ import annotations

import re
from collections import Counter

from src.agents.schemas import EssayCorrectionResult


class FallbackCorrectionProvider:
    def correct(self, *, theme: str, content: str) -> EssayCorrectionResult:
        words = re.findall(r"\b[\w'-]+\b", content)
        paragraphs = [p for p in content.split("\n") if p.strip()]
        connectors = len(
            re.findall(
                r"\b(portanto|ademais|contudo|entretanto|assim|desse modo|alem disso|logo|todavia|por conseguinte)\b",
                content,
                re.I,
            )
        )
        intervention_terms = len(
            re.findall(
                r"\b(governo|escola|midia|familia|sociedade|ministerio|acao|medida|proposta|intervencao|campanha|politica publica)\b",
                content,
                re.I,
            )
        )
        repertoire_terms = len(
            re.findall(
                r"\b(constituicao|durkheim|bauman|freire|aristoteles|kant|foucault|ibge|onu|unesco|modernismo)\b",
                content,
                re.I,
            )
        )

        length_score = 200 if len(words) >= 260 else max(80, int(len(words) / 260 * 200))
        structure_score = 200 if len(paragraphs) >= 4 else 110 + len(paragraphs) * 25
        connector_score = min(200, 100 + connectors * 20)
        intervention_score = min(200, 100 + intervention_terms * 16)
        argument_score = min(200, int((length_score + structure_score) / 2) + repertoire_terms * 8)

        c1 = self._round_competency(length_score)
        c2 = self._round_competency(structure_score)
        c3 = self._round_competency(argument_score)
        c4 = self._round_competency(connector_score)
        c5 = self._round_competency(intervention_score)

        recurrent_patterns = self._patterns(
            word_count=len(words),
            paragraphs=len(paragraphs),
            connectors=connectors,
            intervention_terms=intervention_terms,
            repertoire_terms=repertoire_terms,
        )
        return EssayCorrectionResult(
            total_score=c1 + c2 + c3 + c4 + c5,
            competency_1=c1,
            competency_2=c2,
            competency_3=c3,
            competency_4=c4,
            competency_5=c5,
            strengths=[
                "O texto se mantem conectado ao tema proposto.",
                "Ha tentativa de organizar tese, argumentos e fechamento.",
            ],
            errors=[
                "Revise desvios de norma-padrao, concordancia e pontuacao antes da versao final.",
                "A proposta de intervencao precisa explicitar melhor agente, acao, meio, finalidade e detalhamento.",
            ],
            suggestions=[
                "Inclua repertorio sociocultural especifico e conectado ao argumento central.",
                "Use conectivos entre paragrafos para tornar a progressao argumentativa mais visivel.",
                "Finalize com uma intervencao completa e vinculada ao problema discutido.",
            ],
            feedback=(
                f"Sua redacao sobre '{theme}' apresenta uma base aproveitavel. Para elevar a nota, "
                "fortaleca a progressao dos argumentos, detalhe a intervencao e revise clareza e norma-padrao."
            ),
            recurrent_patterns=recurrent_patterns,
        )

    def _patterns(
        self,
        *,
        word_count: int,
        paragraphs: int,
        connectors: int,
        intervention_terms: int,
        repertoire_terms: int,
    ) -> list[str]:
        patterns: list[str] = []
        if word_count < 260:
            patterns.append("desenvolvimento insuficiente")
        if paragraphs < 4:
            patterns.append("estrutura de paragrafo incompleta")
        if connectors < 4:
            patterns.append("coesao interparagrafal a melhorar")
        if intervention_terms < 4:
            patterns.append("intervencao pouco detalhada")
        if repertoire_terms < 1:
            patterns.append("repertorio pouco desenvolvido")
        return patterns or ["revisao fina de repertorio e coesao"]

    def recurrent_terms(self, content: str, limit: int = 5) -> list[str]:
        stopwords = {
            "para",
            "como",
            "uma",
            "com",
            "que",
            "por",
            "dos",
            "das",
            "esse",
            "essa",
            "isso",
            "mais",
            "tambem",
            "nao",
        }
        terms = [term.lower() for term in re.findall(r"\b[\w'-]{4,}\b", content)]
        counts = Counter(term for term in terms if term not in stopwords)
        return [term for term, count in counts.most_common(limit) if count > 2]

    def _round_competency(self, value: int) -> int:
        value = max(0, min(200, value))
        return int(round(value / 40) * 40)
