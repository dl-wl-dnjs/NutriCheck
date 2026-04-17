"""add categories_tags to products so we can shortlist alternatives by category

Revision ID: 0003_categories
Revises: 0002_image_url
Create Date: 2026-04-17 21:00:00

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_categories"
down_revision: str | None = "0002_image_url"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("categories_tags", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "categories_tags")
