"""Coupon redemption history (one coupon per account even if the subscription is redone).

Revision ID: 0043_coupon_redemptions
Revises: 0042_lesson_published
Create Date: 2026-10-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0043_coupon_redemptions"
down_revision: str | None = "0042_lesson_published"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "coupon_redemptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("coupon_code", sa.String(40), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("coupon_code", "user_id", name="uq_coupon_redemption_user"),
    )
    op.create_index("ix_coupon_redemptions_coupon_code", "coupon_redemptions", ["coupon_code"])
    # Quem ja consumiu um cupom antes desta migration continua barrado de reusar.
    op.execute(
        "INSERT INTO coupon_redemptions (coupon_code, user_id) "
        "SELECT coupon_code, user_id FROM subscriptions WHERE coupon_applied AND coupon_code IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_table("coupon_redemptions")
