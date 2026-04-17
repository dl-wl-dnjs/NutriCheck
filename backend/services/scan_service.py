from __future__ import annotations

import uuid
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.exceptions import UserNotFoundError
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.models.scan_history import ScanHistory
from backend.models.user import User
from backend.schemas.scan import ProductRatingBlock, ProductSummary, ScanBarcodeResponse
from backend.services.product_api_client import fetch_and_normalize
from backend.services.rating_service import RatingResult, evaluate_product


def get_or_create_product(db: Session, barcode: str) -> Product | None:
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None:
        return existing
    normalized = fetch_and_normalize(barcode)
    if normalized is None:
        return None
    product = Product(
        barcode=barcode,
        name=normalized["name"],
        brand=normalized.get("brand"),
        category=normalized.get("category"),
        ingredients_text=normalized.get("ingredients_text"),
        nutriments=normalized.get("nutriments"),
        simplified_summary=normalized.get("simplified_summary"),
        limited_data=bool(normalized.get("limited_data")),
        source=normalized.get("source", "unknown"),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _to_rating_block(result: RatingResult) -> ProductRatingBlock:
    return ProductRatingBlock(
        score=result.score,
        label=result.label,
        avoid=result.avoid,
        avoid_reason=result.avoid_reason,
        warnings=result.warnings,
        limited_information=result.limited_information,
    )


def _to_product_summary(product: Product) -> ProductSummary:
    return ProductSummary(
        id=product.id,
        barcode=product.barcode,
        name=product.name,
        brand=product.brand,
        category=product.category,
        ingredients_text=product.ingredients_text,
        simplified_summary=product.simplified_summary,
        nutriments=product.nutriments,
        source=product.source,
    )


def scan_barcode(db: Session, user_id: uuid.UUID, barcode: str) -> ScanBarcodeResponse:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError()

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if profile is None:
        raise ValueError("Health profile is required before scanning")

    product = get_or_create_product(db, barcode)
    if product is None:
        raise ValueError("Product not found for this barcode")

    rating = evaluate_product(profile, product)
    block = _to_rating_block(rating)

    entry = ScanHistory(
        user_id=user_id,
        product_id=product.id,
        barcode=barcode,
        score=block.score,
        label=block.label,
        avoid_reason=block.avoid_reason,
        warnings=block.warnings,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return ScanBarcodeResponse(
        product=_to_product_summary(product),
        rating=block,
        scan_id=entry.id,
    )
