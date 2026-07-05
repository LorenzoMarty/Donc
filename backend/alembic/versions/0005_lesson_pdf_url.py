"""Add pdf_url column to lessons.

Revision ID: 0005_lesson_pdf_url
Revises: 0004_module_items
Create Date: 2026-07-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0005_lesson_pdf_url"
down_revision: str | None = "0004_module_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_if_missing(table: str, column: str, col_def: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        op.add_column(table, col_def)


def upgrade() -> None:
    _add_if_missing("lessons", "pdf_url", sa.Column("pdf_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("lessons", "pdf_url")
