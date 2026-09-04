from __future__ import annotations

from src.agents.schemas import (
    EssayCorrectionResult,
    InlineAnnotation,
    PipelineAnalyses,
)


class OutputMapper:
    """Converts pipeline analyses + audited c1-c5 scores into EssayCorrectionResult."""

    def map(self, analyses: PipelineAnalyses, audited: dict[str, int], *, used_fallback: bool = False) -> EssayCorrectionResult:
        c1, c2, c3, c4, c5 = audited["c1"], audited["c2"], audited["c3"], audited["c4"], audited["c5"]
        total = c1 + c2 + c3 + c4 + c5
        errors = self._build_errors(analyses, audited)
        suggestions = self._build_suggestions(analyses, audited)
        strengths = self._build_strengths(analyses, audited)
        feedback = self._build_feedback(analyses, audited, errors)
        inline = self._build_inline_annotations(analyses, audited)
        patterns = self._build_patterns(analyses, audited)
        return EssayCorrectionResult(
            total_score=total,
            competency_1=c1,
            competency_2=c2,
            competency_3=c3,
            competency_4=c4,
            competency_5=c5,
            strengths=strengths,
            errors=errors,
            suggestions=suggestions,
            feedback=feedback,
            recurrent_patterns=patterns,
            inline_annotations=inline,
            used_fallback=used_fallback,
        )

    def _build_errors(self, a: PipelineAnalyses, scores: dict[str, int]) -> list[str]:
        errors: list[str] = []
        if a.gate.status == "ZERO":
            errors.append(f"Redação anulada: {a.gate.reason}")
            return errors
        if not a.thesis.thesis_present:
            errors.append("Tese ausente ou impossível de identificar — desconto crítico em C2 e C3.")
        elif a.thesis.is_template:
            errors.append("Tese com linguagem de modelo decorado — frases de vestibular sem posicionamento real.")
        elif a.thesis.is_generic:
            errors.append("Tese vaga: não define recorte específico do tema.")
        if a.theme.tangenciamento:
            errors.append(f"Tangenciamento detectado (severidade {a.theme.severity}): {a.theme.evidence or 'redação não aborda o tema central diretamente'}.")
        if a.repertoire.quality == "INVALIDO":
            errors.append("Repertório inválido: citações falsas ou dados inverificáveis comprometem a argumentação.")
        elif a.repertoire.quality == "FRACO":
            errors.append("Repertório genérico ou decorado — não há conexão argumentativa real com a tese.")
        if a.argumentation.filler_detected:
            errors.append("Enrolação detectada: frases de preenchimento sem progressão argumentativa.")
        if a.argumentation.has_circular_reasoning:
            errors.append("Raciocínio circular: argumento repete a tese sem prová-la.")
        if not a.argumentation.has_progression:
            errors.append("Ausência de progressão argumentativa entre os parágrafos.")
        if a.intervention.absent:
            errors.append("Proposta de intervenção ausente — C5 zerada.")
        elif a.intervention.is_generic:
            el = a.intervention.elements
            missing = [n for n, v in [("agente", el.agente), ("ação", el.acao), ("meio", el.meio), ("finalidade", el.finalidade), ("detalhamento", el.detalhamento)] if not v]
            errors.append(f"Proposta genérica ou incompleta. Elementos ausentes: {', '.join(missing) if missing else 'insuficiente detalhamento'}.")
        if a.grammar.grave_count >= 3:
            errors.append(f"{a.grammar.grave_count} erros graves de norma-padrão comprometem C1.")
        return errors or ["Revisão fina necessária em coesão e detalhamento da proposta."]

    def _build_suggestions(self, a: PipelineAnalyses, scores: dict[str, int]) -> list[str]:
        suggestions: list[str] = []
        if not a.thesis.thesis_present or a.thesis.is_generic:
            suggestions.append("Reescreva a introdução: apresente o problema, o recorte específico e sua posição em 2-3 frases diretas.")
        if a.repertoire.quality in ("FRACO", "INVALIDO"):
            suggestions.append("Para cada repertório citado, explique: 'isso prova que [causa/consequência] porque...' — conexão argumentativa é obrigatória.")
        if a.argumentation.filler_detected or not a.argumentation.has_progression:
            suggestions.append("Em cada parágrafo de desenvolvimento: tópico frasal → explicação → evidência → relação com a tese. Sem repetição.")
        if a.intervention.absent or a.intervention.is_generic:
            suggestions.append("Conclusão: indique [quem age] + [o que faz] + [como faz] + [para que faz] + [um detalhe de execução ligado ao problema].")
        if a.grammar.grave_count >= 3:
            cats = {e.category for e in a.grammar.errors if e.severity == "GRAVE"}
            suggestions.append(f"Revise especificamente: {', '.join(cats)}.")
        if scores["c4"] < 120:
            suggestions.append("Varie os conectivos: não repita 'nesse sentido' e 'dessa forma'. Use adversativos, conclusivos e explicativos com função real.")
        return suggestions or ["Refine o detalhamento da intervenção e a conexão entre repertório e tese."]

    def _build_strengths(self, a: PipelineAnalyses, scores: dict[str, int]) -> list[str]:
        strengths: list[str] = []
        if scores["c1"] >= 160:
            strengths.append("Domínio da norma-padrão: poucos desvios linguísticos identificados.")
        if scores["c2"] >= 160:
            strengths.append("Boa aderência ao tema e ao gênero dissertativo-argumentativo.")
        if scores["c3"] >= 160:
            strengths.append("Argumentação com progressão e sustentação consistente do ponto de vista.")
        if scores["c4"] >= 160:
            strengths.append("Coesão textual bem articulada com conectivos funcionais.")
        if scores["c5"] >= 160:
            strengths.append("Proposta de intervenção detalhada com os elementos obrigatórios da matriz ENEM.")
        if a.repertoire.quality == "FORTE":
            strengths.append("Repertório produtivo com conexão argumentativa clara.")
        elif a.repertoire.quality == "ACEITAVEL":
            strengths.append("Repertório presente e relevante para o tema.")
        if a.thesis.thesis_present and a.thesis.clarity == "clear":
            strengths.append("Tese clara e específica, bem delimitada no início do texto.")
        return strengths or ["Base textual presente — foco no desenvolvimento dos pontos críticos listados."]

    def _build_feedback(self, a: PipelineAnalyses, scores: dict[str, int], errors: list[str]) -> str:
        if a.gate.status == "ZERO":
            return f"Redação anulada: {a.gate.reason} Reescreva do zero seguindo o gênero dissertativo-argumentativo."
        worst = min(scores, key=lambda k: scores[k])
        comp_names = {"c1": "C1 (norma-padrão)", "c2": "C2 (tema/gênero)", "c3": "C3 (argumentação)", "c4": "C4 (coesão)", "c5": "C5 (intervenção)"}
        total = sum(scores.values())
        if total >= 800:
            return f"Redação sólida com {total} pontos. Refinamentos em {comp_names[worst]} podem elevar ainda mais a nota."
        if total >= 600:
            return f"Desempenho médio-alto ({total} pts). Prioridade: {comp_names[worst]}. {errors[0] if errors else ''}"
        if total >= 400:
            return f"Desempenho médio ({total} pts). Foco obrigatório em {comp_names[worst]}. {errors[0] if errors else ''}"
        return f"Nota baixa ({total} pts). Problemas estruturais identificados. Prioridade absoluta: {comp_names[worst]}. {errors[0] if errors else ''}"

    def _build_inline_annotations(self, a: PipelineAnalyses, scores: dict[str, int]) -> list[InlineAnnotation]:
        annotations: list[InlineAnnotation] = []
        seen_quotes: set[str] = set()

        def add(index: int, quote: str, comment: str, competency: str, kind: str = "error") -> None:
            if len(annotations) >= 6 or not quote or quote in seen_quotes:
                return
            seen_quotes.add(quote)
            annotations.append(InlineAnnotation(
                paragraph_index=index,
                quote=quote[:120],
                comment=comment,
                competency=competency,
                type=kind,
            ))

        # Argumentation issues per paragraph
        for para in a.argumentation.paragraphs:
            if para.issues and para.sample_quote:
                add(para.index, para.sample_quote, para.issues[0], "c3")

        # Intervention quote
        if a.intervention.sample_quote and (a.intervention.absent or a.intervention.is_generic):
            el = a.intervention.elements
            missing = [n for n, v in [("agente", el.agente), ("ação", el.acao), ("meio", el.meio), ("finalidade", el.finalidade), ("detalhamento", el.detalhamento)] if not v]
            comment = (
                f"Faltam os elementos {', '.join(missing)} da proposta de intervenção — "
                "sem eles a banca não consegue avaliar quem age, como e com que efeito, e C5 é penalizada."
                if missing
                else "Proposta presente mas genérica: poderia se aplicar a qualquer tema, sem detalhamento concreto de execução."
            )
            add(len(a.argumentation.paragraphs) - 1, a.intervention.sample_quote, comment, "c5")

        # Theme evidence
        if a.theme.tangenciamento and a.theme.evidence:
            comment = (
                f"Tangenciamento de severidade {a.theme.severity}: este trecho desenvolve um recorte "
                "diferente do proposto pelo tema, o que reduz a nota de C2 porque o texto deixa de "
                "responder diretamente à proposta."
            )
            add(0, a.theme.evidence[:80], comment, "c2")

        # Thesis
        if a.thesis.thesis_present and a.thesis.thesis_text and scores["c3"] >= 160:
            quote = a.thesis.thesis_text[:80]
            add(0, quote, "Ponto forte em C3: tese clara e bem posicionada.", "c3", "strength")
        elif not a.thesis.thesis_present:
            paragraphs = a.argumentation.paragraphs
            if paragraphs and paragraphs[0].sample_quote:
                comment = (
                    "Nenhum posicionamento claro sobre o tema aparece na introdução — sem uma tese "
                    "explícita a banca não sabe qual ponto de vista o texto vai defender, o que derruba C2 e C3."
                )
                add(0, paragraphs[0].sample_quote, comment, "c2")

        # Good coesão strength
        if scores["c4"] >= 160 and a.argumentation.paragraphs:
            for para in a.argumentation.paragraphs[1:]:
                if para.sample_quote and para.development_score >= 60:
                    add(para.index, para.sample_quote, "Boa coesão e progressão argumentativa neste trecho.", "c4", "strength")
                    break

        return annotations[:6]

    def _build_patterns(self, a: PipelineAnalyses, scores: dict[str, int]) -> list[str]:
        patterns: list[str] = []
        if a.argumentation.filler_detected:
            patterns.append("enrolação: frases de preenchimento sem conteúdo argumentativo")
        if a.thesis.is_template:
            patterns.append("uso de modelos decorados de vestibular")
        if a.repertoire.quality in ("FRACO", "INVALIDO"):
            patterns.append("repertório sem conexão argumentativa real")
        if not a.argumentation.has_progression:
            patterns.append("ausência de progressão entre parágrafos")
        if a.intervention.absent or a.intervention.is_generic:
            patterns.append("proposta de intervenção genérica ou ausente")
        if a.grammar.grave_count >= 3:
            patterns.append("erros recorrentes de norma-padrão")
        if a.theme.tangenciamento:
            patterns.append("tangenciamento temático")
        return patterns
