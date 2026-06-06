"""Module items and activity source lessons.

Revision ID: 0004_module_items
Revises: 0003_admin_telemetry
Create Date: 2026-06-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0004_module_items"
down_revision: str | None = "0003_admin_telemetry"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _add_if_missing(table: str, column: str, col_def: sa.Column) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns(table)}
    if column not in existing:
        op.add_column(table, col_def)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "module_items" not in inspector.get_table_names():
        op.create_table(
            "module_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id", ondelete="CASCADE"), nullable=False),
            sa.Column("kind", sa.String(length=24), nullable=False),
            sa.Column("lesson_id", sa.Integer(), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True),
            sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id", ondelete="CASCADE"), nullable=True),
            sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_module_items_module_order", "module_items", ["module_id", "order"])

    _add_if_missing("exercises", "base_lesson_ids", sa.Column("base_lesson_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")))

    connection = op.get_bind()
    lesson_rows = connection.execute(sa.text("SELECT id, module_id, \"order\" FROM lessons")).fetchall()
    for lesson_id, module_id, order_value in lesson_rows:
        exists = connection.execute(
            sa.text("SELECT id FROM module_items WHERE lesson_id = :lesson_id"),
            {"lesson_id": lesson_id},
        ).fetchone()
        if not exists:
            connection.execute(
                sa.text(
                    "INSERT INTO module_items (module_id, kind, lesson_id, exercise_id, \"order\") "
                    "VALUES (:module_id, 'lesson', :lesson_id, NULL, :order_value)"
                ),
                {"module_id": module_id, "lesson_id": lesson_id, "order_value": order_value or 0},
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.drop_column("exercises", "base_lesson_ids")
    inspector = sa.inspect(bind)
    if "module_items" in inspector.get_table_names():
        try:
            op.drop_index("ix_module_items_module_order", table_name="module_items")
        except Exception:
            pass
        op.drop_table("module_items")
