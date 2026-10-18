"""Support ticket thread: support_ticket_messages (admin replies + student follow-ups).

The new `suggestion` category needs no DDL (category is a plain string column).

Revision ID: 0043_support_messages
Revises: 0042_lesson_published
Create Date: 2026-10-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0043_support_messages"
down_revision: str | None = "0042_lesson_published"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "support_ticket_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ticket_id", sa.Integer(), sa.ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_role", sa.String(20), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_support_ticket_messages_ticket_id", "support_ticket_messages", ["ticket_id"])


def downgrade() -> None:
    op.drop_table("support_ticket_messages")
