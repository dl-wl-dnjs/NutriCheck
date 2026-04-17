"""GET /search — free-text product search that returns each hit already scored
against the caller's health profile.

Strategy mirrors ``/alternatives``:
1. Query ``search.openfoodfacts.org`` for the free-text string.
2. Normalize each hit, persist new products (so subsequent scans / alternatives
   calls are cheap), and reuse existing rows when we've already seen a barcode.
3. Score every hit with ``scoring.evaluate`` against the user's current profile
   so the list shows personalized green/amber/red badges right in the results.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.schemas.scan_v2 import ProductOut, RatingOut
from backend.schemas.search import SearchResponse, SearchResultItem
from backend.services.product_api_client import fetch_open_food_facts_by_name
from backend.services.scoring import ScoreResult, evaluate

router = APIRouter(tags=["search"])


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


def _rating_out(result: ScoreResult) -> RatingOut:
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


def _ingest_off_payload(db: Session, payload: dict) -> Product | None:
    barcode = str(payload.get("barcode") or "").strip()
    if not barcode:
        return None
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None:
        changed = False
        if existing.image_url in (None, "") and payload.get("image_url"):
            existing.image_url = payload["image_url"]
            changed = True
        if not existing.categories_tags and payload.get("categories_tags"):
            existing.categories_tags = payload["categories_tags"]
            changed = True
        if changed:
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return existing
    name = payload.get("name")
    if not name:
        return None
    product = Product(
        barcode=barcode,
        name=name,
        brand=payload.get("brand"),
        category=payload.get("category"),
        ingredients_text=payload.get("ingredients_text"),
        nutriments=payload.get("nutriments"),
        simplified_summary=payload.get("simplified_summary"),
        image_url=payload.get("image_url"),
        categories_tags=payload.get("categories_tags"),
        limited_data=bool(payload.get("limited_data", False)),
        source=payload.get("source", "openfoodfacts"),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/search", response_model=SearchResponse)
def search_products(
    q: str = Query(..., min_length=2, max_length=120),
    user_id: UUID = Query(...),
    limit: int = Query(default=20, ge=1, le=40),
    db: Session = Depends(get_db),
) -> SearchResponse:
    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if profile is None:
        raise HTTPException(
            status_code=409,
            detail="Health profile is required. PUT /profile/{user_id} first.",
        )

    query_text = q.strip()
    if not query_text:
        return SearchResponse(items=[], query=query_text)

    payloads = fetch_open_food_facts_by_name(query_text, page_size=limit)
    if not payloads:
        return SearchResponse(items=[], query=query_text)

    seen: set[str] = set()
    items: list[SearchResultItem] = []
    for payload in payloads:
        barcode = payload.get("barcode")
        if not barcode or barcode in seen:
            continue
        seen.add(barcode)
        product = _ingest_off_payload(db, payload)
        if product is None:
            continue
        result = evaluate(profile, product)
        items.append(
            SearchResultItem(product=_product_out(product), rating=_rating_out(result))
        )
    return SearchResponse(items=items, query=query_text)
