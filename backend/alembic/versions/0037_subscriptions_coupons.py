"""Add subscriptions, coupons, processed_webhook_events — sistema de planos pagos via
Mercado Pago (spec sistema-planos-mercadopago): acesso 100% pago, ciclo mensal/anual,
cupom de desconto administrado no painel admin.

Revision ID: 0037_subscriptions_coupons
Revises: 0036_essay_correction_fallback
Create Date: 2026-09-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0037_subscriptions_coupons"
down_revision: str | None = "0036_essay_correction_fallback"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Labels = nomes dos membros dos Enum Python (src/models/subscription.py), nao os `.value`
# minusculos usados na API — SQLAlchemy serializa Enum(PythonEnumClass) usando `.name` por
# padrao (mesmo padrao ja usado por UserRole/users.role), entao o enum nativo do Postgres
# precisa destes labels pra bater com o que o ORM realmente grava.
plan_cycle_enum = sa.Enum("MONTHLY", "ANNUAL", name="plancycle")
subscription_status_enum = sa.Enum("PENDING", "ACTIVE", "GRACE", "SUSPENDED", "CANCELED", name="subscriptionstatus")
discount_type_enum = sa.Enum("PERCENT", "FIXED", name="discounttype")


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("cycle", plan_cycle_enum, nullable=False),
        sa.Column("status", subscription_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("mp_preapproval_id", sa.String(length=120), nullable=True, unique=True),
        sa.Column("price_charged_cents", sa.BigInteger(), nullable=False),
        sa.Column("coupon_code", sa.String(length=40), nullable=True),
        sa.Column("coupon_applied", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("grace_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"], unique=True)
    op.create_index("ix_subscriptions_mp_preapproval_id", "subscriptions", ["mp_preapproval_id"], unique=True)

    op.create_table(
        "coupons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=40), nullable=False, unique=True),
        sa.Column("discount_type", discount_type_enum, nullable=False),
        sa.Column("discount_value", sa.Integer(), nullable=False),
        sa.Column("valid_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("used_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"], unique=True)

    op.create_table(
        "processed_webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("mp_notification_id", sa.String(length=120), nullable=False, unique=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_processed_webhook_events_mp_notification_id",
        "processed_webhook_events",
        ["mp_notification_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_processed_webhook_events_mp_notification_id", table_name="processed_webhook_events")
    op.drop_table("processed_webhook_events")
    op.drop_index("ix_coupons_code", table_name="coupons")
    op.drop_table("coupons")
    op.drop_index("ix_subscriptions_mp_preapproval_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_user_id", table_name="subscriptions")
    op.drop_table("subscriptions")
    plan_cycle_enum.drop(op.get_bind(), checkfirst=True)
    subscription_status_enum.drop(op.get_bind(), checkfirst=True)
    discount_type_enum.drop(op.get_bind(), checkfirst=True)
