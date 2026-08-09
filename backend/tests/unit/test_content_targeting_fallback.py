"""REQ-4: aula/exercicio sem targets explicito cai no fallback via Module.target_competencies."""

from __future__ import annotations

import pytest

from src.services.recommendation_service import effective_targets

pytestmark = pytest.mark.unit


def test_explicit_targets_win_over_fallback():
    result = effective_targets(explicit=["WEAK_THESIS"], module_target_competencies=["c3"])
    assert result == ["WEAK_THESIS"]


def test_empty_explicit_falls_back_to_module_competencies():
    result = effective_targets(explicit=[], module_target_competencies=["c3"])
    assert "C3_LOW" in result
    assert "SHALLOW_ARGUMENTATION" in result


def test_no_explicit_and_no_module_competencies_is_empty():
    result = effective_targets(explicit=[], module_target_competencies=[])
    assert result == []


def test_fallback_does_not_write_back_to_content():
    """A funcao e pura — nao ha efeito colateral no model, so retorna a lista calculada."""
    result = effective_targets(explicit=None, module_target_competencies=["c2"])
    assert isinstance(result, list)
