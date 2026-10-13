"""Record Terms/Privacy acceptance (timestamp + version) on users.

Revision ID: 0041_user_terms_acceptance
Revises: 0040_password_reset_tokens
Create Date: 2026-10-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "0041_user_terms_acceptance"
down_revision: str | None = "0040_password_reset_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("terms_version", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "terms_version")
    op.drop_column("users", "terms_accepted_at")
