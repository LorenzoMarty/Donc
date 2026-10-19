"""Streak reminder emails: users.reminders_opt_out + users.last_reminder_at.

Revision ID: 0047_reminders
Revises: 0046_coupon_redemptions
Create Date: 2026-10-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0047_reminders"
down_revision: str | None = "0046_coupon_redemptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reminders_opt_out", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("last_reminder_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_reminder_at")
    op.drop_column("users", "reminders_opt_out")
