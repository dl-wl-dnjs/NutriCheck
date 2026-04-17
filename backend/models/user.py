from __future__ import annotations

import uuid

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str | None] = mapped_column(nullable=True)
    display_name: Mapped[str | None] = mapped_column(nullable=True)

    health_profile: Mapped["HealthProfile | None"] = relationship(
        "HealthProfile", back_populates="user", uselist=False
    )
    scan_history: Mapped[list["ScanHistory"]] = relationship(
        "ScanHistory", back_populates="user"
    )
