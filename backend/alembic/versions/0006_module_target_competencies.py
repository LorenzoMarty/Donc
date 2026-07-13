"""Add target_competencies column to modules.

Revision ID: 0006_module_target_competencies
Revises: 0005_lesson_pdf_url
Create Date: 2026-07-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0006_module_target_competencies"
down_revision: str | None = "0005_lesson_pdf_url"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_if_missing(table: str, column: str, col_def: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        op.add_column(table, col_def)


def upgrade() -> None:
    _add_if_missing(
        "modules",
        "target_competencies",
        sa.Column("target_competencies", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )


def downgrade() -> None:
    op.drop_column("modules", "target_competencies")
