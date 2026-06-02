def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def test_user_can_manage_weekly_challenges(client):
    create_response = client.post(
        "/api/v1/dashboard/challenges",
        json={"title": "Escrever duas redacoes", "target": 2, "unit": "redacoes"},
    )
    assert create_response.status_code == 201
    challenge = api_data(create_response)
    assert challenge["title"] == "Escrever duas redacoes"
    assert challenge["target"] == 2
    assert challenge["completed"] is False
    assert challenge["due_date"]

    dashboard_response = client.get("/api/v1/dashboard")
    assert dashboard_response.status_code == 200
    dashboard = api_data(dashboard_response)
    assert challenge["id"] in {goal["id"] for goal in dashboard["goals"]}

    update_response = client.patch(f"/api/v1/dashboard/challenges/{challenge['id']}", json={"completed": True})
    assert update_response.status_code == 200
    updated = api_data(update_response)
    assert updated["completed"] is True
    assert updated["current"] == updated["target"]

    delete_response = client.delete(f"/api/v1/dashboard/challenges/{challenge['id']}")
    assert delete_response.status_code == 200

    dashboard_response = client.get("/api/v1/dashboard")
    dashboard = api_data(dashboard_response)
    assert challenge["id"] not in {goal["id"] for goal in dashboard["goals"]}
