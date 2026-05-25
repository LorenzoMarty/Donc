from __future__ import annotations

import re
from collections import Counter

from src.agents.schemas import EssayCorrectionResult


class FallbackCorrectionProvider:
    def correct(self, *, theme: str, content: str) -> EssayCorrectionResult:
        words = re.findall(r"\b[\w'-]+\b", content)
        paragraphs = [p for p in content.split("\n") if p.strip()]
        repeated_terms = self.recurrent_terms(content)
        connectors_found = re.findall(
            r"\b(portanto|ademais|contudo|entretanto|assim|desse modo|alem disso|logo|todavia|por conseguinte|ness[e]? sentido|dessa forma)\b",
            content,
            re.I,
        )
        connectors = len(connectors_found)
        connector_variety = len({connector.lower() for connector in connectors_found})
        repertoire_terms = self._count(
            r"\b(constituicao|durkheim|bauman|freire|aristoteles|kant|foucault|ibge|onu|unesco|modernismo|lei|estado|ministerio)\b",
            content,
        )
        informal_terms = self._count(r"\b(tipo|ai|pra|coisa|legal|muito bom|a gente|ta|num)\b", content)
        long_sentences = len([sentence for sentence in re.split(r"[.!?]", content) if len(sentence.split()) > 38])
        theme_overlap = self._theme_overlap(theme=theme, content=content)

        c1 = self._score_competency_1(
            word_count=len(words),
            informal_terms=informal_terms,
            long_sentences=long_sentences,
            repeated_terms=len(repeated_terms),
        )
        c2 = self._score_competency_2(word_count=len(words), paragraphs=len(paragraphs), theme_overlap=theme_overlap)
        c3 = self._score_competency_3(
            word_count=len(words),
            paragraphs=len(paragraphs),
            repertoire_terms=repertoire_terms,
            argument_markers=self._argument_markers(content),
        )
        c4 = self._score_competency_4(
            connectors=connectors,
            connector_variety=connector_variety,
            most_repeated_connector=self._most_repeated_count(connectors_found),
        )
        c5 = self._score_competency_5(content)

        recurrent_patterns = self._patterns(
            word_count=len(words),
            paragraphs=len(paragraphs),
            connectors=connectors,
            c1=c1,
            c2=c2,
            c3=c3,
            c4=c4,
            c5=c5,
            repertoire_terms=repertoire_terms,
        )
        strengths = self._strengths(c1=c1, c2=c2, c3=c3, c4=c4, c5=c5)
        errors = self._errors(c1=c1, c2=c2, c3=c3, c4=c4, c5=c5)
        suggestions = self._suggestions(c1=c1, c2=c2, c3=c3, c4=c4, c5=c5)
        return EssayCorrectionResult(
            total_score=c1 + c2 + c3 + c4 + c5,
            competency_1=c1,
            competency_2=c2,
            competency_3=c3,
            competency_4=c4,
            competency_5=c5,
            strengths=strengths,
            errors=errors,
            suggestions=suggestions,
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
        c1: int,
        c2: int,
        c3: int,
        c4: int,
        c5: int,
        repertoire_terms: int,
    ) -> list[str]:
        patterns: list[str] = []
        if word_count < 260:
            patterns.append("desenvolvimento insuficiente")
        if paragraphs < 4:
            patterns.append("estrutura de paragrafo incompleta")
        if connectors < 4:
            patterns.append("coesao interparagrafal a melhorar")
        if c1 < 160:
            patterns.append("desvios de norma-padrao")
        if c2 < 160:
            patterns.append("recorte tematico ou genero a revisar")
        if c3 < 160:
            patterns.append("argumentacao pouco desenvolvida")
        if c4 < 160:
            patterns.append("mecanismos de coesao insuficientes")
        if c5 < 160:
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

    def _score_competency_1(
        self,
        *,
        word_count: int,
        informal_terms: int,
        long_sentences: int,
        repeated_terms: int,
    ) -> int:
        raw = 190 - informal_terms * 14 - long_sentences * 8 - repeated_terms * 7
        if word_count < 120:
            raw -= 20
        return self._round_competency(raw)

    def _score_competency_2(self, *, word_count: int, paragraphs: int, theme_overlap: float) -> int:
        theme_score = 200 if theme_overlap >= 0.45 else 160 if theme_overlap >= 0.25 else 120 if theme_overlap >= 0.10 else 80
        genre_score = 200 if paragraphs >= 4 and word_count >= 240 else 160 if paragraphs >= 3 else 120 if paragraphs >= 2 else 80
        if word_count < 80:
            genre_score = min(genre_score, 80)
        return self._round_competency(int((theme_score + genre_score) / 2))

    def _score_competency_3(
        self,
        *,
        word_count: int,
        paragraphs: int,
        repertoire_terms: int,
        argument_markers: int,
    ) -> int:
        raw = 80
        raw += min(45, max(0, word_count - 120) // 4)
        raw += min(35, paragraphs * 8)
        raw += min(40, argument_markers * 8)
        raw += min(25, repertoire_terms * 10)
        return self._round_competency(raw)

    def _score_competency_4(self, *, connectors: int, connector_variety: int, most_repeated_connector: int) -> int:
        raw = 90 + min(70, connectors * 14) + min(35, connector_variety * 7)
        if connectors < 3:
            raw -= 25
        if most_repeated_connector > 2:
            raw -= 15
        return self._round_competency(raw)

    def _score_competency_5(self, content: str) -> int:
        if self._count(r"\b(exterminar|eliminar|matar|torturar|violencia contra|retirar direitos)\b", content):
            return 0
        elements = [
            self._count(r"\b(governo|estado|ministerio|escola|familia|midia|sociedade|ong|universidade|secretaria)\b", content),
            self._count(r"\b(deve|deveria|precisa|promover|criar|implementar|financiar|fiscalizar|oferecer|realizar)\b", content),
            self._count(r"\b(por meio|mediante|atraves|com campanhas|com aulas|parcerias|plataformas|programas|politicas publicas)\b", content),
            self._count(r"\b(a fim de|para que|com o objetivo|com a finalidade|visando|para reduzir|para garantir|para promover)\b", content),
            self._count(r"\b(publico-alvo|periodicamente|em escolas|nas redes|municipal|federal|formacao|capacitar|dados|recursos)\b", content),
        ]
        return sum(1 for count in elements if count > 0) * 40

    def _count(self, pattern: str, content: str) -> int:
        return len(re.findall(pattern, content, re.I))

    def _argument_markers(self, content: str) -> int:
        return self._count(
            r"\b(porque|pois|uma vez que|visto que|devido|causa|consequencia|responsabilidade|desigualdade|social|politica|direito|impacto|problema)\b",
            content,
        )

    def _theme_overlap(self, *, theme: str, content: str) -> float:
        theme_terms = set(self._meaningful_terms(theme))
        if not theme_terms:
            return 0.25
        content_terms = set(self._meaningful_terms(content))
        return len(theme_terms & content_terms) / len(theme_terms)

    def _meaningful_terms(self, text: str) -> list[str]:
        stopwords = {
            "para",
            "como",
            "uma",
            "com",
            "que",
            "por",
            "dos",
            "das",
            "sobre",
            "tema",
            "brasil",
            "seus",
            "suas",
            "esta",
            "esse",
            "essa",
            "isso",
            "mais",
            "tambem",
            "nao",
        }
        return [term.lower() for term in re.findall(r"\b[\w'-]{4,}\b", text) if term.lower() not in stopwords]

    def _most_repeated_count(self, values: list[str]) -> int:
        if not values:
            return 0
        return Counter(value.lower() for value in values).most_common(1)[0][1]

    def _strengths(self, *, c1: int, c2: int, c3: int, c4: int, c5: int) -> list[str]:
        strengths: list[str] = []
        if c1 >= 160:
            strengths.append("A escrita apresenta dominio suficiente da norma-padrao para sustentar a argumentacao.")
        if c2 >= 160:
            strengths.append("O texto tende a manter foco no tema e no genero dissertativo-argumentativo.")
        if c3 >= 160:
            strengths.append("Ha organizacao argumentativa com tentativa consistente de defender um ponto de vista.")
        if c4 >= 160:
            strengths.append("A coesao usa conectivos e retomadas para ligar ideias e paragrafos.")
        if c5 >= 160:
            strengths.append("A proposta de intervencao apresenta elementos essenciais da matriz ENEM.")
        return strengths[:6] or ["O texto apresenta uma base inicial para desenvolver tese, argumentos e intervencao."]

    def _errors(self, *, c1: int, c2: int, c3: int, c4: int, c5: int) -> list[str]:
        errors: list[str] = []
        if c1 < 160:
            errors.append("Revise desvios de norma-padrao, pontuacao, concordancia, formalidade e repeticao lexical.")
        if c2 < 160:
            errors.append("Ajuste o recorte tematico e garanta formato dissertativo-argumentativo sem fuga parcial.")
        if c3 < 160:
            errors.append("Desenvolva melhor causa, consequencia e explicacao dos argumentos para convencer o leitor.")
        if c4 < 160:
            errors.append("Melhore a ligacao entre frases e paragrafos com conectivos variados e funcionais.")
        if c5 < 160:
            errors.append("A proposta de intervencao precisa explicitar agente, acao, meio, finalidade e detalhamento.")
        return errors[:6] or ["A revisao deve focar ajustes finos de repertorio, coesao e detalhamento da intervencao."]

    def _suggestions(self, *, c1: int, c2: int, c3: int, c4: int, c5: int) -> list[str]:
        suggestions: list[str] = []
        if c1 < 160:
            suggestions.append("Releia a redacao marcando pontuacao, concordancia e termos informais antes da versao final.")
        if c2 < 160:
            suggestions.append("Reescreva a introducao explicitando o problema central do tema e a tese defendida.")
        if c3 < 160:
            suggestions.append("Em cada desenvolvimento, explique como o repertorio prova a causa ou consequencia apresentada.")
        if c4 < 160:
            suggestions.append("Use conectivos conclusivos, adversativos e explicativos apenas quando a relacao logica existir.")
        if c5 < 160:
            suggestions.append("Finalize com agente, acao, meio, finalidade e um detalhe de execucao ligado ao problema discutido.")
        return suggestions[:6] or ["Compare a nova versao com a correcao e refine o ponto de menor competencia."]
