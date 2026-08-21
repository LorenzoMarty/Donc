"""Add users.deleted_at — soft-delete replaces hard delete + CASCADE wipe of pedagogical history.

Revision ID: 0029_user_soft_delete
Revises: 0028_hard_content_wipe_games
Create Date: 2026-08-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0029_user_soft_delete"
down_revision: str | None = "0028_hard_content_wipe_games"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "deleted_at")
