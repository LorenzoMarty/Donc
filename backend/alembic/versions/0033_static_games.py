"""Add static_games — registro mínimo do catálogo estático de jogos (frontend/src/games/*), pra
o backend poder validar game_id de jogo estático (antes só jogos ai-* eram validados).

Revision ID: 0033_static_games
Revises: 0032_reclog_typed_target
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0033_static_games"
down_revision: str | None = "0032_reclog_typed_target"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Extraído de frontend/src/games/*/index.ts (id + category de cada GameDefinition) em 2026-08-21.
# Não sincroniza automaticamente — jogo estático novo no frontend precisa de migration nova aqui.
_SEED = [
    ("artificiality-detector", "coesao"),
    ("daily-mixed-rush", "desafios-diarios"),
    ("daily-fill", "desafios-diarios"),
    ("daily-order", "desafios-diarios"),
    ("competency-diagnosis", "competencias-enem"),
    ("competency-classify", "competencias-enem"),
    ("connectives-precision", "coesao"),
    ("referential-cohesion", "coesao"),
    ("connective-function-match", "coesao"),
    ("corrector-diagnosis", "competencias-enem"),
    ("version-duel", "argumentacao"),
    ("argument-escalation", "argumentacao"),
    ("grammar-hunt", "gramatica"),
    ("comma-surgeon", "gramatica"),
    ("register-classify", "gramatica"),
    ("repertoire-match", "repertorio"),
    ("cultural-bridge", "repertorio"),
    ("repertoire-rush", "repertorio"),
    ("essay-assembly", "estrutura"),
    ("paragraph-flow", "estrutura"),
    ("intervention-builder", "estrutura"),
    ("survival-marathon", "desafios-diarios"),
    ("text-surgery", "estrutura"),
    ("argument-map", "argumentacao"),
    ("fallacy-hunt", "argumentacao"),
]


def upgrade() -> None:
    op.create_table(
        "static_games",
        sa.Column("id", sa.String(length=60), primary_key=True),
        sa.Column("category", sa.String(length=40), nullable=False),
    )
    table = sa.table("static_games", sa.column("id"), sa.column("category"))
    op.bulk_insert(table, [{"id": gid, "category": category} for gid, category in _SEED])


def downgrade() -> None:
    op.drop_table("static_games")
