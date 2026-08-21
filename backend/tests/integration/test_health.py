"""Testes de integração de health check e do fluxo de progresso de jogos."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.fixtures import VALID_GAME_COMPLETE, VALID_GAME_PROGRESS

pytestmark = pytest.mark.integration


class _FakeRedisClient:
    def ping(self) -> bool:
        return True


def test_health_ok(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("redis.from_url", lambda *_args, **_kwargs: _FakeRedisClient())
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    assert body["data"]["status"] == "ok"
    assert body["data"]["database"] == "ok"
    assert body["data"]["redis"] == "ok"


def test_health_degraded_when_redis_down(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom(*_args, **_kwargs):
        raise ConnectionError("redis indisponivel")

    monkeypatch.setattr("redis.from_url", _boom)
    res = client.get("/health")
    assert res.status_code == 503
    body = res.json()
    assert body["data"]["status"] == "degraded"
    assert body["data"]["redis"] == "down"
    assert body["data"]["database"] == "ok"


def test_root_mirrors_health(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("redis.from_url", lambda *_args, **_kwargs: _FakeRedisClient())
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "ok"


def test_complete_game_acknowledges_completion(client: TestClient) -> None:
    res = client.post("/api/v1/games/complete", json=VALID_GAME_COMPLETE)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["game_id"] == VALID_GAME_COMPLETE["game_id"]
    # Sem sistema de XP: a resposta nao deve mais carregar total_xp/level.
    assert "total_xp" not in data
    assert "level" not in data


def test_progress_upsert_round_trip(client: TestClient) -> None:
    game_id = "version-duel"
    put = client.put(f"/api/v1/games/progress/{game_id}", json=VALID_GAME_PROGRESS)
    assert put.status_code == 200
    assert put.json()["data"]["game_id"] == game_id

    listing = client.get("/api/v1/games/progress")
    assert listing.status_code == 200
    ids = [row["game_id"] for row in listing.json()["data"]]
    assert game_id in ids


def test_progress_upsert_twice_updates_same_row_instead_of_duplicating(client: TestClient) -> None:
    game_id = "progress-idempotent"
    first = client.put(f"/api/v1/games/progress/{game_id}", json={"plays": 1, "best_score": 5, "best_accuracy": 50, "progress": 40})
    assert first.status_code == 200

    second = client.put(f"/api/v1/games/progress/{game_id}", json={"plays": 2, "best_score": 9, "best_accuracy": 80, "progress": 70})
    assert second.status_code == 200
    updated = second.json()["data"]
    assert updated["plays"] == 2
    assert updated["best_score"] == 9
    assert updated["progress"] == 70

    listing = client.get("/api/v1/games/progress").json()["data"]
    matches = [row for row in listing if row["game_id"] == game_id]
    assert len(matches) == 1


def test_progress_upsert_rejects_out_of_range_accuracy(client: TestClient) -> None:
    res = client.put(
        "/api/v1/games/progress/some-game",
        json={"plays": 1, "best_score": 1, "best_accuracy": 150, "progress": 10},
    )
    assert res.status_code == 422


def test_complete_game_rejects_score_above_bounds(client: TestClient) -> None:
    res = client.post(
        "/api/v1/games/complete",
        json={"game_id": "g", "score": 9999, "total": 10, "duration_seconds": 30},
    )
    assert res.status_code == 422


def test_complete_game_rejects_missing_game_id(client: TestClient) -> None:
    res = client.post(
        "/api/v1/games/complete",
        json={"game_id": "", "score": 5, "total": 10, "duration_seconds": 30},
    )
    assert res.status_code == 422
