"""Testes de integração de health check e do fluxo de progresso de jogos."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tests.fixtures import VALID_GAME_COMPLETE

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
    game_id = "text-surgery"
    complete = client.post(
        "/api/v1/games/complete",
        json={**VALID_GAME_COMPLETE, "game_id": game_id, "score": 8, "total": 10, "duration_seconds": 30},
    )
    assert complete.status_code == 200

    put = client.put(f"/api/v1/games/progress/{game_id}")
    assert put.status_code == 200
    data = put.json()["data"]
    assert data["game_id"] == game_id
    assert data["plays"] == 1
    assert data["best_score"] == 8
    assert data["best_accuracy"] == 80

    listing = client.get("/api/v1/games/progress")
    assert listing.status_code == 200
    ids = [row["game_id"] for row in listing.json()["data"]]
    assert game_id in ids


def test_progress_upsert_derives_from_attempts_not_client_input(client: TestClient) -> None:
    """REQ-1 (auditoria P0-1): PUT nao aceita mais best_score/accuracy/progress prontos do
    cliente — sempre recalcula a partir das GameAttempt reais, mesmo com corpo vazio."""
    game_id = "essay-assembly"
    client.post(
        "/api/v1/games/complete",
        json={**VALID_GAME_COMPLETE, "game_id": game_id, "score": 5, "total": 10, "duration_seconds": 30},
    )
    first = client.put(f"/api/v1/games/progress/{game_id}")
    assert first.status_code == 200
    assert first.json()["data"]["plays"] == 1
    assert first.json()["data"]["best_score"] == 5

    client.post(
        "/api/v1/games/complete",
        json={**VALID_GAME_COMPLETE, "game_id": game_id, "score": 9, "total": 10, "duration_seconds": 30},
    )
    second = client.put(f"/api/v1/games/progress/{game_id}")
    assert second.status_code == 200
    updated = second.json()["data"]
    assert updated["plays"] == 2
    assert updated["best_score"] == 9
    assert updated["progress"] == 90

    listing = client.get("/api/v1/games/progress").json()["data"]
    matches = [row for row in listing if row["game_id"] == game_id]
    assert len(matches) == 1


def test_progress_upsert_rejects_unknown_game(client: TestClient) -> None:
    res = client.put("/api/v1/games/progress/never-played")
    assert res.status_code == 404
    assert res.json()["error"] == "game_not_found"


def test_progress_upsert_rejects_game_with_no_attempts(client: TestClient) -> None:
    res = client.put("/api/v1/games/progress/fallacy-hunt")
    assert res.status_code == 404
    assert res.json()["error"] == "no_attempts_for_game"


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
