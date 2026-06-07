"""Testes unitários puros dos schemas de jogos (validação Pydantic, sem app/DB)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.routes.games import GameCompleteRequest, GameProgressUpsertRequest

pytestmark = pytest.mark.unit


def test_game_complete_accepts_valid_payload() -> None:
    req = GameCompleteRequest(game_id="version-duel", xp_earned=76)
    assert req.xp_earned == 76


@pytest.mark.parametrize("xp", [-1, 501])
def test_game_complete_rejects_xp_out_of_bounds(xp: int) -> None:
    with pytest.raises(ValidationError):
        GameCompleteRequest(game_id="g", xp_earned=xp)


def test_game_complete_rejects_empty_game_id() -> None:
    with pytest.raises(ValidationError):
        GameCompleteRequest(game_id="", xp_earned=10)


@pytest.mark.parametrize("accuracy", [-1, 101])
def test_progress_rejects_accuracy_out_of_range(accuracy: int) -> None:
    with pytest.raises(ValidationError):
        GameProgressUpsertRequest(plays=1, best_score=1, best_accuracy=accuracy, progress=10)


def test_progress_accepts_boundaries() -> None:
    req = GameProgressUpsertRequest(plays=0, best_score=0, best_accuracy=100, progress=100)
    assert req.best_accuracy == 100
    assert req.progress == 100
