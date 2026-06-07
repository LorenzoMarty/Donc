"""Payloads e dados reutilizáveis para os testes."""

from __future__ import annotations

# Payload válido para concluir um jogo (POST /games/complete).
VALID_GAME_COMPLETE = {"game_id": "version-duel", "xp_earned": 76}

# Payload válido de progresso (PUT /games/progress/{game_id}).
VALID_GAME_PROGRESS = {"plays": 1, "best_score": 8, "best_accuracy": 90, "progress": 90}

# Credenciais do usuário demo semeado pelo SEED_DEMO_DATA.
DEMO_USER = {"email": "aluno@demo.com", "password": "12345678"}
