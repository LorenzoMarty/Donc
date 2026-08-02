def test_validation_error_returns_friendly_pt_br_message(client):
    response = client.post("/api/v1/auth/register", json={"name": "Sem email nem senha"})

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["message"] == "Dados enviados são inválidos."


def test_app_error_returns_its_own_message_and_code(client):
    response = client.get("/api/v1/essays/999999")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"] == "essay_not_found"
    assert body["message"] == "Redação não encontrada."
