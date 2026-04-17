from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ScanBarcodeRequest(BaseModel):
    user_id: str = Field(..., description="Authenticated user UUID")
    barcode: str = Field(..., min_length=4, max_length=32)

    @field_validator("barcode")
    @classmethod
    def digits_only(cls, v: str) -> str:
        cleaned = "".join(c for c in v.strip() if c.isdigit())
        if len(cleaned) < 4:
            raise ValueError("Barcode must contain at least 4 digits")
        return cleaned

    @field_validator("user_id")
    @classmethod
    def user_uuid(cls, v: str) -> str:
        UUID(v)
        return v


class ProductRatingBlock(BaseModel):
    score: int = Field(..., ge=0, le=100)
    label: str
    avoid: bool = False
    avoid_reason: str | None = None
    warnings: list[str] = Field(default_factory=list)
    limited_information: bool = False


class ProductSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    barcode: str
    name: str
    brand: str | None
    category: str | None
    ingredients_text: str | None
    simplified_summary: str | None
    nutriments: dict[str, Any] | None
    source: str


class ScanBarcodeResponse(BaseModel):
    product: ProductSummary
    rating: ProductRatingBlock
    scan_id: UUID
