from __future__ import annotations

from src.agents.schemas import PipelineAnalyses


def _snap(value: int) -> int:
    value = max(0, min(200, int(value)))
    return round(value / 40) * 40


class ScoreAuditor:
    """Applies mandatory score caps from the ENEM rubric. Only ever reduces — never raises."""

    def audit(self, scores: dict[str, int], analyses: PipelineAnalyses) -> dict[str, int]:
        c1 = scores["c1"]
        c2 = scores["c2"]
        c3 = scores["c3"]
        c4 = scores["c4"]
        c5 = scores["c5"]

        thesis = analyses.thesis
        theme = analyses.theme
        rep = analyses.repertoire
        arg = analyses.argumentation
        iv = analyses.intervention
        grammar = analyses.grammar
        gate = analyses.gate

        # Thesis absence rules
        if not thesis.thesis_present:
            c2 = min(c2, 120)
            c3 = min(c3, 80)  # spec says <=100; nearest rubric level below = 80

        # Tangenciamento rules
        if theme.tangenciamento or gate.status == "TANGENCIAMENTO":
            c2 = min(c2, 120)
            c3 = min(c3, 120)

        # Repertoire quality rules
        if rep.quality == "INVALIDO":
            c2 = min(c2, 80)
        elif rep.quality == "FRACO":
            c2 = min(c2, 120)

        # False citations
        if rep.false_citations:
            c2 = min(c2, 80)

        # Argumentation superficiality
        if arg.overall_score < 40:
            c3 = min(c3, 120)

        # Circular reasoning / no progression
        if arg.has_circular_reasoning:
            c3 = min(c3, 120)

        # Intervention rules
        if iv.absent or iv.has_human_rights_violation:
            c5 = 0
        elif iv.completeness_score < 100:
            c5 = min(c5, 120)

        # Grammar grave errors
        if grammar.grave_count >= 5:
            c1 = min(c1, 120)
        elif grammar.grave_count >= 3:
            c1 = min(c1, 160)

        # DESVIO_GRAVE / ZERO gate
        if gate.status == "ZERO":
            return {"c1": 0, "c2": 0, "c3": 0, "c4": 0, "c5": 0}
        if gate.status == "DESVIO_GRAVE":
            c2 = min(c2, 80)
            c3 = min(c3, 80)

        # Snap all to multiples of 40
        return {
            "c1": _snap(c1),
            "c2": _snap(c2),
            "c3": _snap(c3),
            "c4": _snap(c4),
            "c5": _snap(c5),
        }
