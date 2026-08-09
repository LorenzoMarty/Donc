"""REQ-1..REQ-6: schemas de targeting rejeitam codigo de CognitiveIssue invalido."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.schemas.admin import (
    AdminActivityCreateRequest,
    AdminActivityUpdateRequest,
    AdminLessonCreateRequest,
    AdminLessonUpdateRequest,
    ReviewGameRequest,
    UpdateGameRequest,
)

pytestmark = pytest.mark.unit


def test_lesson_create_accepts_valid_targets():
    req = AdminLessonCreateRequest(
        title="Aula de tese",
        description="Descricao valida com mais de dez caracteres.",
        summary="Resumo valido com mais de dez caracteres.",
        targets=["WEAK_THESIS", "C3_LOW"],
    )
    assert req.targets == ["WEAK_THESIS", "C3_LOW"]


def test_lesson_create_rejects_invalid_target():
    with pytest.raises(ValidationError):
        AdminLessonCreateRequest(
            title="Aula de tese",
            description="Descricao valida com mais de dez caracteres.",
            summary="Resumo valido com mais de dez caracteres.",
            targets=["NAO_EXISTE"],
        )


def test_lesson_update_rejects_invalid_target():
    with pytest.raises(ValidationError):
        AdminLessonUpdateRequest(targets=["INVALID_CODE"])


def test_activity_create_rejects_invalid_target():
    with pytest.raises(ValidationError):
        AdminActivityCreateRequest(
            statement="Identifique a tese correta no paragrafo apresentado abaixo.",
            options=["A", "B", "C", "D", "E"],
            correct_answer="A",
            explanation="Explicacao valida com mais de vinte caracteres aqui.",
            skill="Tese",
            targets=["INVALID_CODE"],
        )


def test_activity_update_accepts_valid_targets():
    req = AdminActivityUpdateRequest(targets=["SHALLOW_ARGUMENTATION"])
    assert req.targets == ["SHALLOW_ARGUMENTATION"]


def test_review_game_rejects_invalid_target():
    with pytest.raises(ValidationError):
        ReviewGameRequest(action="approve", targets=["NOT_A_CODE"])


def test_update_game_rejects_invalid_target():
    with pytest.raises(ValidationError):
        UpdateGameRequest(targets=["NOT_A_CODE"])
