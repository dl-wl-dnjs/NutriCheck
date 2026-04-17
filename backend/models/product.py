import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(300), nullable=True)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ingredients_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    nutriments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    simplified_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Open Food Facts categories_tags (e.g. ["en:spreads", "en:chocolate-spreads"]). Used to
    # shortlist candidate products for the /alternatives/{product_id} endpoint.
    categories_tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    limited_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    scan_entries: Mapped[list["ScanHistory"]] = relationship(
        "ScanHistory", back_populates="product"
    )
