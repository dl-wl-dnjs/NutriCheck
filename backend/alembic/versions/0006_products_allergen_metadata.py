"""add Open Food Facts allergen tags + statement for profile allergen matching

Revision ID: 0006_allergen_meta
Revises: 0005_auth_sub
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_allergen_meta"
down_revision: str | None = "0005_auth_sub"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("allergen_statement", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("allergens_tags", postgresql.JSONB(), nullable=True))
    op.add_column("products", sa.Column("traces_tags", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "traces_tags")
    op.drop_column("products", "allergens_tags")
    op.drop_column("products", "allergen_statement")
