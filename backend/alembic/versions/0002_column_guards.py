"""Add paragraph_count and json columns that were previously guarded at startup.

Revision ID: 0002_column_guards
Revises: 0001_ai_architecture
Create Date: 2026-05-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0002_column_guards"
down_revision: str | None = "0001_ai_architecture"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_if_missing(table: str, column: str, col_def: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        op.add_column(table, col_def)


def upgrade() -> None:
    _add_if_missing("essays", "paragraph_count", sa.Column("paragraph_count", sa.Integer(), nullable=False, server_default="0"))
    _add_if_missing("essay_versions", "paragraph_count", sa.Column("paragraph_count", sa.Integer(), nullable=False, server_default="0"))
    _add_if_missing("essay_themes", "supporting_texts", sa.Column("supporting_texts", sa.JSON(), nullable=True))
    _add_if_missing("essay_corrections", "inline_annotations", sa.Column("inline_annotations", sa.JSON(), nullable=True))
    _add_if_missing("essay_version_corrections", "inline_annotations", sa.Column("inline_annotations", sa.JSON(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_column("essay_version_corrections", "inline_annotations")
        op.drop_column("essay_corrections", "inline_annotations")
        op.drop_column("essay_themes", "supporting_texts")
        op.drop_column("essay_versions", "paragraph_count")
        op.drop_column("essays", "paragraph_count")
