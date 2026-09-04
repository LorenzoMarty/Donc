"""Add used_fallback to essay_corrections/essay_version_corrections — marca correcao 100%
heuristica (fallback, sem IA real) em vez de deixá-la indistinguível de uma correção normal.

Revision ID: 0036_essay_correction_used_fallback
Revises: 0035_user_session_version
Create Date: 2026-09-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0036_essay_correction_used_fallback"
down_revision: str | None = "0035_user_session_version"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("essay_corrections", sa.Column("used_fallback", sa.Boolean(), nullable=False, server_default="false"))
    op.alter_column("essay_corrections", "used_fallback", server_default=None)
    op.add_column("essay_version_corrections", sa.Column("used_fallback", sa.Boolean(), nullable=False, server_default="false"))
    op.alter_column("essay_version_corrections", "used_fallback", server_default=None)


def downgrade() -> None:
    op.drop_column("essay_version_corrections", "used_fallback")
    op.drop_column("essay_corrections", "used_fallback")
