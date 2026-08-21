def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_negative_game_outcome_detects_cognitive_issue(client):
    response = client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "argument-map",
            "score": 3,
            "total": 10,
            "duration_seconds": 60,
            "cognitive_outcomes": [
                {"hub": "introducao-sem-tese", "event": "VAGUE_THESIS", "severity": 0.7}
            ],
        },
    )
    assert response.status_code == 200

    profile = api_data(client.get("/api/v1/ai/learning-profile"))
    assert profile["cognitive_issues"]["WEAK_THESIS"]["state"] == "DETECTED"


def test_unknown_cognitive_event_is_rejected(client):
    response = client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "argument-map",
            "score": 3,
            "total": 10,
            "duration_seconds": 60,
            "cognitive_outcomes": [
                {"hub": "introducao-sem-tese", "event": "EVENTO_INVENTADO", "severity": 0.5}
            ],
        },
    )
    assert response.status_code == 422
