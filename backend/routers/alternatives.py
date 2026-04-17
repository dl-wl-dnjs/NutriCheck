"""GET /alternatives/{product_id} — rank same-category products that score higher
than the scanned item for the user's profile.

Strategy:
1. Shortlist candidates from our own ``products`` table that share at least one
   ``categories_tags`` entry with the target (fast, no external calls).
2. If the shortlist is thin (< ``MIN_LOCAL_CANDIDATES``) and the target has an
   Open Food Facts ``categories_tags`` list, pull the most popular products in
   that category from OFF and persist any new rows so subsequent requests are
   cheap.
3. Score every candidate with the canonical ``scoring.evaluate`` and return the
   ones that are strictly healthier than the target (higher score, not AVOID),
   sorted by score desc.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.schemas.alternatives import AlternativeItem, AlternativesResponse
from backend.schemas.scan_v2 import ProductOut, RatingOut
from backend.services.product_api_client import (
    fetch_open_food_facts_by_category,
    fetch_open_food_facts_by_name,
)
from backend.services.scoring import ScoreResult, evaluate

router = APIRouter(tags=["alternatives"])

MIN_LOCAL_CANDIDATES = 8
MAX_OFF_FETCH = 20
# Minimum number of peer hits that must agree on a tag before we trust it as
# the target's inferred category for a broader search.
CATEGORY_VOTES = 2


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


def _suitability_note(target_score: int, candidate_score: int, warnings: list[str]) -> str:
    delta = candidate_score - target_score
    if delta >= 20:
        return "Much better fit for your profile."
    if delta >= 10:
        return "Clearly better fit for your profile."
    if warnings:
        return "Slightly better — still watch the flagged nutrients."
    return "Slightly better fit for your profile."


def _pick_search_tag(tags: list[str] | None) -> str | None:
    """Pick the most specific English category tag we can search against."""
    if not tags:
        return None
    en = [t for t in tags if isinstance(t, str) and t.startswith("en:")]
    if not en:
        return None
    # OFF lists categories_tags from broadest to narrowest; the last "en:" entry is
    # typically the most specific (e.g. chocolate-spreads beats spreads).
    return en[-1]


def _local_candidates(db: Session, target: Product) -> list[Product]:
    tags = target.categories_tags or []
    if tags:
        # JSONB ?| operator: true if any of the given text keys exist as top-level array
        # elements. RHS must be text[]; postgresql.array emits an ARRAY[...] literal so
        # psycopg2 doesn't silently coerce our list to JSONB.
        rows = db.scalars(
            select(Product)
            .where(Product.id != target.id)
            .where(Product.categories_tags.op("?|")(array(list(tags))))  # type: ignore[attr-defined]
            .limit(50)
        ).all()
        if rows:
            return list(rows)
    if target.category:
        rows = db.scalars(
            select(Product)
            .where(Product.id != target.id)
            .where(Product.category == target.category)
            .limit(50)
        ).all()
        return list(rows)
    return []


def _ingest_off_payload(db: Session, payload: dict) -> Product | None:
    """Persist an OFF-normalized payload; return the stored Product (new or existing)."""
    barcode = str(payload.get("barcode") or "").strip()
    if not barcode:
        return None
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None:
        # Opportunistic backfill so category pages contribute images to older rows.
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


@router.get("/alternatives/{product_id}", response_model=AlternativesResponse)
def get_alternatives(
    product_id: UUID,
    user_id: UUID = Query(...),
    limit: int = Query(default=5, ge=1, le=15),
    db: Session = Depends(get_db),
) -> AlternativesResponse:
    target = db.get(Product, product_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Product not found")

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user_id))
    if profile is None:
        raise HTTPException(
            status_code=409,
            detail="Health profile is required. PUT /profile/{user_id} first.",
        )

    target_result = evaluate(profile, target)
    target_score = target_result.score

    candidates: list[Product] = _local_candidates(db, target)

    if len(candidates) < MIN_LOCAL_CANDIDATES:
        tag = _pick_search_tag(target.categories_tags)
        if tag:
            exclude = {target.barcode, *(c.barcode for c in candidates)}
            payloads = fetch_open_food_facts_by_category(
                tag, page_size=MAX_OFF_FETCH, exclude_barcodes=exclude
            )
            for payload in payloads:
                p = _ingest_off_payload(db, payload)
                if p is not None and p.id != target.id:
                    candidates.append(p)

    # Name-based fallback for products OFF has no category data on (lots of UK
    # and USDA-originated listings land here). We first do a name search to find
    # similarly-named products; if any of them carry categories_tags we use the
    # most common one to run a proper category search (which returns genuine
    # peers rather than variant packagings of the same product). The raw name
    # hits stay in the candidate pool as a last resort.
    if len(candidates) < MIN_LOCAL_CANDIDATES and target.name:
        exclude = {target.barcode, *(c.barcode for c in candidates)}
        name_payloads = fetch_open_food_facts_by_name(
            target.name,
            brand=target.brand,
            page_size=MAX_OFF_FETCH,
            exclude_barcodes=exclude,
        )

        # Infer a category from peer hits — pick the most specific tag that at
        # least CATEGORY_VOTES peers agree on, preferring the last (most narrow)
        # tag in each peer's chain.
        inferred_tag: str | None = None
        tag_scores: dict[str, tuple[int, int]] = {}
        for payload in name_payloads:
            tags = payload.get("categories_tags") or []
            if not isinstance(tags, list):
                continue
            en_tags = [t for t in tags if isinstance(t, str) and t.startswith("en:")]
            for depth, t in enumerate(en_tags):
                count, best_depth = tag_scores.get(t, (0, 0))
                tag_scores[t] = (count + 1, max(best_depth, depth))
        qualified = [
            (t, count, depth)
            for t, (count, depth) in tag_scores.items()
            if count >= CATEGORY_VOTES
        ]
        if qualified:
            qualified.sort(key=lambda x: (x[1], x[2]), reverse=True)
            inferred_tag = qualified[0][0]
            # Persist the inferred tag so the next request hits the fast path
            # and so the product screen itself is more useful over time.
            existing_tags = target.categories_tags or []
            if inferred_tag not in existing_tags:
                target.categories_tags = [*existing_tags, inferred_tag]
                db.add(target)
                db.commit()
                db.refresh(target)

        if inferred_tag:
            exclude_c = {target.barcode, *(c.barcode for c in candidates)}
            cat_payloads = fetch_open_food_facts_by_category(
                inferred_tag, page_size=MAX_OFF_FETCH, exclude_barcodes=exclude_c
            )
            for payload in cat_payloads:
                p = _ingest_off_payload(db, payload)
                if p is not None and p.id != target.id:
                    candidates.append(p)

        # Always keep the raw name hits too — if the inferred-category search
        # comes back empty we still have something to rank.
        for payload in name_payloads:
            p = _ingest_off_payload(db, payload)
            if p is not None and p.id != target.id:
                candidates.append(p)

    if not candidates:
        return AlternativesResponse(
            items=[],
            note="We don't have enough comparable products to suggest alternatives yet.",
        )

    scored: list[tuple[Product, ScoreResult]] = []
    seen_barcodes: set[str] = {target.barcode}
    for c in candidates:
        if c.barcode in seen_barcodes:
            continue
        seen_barcodes.add(c.barcode)
        r = evaluate(profile, c)
        if r.avoid:
            continue
        if r.score <= target_score:
            continue
        scored.append((c, r))

    scored.sort(key=lambda pair: pair[1].score, reverse=True)
    top = scored[:limit]

    items = [
        AlternativeItem(
            product=_product_out(p),
            rating=_rating_out(r),
            suitability_note=_suitability_note(target_score, r.score, r.warnings),
        )
        for p, r in top
    ]
    return AlternativesResponse(items=items)
