"""POST /scan and GET /scan-history — authenticated."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from backend.auth import assert_user_id_matches_client, get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.models.scan_history import ScanHistory
from backend.models.user import User
from backend.schemas.scan_v2 import (
    ProductOut,
    RatingOut,
    ScanHistoryItemOut,
    ScanHistoryResponse,
    ScanRequest,
    ScanResponse,
)
from backend.services.openfoodfacts import fetch_product
from backend.services.scoring import ScoreResult, evaluate

router = APIRouter(tags=["scan"])


def _assert_path_user(user: User, user_id: UUID) -> None:
    assert_user_id_matches_client(
        user,
        user_id,
        detail="Cannot access another user's scan data",
    )


def _get_or_create_product(db: Session, barcode: str) -> Product | None:
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None:
        needs_backfill = existing.source == "openfoodfacts" and (
            existing.image_url in (None, "")
            or not existing.categories_tags
            or (not existing.allergens_tags and not existing.allergen_statement)
        )
        if needs_backfill:
            payload = fetch_product(barcode)
            if payload:
                if existing.image_url in (None, "") and payload.get("image_url"):
                    existing.image_url = payload["image_url"]
                if not existing.categories_tags and payload.get("categories_tags"):
                    existing.categories_tags = payload["categories_tags"]
                if not existing.allergens_tags and not existing.allergen_statement:
                    if payload.get("allergens_tags"):
                        existing.allergens_tags = payload["allergens_tags"]
                    if payload.get("traces_tags"):
                        existing.traces_tags = payload["traces_tags"]
                    if payload.get("allergen_statement"):
                        existing.allergen_statement = payload["allergen_statement"]
                db.add(existing)
                db.commit()
                db.refresh(existing)
        return existing
    payload = fetch_product(barcode)
    if payload is None:
        return None
    product = Product(
        barcode=barcode,
        name=payload["name"],
        brand=payload.get("brand"),
        category=payload.get("category"),
        ingredients_text=payload.get("ingredients_text"),
        nutriments=payload.get("nutriments"),
        simplified_summary=payload.get("simplified_summary"),
        image_url=payload.get("image_url"),
        categories_tags=payload.get("categories_tags"),
        allergen_statement=payload.get("allergen_statement"),
        allergens_tags=payload.get("allergens_tags"),
        traces_tags=payload.get("traces_tags"),
        limited_data=bool(payload.get("limited_data", False)),
        source=payload.get("source", "unknown"),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _score_to_rating(result: ScoreResult) -> RatingOut:
    return RatingOut(
        score=result.score,
        tier=result.tier,
        label=result.label,
        avoid=result.avoid,
        avoid_reason=result.avoid_reason,
        warnings=result.warnings,
        recommendation=result.recommendation,
        limited_information=result.limited_information,
    )


def _product_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        barcode=p.barcode,
        name=p.name,
        brand=p.brand,
        category=p.category,
        ingredients_text=p.ingredients_text,
        simplified_summary=p.simplified_summary,
        nutriments=p.nutriments,
        image_url=p.image_url,
        source=p.source,
    )


@router.post("/scan", response_model=ScanResponse)
def post_scan(
    body: ScanRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ScanResponse:
    assert_user_id_matches_client(
        user,
        body.user_id,
        detail="user_id does not match authenticated user",
    )
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
    if profile is None:
        raise HTTPException(
            status_code=409,
            detail="Health profile is required before scanning. PUT /profile first.",
        )

    product = _get_or_create_product(db, body.barcode)
    if product is None:
        src = "USDA FoodData Central (Branded)" if settings.usda_only_mode else "Open Food Facts or USDA"
        raise HTTPException(
            status_code=404,
            detail=f"Product not found in {src} for this barcode.",
        )

    result = evaluate(profile, product)
    rating = _score_to_rating(result)

    entry = db.scalar(
        select(ScanHistory)
        .where(ScanHistory.user_id == user.id)
        .where(ScanHistory.product_id == product.id)
    )
    if entry is None:
        entry = ScanHistory(
            user_id=user.id,
            product_id=product.id,
            barcode=body.barcode,
            score=rating.score,
            label=rating.label,
            avoid_reason=rating.avoid_reason,
            warnings=rating.warnings,
        )
        db.add(entry)
    else:
        entry.barcode = body.barcode
        entry.score = rating.score
        entry.label = rating.label
        entry.avoid_reason = rating.avoid_reason
        entry.warnings = rating.warnings
        entry.created_at = func.now()
    db.commit()
    db.refresh(entry)

    return ScanResponse(scan_id=entry.id, product=_product_out(product), rating=rating)


def _tier_for(score: int) -> str:
    if score >= 70:
        return "good"
    if score >= 40:
        return "okay"
    return "bad"


def _label_for(score: int) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"


@router.get("/scan-history", response_model=ScanHistoryResponse)
def get_scan_history(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=10, ge=1, le=50),
) -> ScanHistoryResponse:
    rows = (
        db.scalars(
            select(ScanHistory)
            .options(joinedload(ScanHistory.product))
            .where(ScanHistory.user_id == user.id)
            .order_by(ScanHistory.created_at.desc())
            .limit(limit)
        )
        .unique()
        .all()
    )
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
    items: list[ScanHistoryItemOut] = []
    for r in rows:
        if r.product is not None and profile is not None:
            result = evaluate(profile, r.product)
            score = result.score
            tier = result.tier
            label = result.label
        else:
            score = r.score
            tier = _tier_for(score)
            label = _label_for(score)
        items.append(
            ScanHistoryItemOut(
                id=r.id,
                barcode=r.barcode,
                score=score,
                tier=tier,
                label=label,
                created_at=r.created_at,
                product_name=r.product.name if r.product is not None else None,
                product_brand=r.product.brand if r.product is not None else None,
                product_image_url=r.product.image_url if r.product is not None else None,
            )
        )
    return ScanHistoryResponse(items=items)


@router.get("/scan-history/{user_id}", response_model=ScanHistoryResponse)
def get_scan_history_scoped(
    user_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=10, ge=1, le=50),
) -> ScanHistoryResponse:
    _assert_path_user(user, user_id)
    return get_scan_history(db=db, user=user, limit=limit)