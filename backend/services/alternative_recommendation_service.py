from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.exceptions import UserNotFoundError
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.models.user import User
from backend.schemas.alternatives import AlternativeItem, AlternativesResponse
from backend.schemas.scan import ProductRatingBlock, ProductSummary
from backend.services.rating_service import RatingResult, evaluate_product


def _summary(p: Product) -> ProductSummary:
    return ProductSummary(
        id=p.id,
        barcode=p.barcode,
        name=p.name,
        brand=p.brand,
        category=p.category,
        ingredients_text=p.ingredients_text,
        simplified_summary=p.simplified_summary,
        nutriments=p.nutriments,
        source=p.source,
    )


def _block(ev: RatingResult) -> ProductRatingBlock:
    return ProductRatingBlock(
        score=ev.score,
        label=ev.label,
        avoid=ev.avoid,
        avoid_reason=ev.avoid_reason,
        warnings=ev.warnings,
        limited_information=ev.limited_information,
    )


def list_alternatives(db: Session, user_id: uuid.UUID, product_id: uuid.UUID) -> AlternativesResponse:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError()

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if profile is None:
        raise ValueError("Health profile is required")

    source = db.get(Product, product_id)
    if source is None:
        raise ValueError("Product not found")

    source_eval = evaluate_product(profile, source)

    others = db.scalars(select(Product).where(Product.id != source.id)).all()
    evaluated: list[tuple[Product, RatingResult]] = []
    for p in others:
        ev = evaluate_product(profile, p)
        if ev.avoid:
            continue
        evaluated.append((p, ev))

    evaluated.sort(key=lambda x: -x[1].score)

    strictly_better = [(p, ev) for p, ev in evaluated if ev.score > source_eval.score]
    pool = strictly_better if len(strictly_better) >= 3 else evaluated

    items: list[AlternativeItem] = []
    seen: set[uuid.UUID] = set()
    for p, ev in pool:
        if p.id in seen:
            continue
        seen.add(p.id)
        note: str | None = None
        if ev.score <= source_eval.score:
            note = "Partial match: review suitability before switching."
        elif ev.score < source_eval.score + 10:
            note = "Moderate improvement vs current product."
        if len(items) >= 8:
            break
        items.append(AlternativeItem(product=_summary(p), rating=_block(ev), suitability_note=note))

    if len(items) < 3:
        for p, ev in evaluated:
            if p.id in seen:
                continue
            seen.add(p.id)
            items.append(
                AlternativeItem(
                    product=_summary(p),
                    rating=_block(ev),
                    suitability_note="Included to meet alternative suggestions",
                )
            )
            if len(items) >= 3:
                break

    return AlternativesResponse(source_product_id=source.id, alternatives=items[:10])
