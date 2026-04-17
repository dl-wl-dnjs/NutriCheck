"""add image_url to products so the app can render product photos

Revision ID: 0002_image_url
Revises: 0001_initial
Create Date: 2026-04-17 20:00:00

"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_image_url"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("products", sa.Column("image_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "image_url")
