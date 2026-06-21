from __future__ import annotations

from src.agents.schemas import PipelineAnalyses


def _snap(value: int) -> int:
    """Snap to ENEM rubric levels: 0, 40, 80, 120, 160, 200."""
    value = max(0, min(200, int(value)))
    return round(value / 40) * 40


class CompetencyScorer:
    def score(self, analyses: PipelineAnalyses) -> dict[str, int]:
        return {
            "c1": _snap(self._c1(analyses)),
            "c2": _snap(self._c2(analyses)),
            "c3": _snap(self._c3(analyses)),
            "c4": _snap(self._c4(analyses)),
            "c5": _snap(self._c5(analyses)),
        }

    def _c1(self, a: PipelineAnalyses) -> int:
        g = a.grammar
        base = (g.orthography_score + g.formality_score) / 2 * 2
        base -= g.grave_count * 20
        base -= g.media_count * 7
        base -= g.leve_count * 2
        if a.preprocessor.word_count < 120:
            base -= 30
        return int(base)

    def _c2(self, a: PipelineAnalyses) -> int:
        t = a.theme
        gate = a.gate
        if gate.status == "ZERO":
            return 0
        base = t.theme_alignment * 2
        if t.tangenciamento or gate.status == "TANGENCIAMENTO":
            base = min(base, 120)
        if gate.status == "DESVIO_GRAVE":
            base = min(base, 80)
        if not a.preprocessor.has_minimum_structure:
            base = min(base, 80)
        return int(base)

    def _c3(self, a: PipelineAnalyses) -> int:
        arg = a.argumentation
        thesis = a.thesis
        base = arg.overall_score * 1.4 + thesis.score * 0.6
        if arg.filler_detected:
            base -= 30
        if arg.has_circular_reasoning:
            base -= 25
        if not arg.has_progression:
            base -= 20
        if not thesis.thesis_present:
            base -= 40
        elif thesis.is_generic or thesis.is_template:
            base -= 20
        if a.repertoire.quality in ("FRACO", "INVALIDO"):
            base -= 15
        return int(base)

    def _c4(self, a: PipelineAnalyses) -> int:
        g = a.grammar
        base = g.cohesion_score * 2
        base -= g.grave_count * 10
        base -= g.media_count * 4
        return int(base)

    def _c5(self, a: PipelineAnalyses) -> int:
        iv = a.intervention
        if iv.absent or iv.has_human_rights_violation:
            return 0
        el = iv.elements
        count = sum([el.agente, el.acao, el.meio, el.finalidade, el.detalhamento])
        base = count * 40
        if iv.is_generic:
            base = min(base, 120)
        return base
