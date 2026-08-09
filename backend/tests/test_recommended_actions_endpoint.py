def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_recommended_actions_defaults_to_essay_when_no_active_issue(client):
    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert len(actions) >= 1
    assert all("type" in a and "reason" in a for a in actions)


def test_recommended_actions_targets_detected_issue(client):
    client.post(
        "/api/v1/games/complete",
        json={
            "game_id": "rec-endpoint-drill",
            "score": 2,
            "total": 10,
            "duration_seconds": 45,
            "cognitive_outcomes": [{"hub": "perde-na-c3", "event": "WEAK_PROGRESSION", "severity": 0.8}],
        },
    )

    actions = api_data(client.get("/api/v1/ai/recommended-actions"))
    assert any(a["target_issue"] == "C3_LOW" for a in actions)
