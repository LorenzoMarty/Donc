"""Testes de integração de health check e do fluxo de progresso de jogos."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.fixtures import VALID_GAME_COMPLETE, VALID_GAME_PROGRESS

pytestmark = pytest.mark.integration


def test_health_ok(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"


def test_root_mirrors_health(client: TestClient) -> None:
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "ok"


def test_complete_game_increases_xp(client: TestClient) -> None:
    res = client.post("/api/v1/games/complete", json=VALID_GAME_COMPLETE)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["xp_earned"] == VALID_GAME_COMPLETE["xp_earned"]
    assert data["total_xp"] >= VALID_GAME_COMPLETE["xp_earned"]


def test_progress_upsert_round_trip(client: TestClient) -> None:
    game_id = "version-duel"
    put = client.put(f"/api/v1/games/progress/{game_id}", json=VALID_GAME_PROGRESS)
    assert put.status_code == 200
    assert put.json()["data"]["game_id"] == game_id

    listing = client.get("/api/v1/games/progress")
    assert listing.status_code == 200
    ids = [row["game_id"] for row in listing.json()["data"]]
    assert game_id in ids


def test_complete_game_rejects_invalid_xp(client: TestClient) -> None:
    res = client.post("/api/v1/games/complete", json={"game_id": "g", "xp_earned": 9999})
    assert res.status_code == 422
