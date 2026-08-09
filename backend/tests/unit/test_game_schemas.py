"""Testes unitários puros dos schemas de jogos (validação Pydantic, sem app/DB)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.routes.games import GameCompleteRequest, GameProgressUpsertRequest

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


@pytest.mark.parametrize("accuracy", [-1, 101])
def test_progress_rejects_accuracy_out_of_range(accuracy: int) -> None:
    with pytest.raises(ValidationError):
        GameProgressUpsertRequest(plays=1, best_score=1, best_accuracy=accuracy, progress=10)


def test_progress_accepts_boundaries() -> None:
    req = GameProgressUpsertRequest(plays=0, best_score=0, best_accuracy=100, progress=100)
    assert req.best_accuracy == 100
    assert req.progress == 100
