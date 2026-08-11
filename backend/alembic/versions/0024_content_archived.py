"""Add exercises.archived — P2c Bloco 3 (REQ-12): despublicacao reversivel de exercicio
(AIGeneratedGame.status ja aceita "archived" como valor livre, nao precisa migration).

Revision ID: 0024_content_archived
Revises: 0023_content_versions
Create Date: 2026-08-10
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0024_content_archived"
down_revision: str | None = "0023_content_versions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("exercises", "archived")
