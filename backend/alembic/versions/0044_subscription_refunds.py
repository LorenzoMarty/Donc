"""Audit table for admin refunds of subscription charges.

Revision ID: 0044_subscription_refunds
Revises: 0043_email_verification
Create Date: 2026-10-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0044_subscription_refunds"
down_revision: str | None = "0043_email_verification"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "subscription_refunds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("admin_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mp_payment_id", sa.String(120), nullable=False, unique=True),
        sa.Column("amount_cents", sa.BigInteger(), nullable=False),
        sa.Column("refunded_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subscription_refunds_subscription_id", "subscription_refunds", ["subscription_id"])


def downgrade() -> None:
    op.drop_table("subscription_refunds")
