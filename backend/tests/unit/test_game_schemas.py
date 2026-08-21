"""Testes unitários puros dos schemas de jogos (validação Pydantic, sem app/DB)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.routes.games import GameCompleteRequest

pytestmark = pytest.mark.unit


def test_game_complete_accepts_valid_payload() -> None:
    req = GameCompleteRequest(game_id="version-duel", score=7, total=10, duration_seconds=60)
    assert req.score == 7


@pytest.mark.parametrize("score", [-1, 501])
def test_game_complete_rejects_score_out_of_bounds(score: int) -> None:
    with pytest.raises(ValidationError):
        GameCompleteRequest(game_id="g", score=score, total=10, duration_seconds=60)


def test_game_complete_rejects_score_above_total() -> None:
    with pytest.raises(ValidationError):
        GameCompleteRequest(game_id="g", score=10, total=5, duration_seconds=60)


def test_game_complete_rejects_empty_game_id() -> None:
    with pytest.raises(ValidationError):
        GameCompleteRequest(game_id="", score=5, total=10, duration_seconds=60)


