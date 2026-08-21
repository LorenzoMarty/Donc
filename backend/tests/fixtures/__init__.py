"""Payloads e dados reutilizáveis para os testes."""

from __future__ import annotations

# Payload válido para concluir um jogo (POST /games/complete).
VALID_GAME_COMPLETE = {"game_id": "version-duel", "score": 8, "total": 10, "duration_seconds": 60}

# Credenciais do usuário demo semeado pelo SEED_DEMO_DATA.
DEMO_USER = {"email": "aluno@demo.com", "password": "12345678"}
