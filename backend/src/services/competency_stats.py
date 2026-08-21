"""Média de competência (C1-C5) sobre um conjunto de correções — extraído porque dashboard_service,
essay_service e progression_service reimplementavam esse cálculo cada um do seu jeito (auditoria
arquitetural 2026-08-21, P1-4)."""

from __future__ import annotations

from src.models import EssayCorrection


COMPETENCY_FIELDS = ("competency_1", "competency_2", "competency_3", "competency_4", "competency_5")


def mean_competency(corrections: list[EssayCorrection], field: str) -> int:
    if not corrections:
        return 0
    return int(sum(getattr(correction, field) for correction in corrections) / len(corrections))


def mean_competencies(corrections: list[EssayCorrection]) -> dict[str, int]:
    return {field: mean_competency(corrections, field) for field in COMPETENCY_FIELDS}
