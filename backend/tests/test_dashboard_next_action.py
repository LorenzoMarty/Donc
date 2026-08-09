"""REQ-17: GET /dashboard inclui next_action consistente com GET /ai/recommended-actions."""


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_dashboard_includes_next_action(client):
    dashboard = api_data(client.get("/api/v1/dashboard"))
    assert "next_action" in dashboard
    assert dashboard["next_action"]["reason"]


def test_dashboard_next_action_matches_recommended_actions_endpoint(client):
    dashboard = api_data(client.get("/api/v1/dashboard"))
    recommended = api_data(client.get("/api/v1/ai/recommended-actions"))

    assert dashboard["next_action"]["type"] == recommended[0]["type"]
    assert dashboard["next_action"]["target_issue"] == recommended[0]["target_issue"]
