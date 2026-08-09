"""REQ-40..43 / REQ-50: auditoria de seguranca do admin em nivel HTTP.

O fixture `client` (conftest.py) tem `get_current_user` sobrescrito globalmente para devolver o
aluno demo (role=student) — qualquer endpoint /admin/* que NAO tenha `require_admin` bem aplicado
vazaria dados/acao pra um estudante aqui. Cobre uma amostra representativa de cada grupo de rota
(metricas, conteudo, usuarios, telemetria, jogos IA), nao as 30 rotas uma a uma (ja auditadas por
leitura de codigo — todas usam `Depends(require_admin)` exceto `POST /admin/events`, intencional).
"""

import pytest

STUDENT_BLOCKED_CASES = [
    ("get", "/api/v1/admin/metrics", None),
    ("get", "/api/v1/admin/users", None),
    ("get", "/api/v1/admin/content", None),
    ("get", "/api/v1/admin/essay-themes", None),
    ("get", "/api/v1/admin/ai-telemetry", None),
    ("get", "/api/v1/admin/user-activity", None),
    ("get", "/api/v1/admin/ai-games", None),
    ("post", "/api/v1/admin/modules", {"title": "X", "description": "Y"}),
    ("patch", "/api/v1/admin/users/1", {"name": "Hackeado"}),
    ("delete", "/api/v1/admin/users/1", None),
]


@pytest.mark.parametrize("method,path,payload", STUDENT_BLOCKED_CASES)
def test_student_cannot_access_admin_endpoint(client, method, path, payload):
    call = getattr(client, method)
    response = call(path, json=payload) if payload is not None else call(path)
    assert response.status_code == 403
    assert response.json()["error"] == "admin_required"


def test_admin_events_endpoint_is_intentionally_open_to_any_authenticated_user(client):
    response = client.post("/api/v1/admin/events", json={"event_type": "lesson_opened"})
    assert response.status_code == 200
