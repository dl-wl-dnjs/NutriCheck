"""Align existing DBs with newer models. SQLAlchemy create_all does not ALTER tables."""

from sqlalchemy import Engine, text


def apply_postgres_column_patches(engine: Engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR"))
