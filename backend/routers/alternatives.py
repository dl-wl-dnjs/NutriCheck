"""GET /alternatives/{product_id}: healthier same-category foods for the user's profile.

Pipeline: local DB peers, optional category fetch when the pool is small, **always** an
Open Food Facts **name/brand search** to add similar products, then peer matching, scoring,
sugar/sat checks, diversify. Fallback tiers return the best same-category options with clear
``note`` text when nothing clearly healthier passes.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import array
from sqlalchemy.orm import Session

from backend.auth import assert_user_id_matches_client, get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.models.user import User
from backend.schemas.alternatives import AlternativeItem, AlternativesResponse
from backend.schemas.scan_v2 import ProductOut, RatingOut
from backend.services.alternative_peers import (
    SUGAR_IMPROVEMENT_G,
    dedupe_products_by_barcode,
    filter_peer_candidates,
    filter_peer_last_resort_same_aisle,
    filter_peer_loose_shared_en,
    filter_sat_fat_better_peers,
    filter_sugar_better_peers,
    is_weak_category_label,
    pick_parent_category_tag,
    saturated_fat_100g,
    sugars_100g,
)
from backend.services.product_api_client import (
    fetch_and_normalize,
    fetch_open_food_facts_by_category,
    fetch_open_food_facts_by_name,
    fetch_usda_foods_by_fdc_ids,
    filled_macro_field_count,
    merge_nutriments_for_richness,
    normalize_from_usda,
    search_usda_branded,
    usda_gtin_matches_scan,
    usda_search_query_from_product_name,
)
from backend.services.scoring import ScoreResult, evaluate

router = APIRouter(tags=["alternatives"])

MIN_LOCAL_CANDIDATES = 8
MAX_OFF_FETCH = 40
CATEGORY_VOTES = 2
# Cap full ``fetch_and_normalize`` (OFF + USDA) calls per alternatives request so the
# client does not hit HTTP timeouts; repeat visits skip refetch when the DB row is rich.
MAX_ALTERNATIVES_FULL_FETCHES = 16
# Skip network when this many macro fields exist and we have at least one ``en:`` tag.
_MIN_MACRO_FIELDS_TO_SKIP_REFETCH = 5


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

def _diversify_by_brand(
    scored: list[tuple[Product, ScoreResult]],
    limit: int,
    *,
    max_per_brand: int = 1,
) -> list[tuple[Product, ScoreResult]]:
    brand_counts: dict[str | None, int] = {}
    picked: list[tuple[Product, ScoreResult]] = []
    deferred: list[tuple[Product, ScoreResult]] = []
    for p, r in scored:
        key = (p.brand or "").strip().lower() or None
        used = brand_counts.get(key, 0)
        if used < max_per_brand:
            picked.append((p, r))
            brand_counts[key] = used + 1
            if len(picked) >= limit:
                return picked
        else:
            deferred.append((p, r))
    for p, r in deferred:
        if len(picked) >= limit:
            break
        picked.append((p, r))
    return picked[:limit]


def _suitability_note(target_score: int, candidate_score: int, warnings: list[str]) -> str:
    delta = candidate_score - target_score
    if delta >= 20:
        return "Much healthier for your profile in this same food category."
    if delta >= 10:
        return "Clearly healthier for your profile in this same food category."
    if warnings:
        return "Healthier in this category for your profile; still check flagged nutrients on the label."
    if delta >= 3:
        return "Healthier pick in this food category for your profile."
    return "Better fit in this food category for your profile."


def _pick_search_tag(tags: list[str] | None) -> str | None:
    if not tags:
        return None
    en = [t for t in tags if isinstance(t, str) and t.startswith("en:")]
    if not en:
        return None
    return en[-1]


def _local_candidates(db: Session, target: Product) -> list[Product]:
    tags = target.categories_tags or []
    if tags:
        narrow = _pick_search_tag(tags)
        if narrow:
            rows = db.scalars(
                select(Product)
                .where(Product.id != target.id)
                .where(Product.categories_tags.contains([narrow]))
                .limit(50)
            ).all()
            if rows:
                return list(rows)
        rows = db.scalars(
            select(Product)
            .where(Product.id != target.id)
            .where(Product.categories_tags.op("?|")(array(list(tags))))
            .limit(50)
        ).all()
        if rows:
            return list(rows)
    if target.category and not is_weak_category_label(target.category):
        rows = db.scalars(
            select(Product)
            .where(Product.id != target.id)
            .where(Product.category == target.category)
            .limit(50)
        ).all()
        return list(rows)
    return []


def _product_skip_off_refetch(product: Product) -> bool:
    if filled_macro_field_count(product.nutriments) < _MIN_MACRO_FIELDS_TO_SKIP_REFETCH:
        return False
    tags = product.categories_tags or []
    return any(isinstance(t, str) and t.startswith("en:") for t in tags)


def _prefer_categories_tags(old: list | None, new: list | None) -> list | None:
    o = [t for t in (old or []) if isinstance(t, str)]
    n = [t for t in (new or []) if isinstance(t, str)]
    if len(n) > len(o):
        return n
    if len(n) < len(o):
        return old
    if n and set(n) - set(o):
        return n
    return old


def _upsert_product_from_normalized(
    db: Session,
    *,
    barcode: str,
    existing: Product | None,
    normalized: dict,
) -> Product:
    """Persist merge of ``normalized`` (from ``fetch_and_normalize``) into ``existing`` or insert."""
    incoming_tags = normalized.get("categories_tags")
    if not isinstance(incoming_tags, list):
        incoming_tags = None
    incoming_n = normalized.get("nutriments") or {}
    if not isinstance(incoming_n, dict):
        incoming_n = {}

    name = str(normalized.get("name") or "Unknown product")[:500]
    brand_raw = normalized.get("brand")
    brand = str(brand_raw)[:300] if brand_raw else None
    cat_raw = normalized.get("category")
    category = str(cat_raw)[:200] if cat_raw else None
    ingredients = normalized.get("ingredients_text")
    ingredients = str(ingredients)[:20000] if ingredients else None
    summary = normalized.get("simplified_summary")
    summary = str(summary)[:20000] if summary else None
    image_url = normalized.get("image_url")
    image_url = str(image_url).strip() if isinstance(image_url, str) and image_url.strip() else None
    limited = bool(normalized.get("limited_data", False))
    source = str(normalized.get("source") or "openfoodfacts")[:50]
    at_in = normalized.get("allergens_tags")
    allergen_tags_in: list | None = at_in if isinstance(at_in, list) and at_in else None
    tr_in = normalized.get("traces_tags")
    traces_in: list | None = tr_in if isinstance(tr_in, list) and tr_in else None
    ast_in = normalized.get("allergen_statement")
    allergen_st_in = str(ast_in)[:10000] if isinstance(ast_in, str) and ast_in.strip() else None

    if existing is not None:
        old_n = existing.nutriments or {}
        incoming_richer = filled_macro_field_count(incoming_n) > filled_macro_field_count(old_n)
        merged_n = merge_nutriments_for_richness(old_n, incoming_n, incoming_is_richer=incoming_richer)
        tags = _prefer_categories_tags(existing.categories_tags, incoming_tags)
        existing.name = name
        if brand:
            existing.brand = brand
        if category:
            existing.category = category
        if ingredients:
            existing.ingredients_text = ingredients
        if summary:
            existing.simplified_summary = summary
        if image_url:
            existing.image_url = image_url
        if tags is not None:
            existing.categories_tags = tags
        if allergen_st_in and not existing.allergen_statement:
            existing.allergen_statement = allergen_st_in
        if allergen_tags_in and (not existing.allergens_tags or len(allergen_tags_in) > len(existing.allergens_tags or [])):
            existing.allergens_tags = allergen_tags_in
        if traces_in and (not existing.traces_tags or len(traces_in) > len(existing.traces_tags or [])):
            existing.traces_tags = traces_in
        existing.nutriments = merged_n
        existing.limited_data = limited
        existing.source = source
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    product = Product(
        barcode=barcode,
        name=name,
        brand=brand,
        category=category,
        ingredients_text=ingredients,
        nutriments=incoming_n,
        simplified_summary=summary,
        image_url=image_url,
        categories_tags=incoming_tags,
        allergen_statement=allergen_st_in,
        allergens_tags=allergen_tags_in,
        traces_tags=traces_in,
        limited_data=limited,
        source=source,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _ingest_thin_search_row(db: Session, payload: dict) -> Product | None:
    """Fallback when ``fetch_and_normalize`` returns nothing (e.g. stale search index)."""
    barcode = str(payload.get("barcode") or "").strip()
    if not barcode:
        return None
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None:
        return existing
    name = payload.get("name")
    if not name:
        return None
    product = Product(
        barcode=barcode,
        name=str(name)[:500],
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
        source=str(payload.get("source", "openfoodfacts"))[:50],
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _ingest_off_payload(
    db: Session,
    payload: dict,
    *,
    fetch_budget: list[int],
) -> Product | None:
    """Ingest one OFF search hit; respects ``fetch_budget[0]`` full remote fetches remaining."""
    barcode = str(payload.get("barcode") or "").strip()
    if not barcode:
        return None
    existing = db.scalar(select(Product).where(Product.barcode == barcode))
    if existing is not None and _product_skip_off_refetch(existing):
        return existing
    if fetch_budget[0] <= 0:
        if existing is not None:
            return existing
        return _ingest_thin_search_row(db, payload)
    fetch_budget[0] -= 1
    normalized = fetch_and_normalize(barcode)
    if not normalized:
        if existing is not None:
            return existing
        return _ingest_thin_search_row(db, payload)
    return _upsert_product_from_normalized(db, barcode=barcode, existing=existing, normalized=normalized)


def _augment_candidates_from_off_name_search(
    db: Session,
    target: Product,
    candidates: list[Product],
    fetch_budget: list[int],
    peer_note_bits: list[str],
) -> None:
    """Add OFF products found by text search on this item's name (and brand).

    Runs whenever the target has a name, not only when the local pool is small, so
    alternatives can surface similar branded or generic matches even with a full DB.
    """
    if not (target.name or "").strip():
        return

    exclude = {target.barcode, *(c.barcode for c in candidates)}
    name_payloads = fetch_open_food_facts_by_name(
        target.name,
        brand=target.brand,
        page_size=MAX_OFF_FETCH,
        exclude_barcodes=exclude,
    )
    if not name_payloads:
        return

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
            p = _ingest_off_payload(db, payload, fetch_budget=fetch_budget)
            if p is not None and p.id != target.id:
                candidates.append(p)

    for payload in name_payloads:
        p = _ingest_off_payload(db, payload, fetch_budget=fetch_budget)
        if p is not None and p.id != target.id:
            candidates.append(p)

    peer_note_bits.append(
        "Included Open Food Facts results matched by this product's name (and brand when known)."
    )


def _usda_branded_alternative_pool(
    db: Session,
    target: Product,
    *,
    max_items: int = 24,
) -> tuple[list[Product], list[Product], list[str]]:
    """Fast path: USDA branded search + batched food details; no Open Food Facts."""
    notes = [
        "US Branded foods from USDA FoodData Central (name search + Nutrition Facts).",
    ]
    q = usda_search_query_from_product_name(target.name, target.brand)
    if not q:
        return [], [], notes + ["Add a product name to find USDA alternatives."]

    hits = search_usda_branded(q, page_size=min(max_items + 6, 50))
    if not hits:
        return [], [], notes + ["No USDA branded matches for this search."]

    target_bc = (target.barcode or "").strip()
    ordered: list[tuple[int, str]] = []
    seen_gtin: set[str] = set()
    for h in hits:
        raw_gtin = str(h.get("gtinUpc") or "").strip()
        gtin = "".join(c for c in raw_gtin if c.isdigit())
        if len(gtin) < 8:
            continue
        if target_bc and usda_gtin_matches_scan(target_bc, raw_gtin):
            continue
        if gtin in seen_gtin:
            continue
        fid = h.get("fdcId")
        if fid is None:
            continue
        try:
            fid_i = int(fid)
        except (TypeError, ValueError):
            continue
        seen_gtin.add(gtin)
        ordered.append((fid_i, gtin))
        if len(ordered) >= max_items:
            break

    if not ordered:
        return [], [], notes + ["USDA results had no usable UPC/GTIN codes to compare."]

    by_fdc: dict[int, dict] = {}
    for food in fetch_usda_foods_by_fdc_ids([x[0] for x in ordered]):
        raw_id = food.get("fdcId")
        if raw_id is not None:
            try:
                by_fdc[int(raw_id)] = food
            except (TypeError, ValueError):
                pass

    pooled: list[Product] = []
    for fid_i, gtin in ordered:
        food = by_fdc.get(fid_i)
        if not food:
            continue
        norm = normalize_from_usda(food)
        existing = db.scalar(select(Product).where(Product.barcode == gtin))
        p = _upsert_product_from_normalized(db, barcode=gtin, existing=existing, normalized=norm)
        if p.id == target.id:
            continue
        pooled.append(p)

    filtered = list(pooled)
    return pooled, filtered, notes


def _fallback_best_in_peer_category(
    profile: HealthProfile,
    target: Product,
    target_score: int,
    target_result: ScoreResult,
    candidates: list[Product],
    limit: int,
    *,
    min_score_delta: int = 0,
    relax_macro_guards: bool = False,
    use_absolute_score_floor: bool = False,
    absolute_score_floor: int = 12,
) -> list[AlternativeItem]:
    """When strict 'beat target' picks are empty, surface same-peer products (score floor configurable).

    ``use_absolute_score_floor``: ignore target score and keep any non-avoid product with
    score >= ``absolute_score_floor`` so users still see same-category options to compare.
    """
    if use_absolute_score_floor:
        floor = absolute_score_floor
    else:
        floor = target_score + min_score_delta
    scored: list[tuple[Product, ScoreResult]] = []
    seen: set[str] = {target.barcode.strip()}
    sugar_warn = any("sugar" in w.lower() for w in target_result.warnings)
    sat_warn = any("saturated fat" in w.lower() for w in target_result.warnings)
    t_sug = sugars_100g(target) if sugar_warn and not relax_macro_guards else None
    t_sat = saturated_fat_100g(target) if sat_warn and not relax_macro_guards else None

    for c in candidates:
        b = (c.barcode or "").strip()
        if not b or b in seen:
            continue
        seen.add(b)
        r = evaluate(profile, c)
        if r.avoid:
            continue
        if r.score < floor:
            continue
        if t_sug is not None:
            cs = sugars_100g(c)
            if cs is not None and cs > t_sug + 12.0:
                continue
        if t_sat is not None:
            cf = saturated_fat_100g(c)
            if cf is not None and cf > t_sat + 5.0:
                continue
        scored.append((c, r))

    if not scored:
        return []

    scored.sort(key=lambda pair: pair[1].score, reverse=True)
    top = _diversify_by_brand(scored, limit, max_per_brand=1)
    items: list[AlternativeItem] = []
    for p, r in top:
        if r.score > target_score:
            sn = _suitability_note(target_score, r.score, r.warnings)
        elif r.score >= target_score:
            sn = (
                "Closest healthier match in this food category for your profile. "
                "Compare labels if the scores look close."
            )
        elif use_absolute_score_floor:
            sn = (
                "Same category on the shelf: higher-scoring picks for your profile than many neighbors, "
                "but none beat this product’s score. Compare the label to choose."
            )
        else:
            sn = (
                "Same kind of food on the shelf; score is a bit lower. "
                "Check the pack to see if it suits you better."
            )
        items.append(
            AlternativeItem(
                product=_product_out(p),
                rating=_rating_out(r),
                suitability_note=sn,
            )
        )
    return items


def _empty_alternatives_note(
    *,
    raw_count: int,
    peer_filtered_count: int,
    beat_target_n: int,
    after_sugar_n: int,
    after_sat_n: int,
    target_result: ScoreResult,
) -> str:
    if raw_count == 0:
        return "We don't have enough comparable products in the database yet."
    if peer_filtered_count == 0:
        return (
            "Nothing else in our database shares a specific enough food category with this "
            'product (we skip broad matches like "sweets" alone so suggestions stay on-topic).'
        )
    if beat_target_n == 0:
        return "Nothing in this matched category scored higher for your profile right now."
    sugar_warn = any("sugar" in w.lower() for w in target_result.warnings)
    sat_warn = any("saturated fat" in w.lower() for w in target_result.warnings)
    if after_sugar_n < beat_target_n and sugar_warn:
        return (
            f"No suggestion scored higher while improving sugar (≥{SUGAR_IMPROVEMENT_G:.0f} g/100 g less, "
            "or same/less sugar with a clearly better score)."
        )
    if after_sat_n < after_sugar_n and sat_warn:
        return (
            "No suggestion both scored higher and had meaningfully less saturated fat per 100 g "
            "than this product."
        )
    return "No healthier same-category options passed the nutrition checks for this product."


@router.get("/alternatives/{product_id}", response_model=AlternativesResponse)
def get_alternatives(
    product_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    limit: int = Query(default=5, ge=1, le=15),
    user_id: UUID | None = Query(default=None, description="Optional; must match Bearer user when set."),
) -> AlternativesResponse:
    assert_user_id_matches_client(
        user,
        user_id,
        detail="user_id does not match authenticated user",
    )
    target = db.get(Product, product_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Product not found")

    profile = db.scalar(select(HealthProfile).where(HealthProfile.user_id == user.id))
    if profile is None:
        raise HTTPException(
            status_code=409,
            detail="Health profile is required. PUT /profile first.",
        )

    target_result = evaluate(profile, target)
    if target_result.avoid:
        return AlternativesResponse(
            items=[],
            note="This product is not a fit for your profile (e.g. allergen), so we are not suggesting similar items here.",
        )

    target_score = target_result.score

    peer_note_bits: list[str] = []
    if settings.usda_only_mode:
        pooled, candidates, peer_note_bits = _usda_branded_alternative_pool(db, target)
        peer_filtered_count = len(candidates)
        raw_count = len(pooled)
    else:
        candidates = _local_candidates(db, target)
        fetch_budget = [MAX_ALTERNATIVES_FULL_FETCHES]

        if len(candidates) < MIN_LOCAL_CANDIDATES:
            tag = _pick_search_tag(target.categories_tags)
            if tag:
                exclude = {target.barcode, *(c.barcode for c in candidates)}
                payloads = fetch_open_food_facts_by_category(
                    tag, page_size=MAX_OFF_FETCH, exclude_barcodes=exclude
                )
                for payload in payloads:
                    p = _ingest_off_payload(db, payload, fetch_budget=fetch_budget)
                    if p is not None and p.id != target.id:
                        candidates.append(p)

        _augment_candidates_from_off_name_search(db, target, candidates, fetch_budget, peer_note_bits)

        pooled: list[Product] = candidates

        filtered = filter_peer_candidates(target, pooled)
        narrow_tag = _pick_search_tag(target.categories_tags)
        parent_tag = pick_parent_category_tag(target.categories_tags)
        if not filtered and parent_tag and parent_tag != narrow_tag:
            exclude = {target.barcode, *(p.barcode for p in pooled)}
            for payload in fetch_open_food_facts_by_category(
                parent_tag, page_size=min(30, MAX_OFF_FETCH), exclude_barcodes=exclude
            ):
                p = _ingest_off_payload(db, payload, fetch_budget=fetch_budget)
                if p is not None and p.id != target.id:
                    pooled.append(p)
            pooled = dedupe_products_by_barcode(pooled)
            filtered = filter_peer_candidates(target, pooled)
            peer_note_bits.append(
                "Also searched the parent Open Food Facts category to find same-aisle neighbors."
            )

        if not filtered:
            filtered = filter_peer_last_resort_same_aisle(target, pooled)
            if filtered:
                peer_note_bits.append(
                    "Used product category or shared food tags when fine-grained taxonomy peers were missing."
                )

        if not filtered and pooled:
            filtered = filter_peer_loose_shared_en(target, pooled)
            if filtered:
                peer_note_bits.append(
                    "Included products that share any Open Food Facts category tag with this item."
                )

        peer_filtered_count = len(filtered)
        candidates = filtered
        raw_count = len(pooled)

    if not candidates:
        prefix = " ".join(peer_note_bits).strip()
        empty_note = _empty_alternatives_note(
            raw_count=raw_count,
            peer_filtered_count=peer_filtered_count,
            beat_target_n=0,
            after_sugar_n=0,
            after_sat_n=0,
            target_result=target_result,
        )
        return AlternativesResponse(
            items=[],
            note=f"{prefix} {empty_note}".strip() if prefix else empty_note,
        )

    scored: list[tuple[Product, ScoreResult]] = []
    seen_barcodes: set[str] = {target.barcode.strip()}
    for c in candidates:
        b = (c.barcode or "").strip()
        if not b or b in seen_barcodes:
            continue
        seen_barcodes.add(b)
        r = evaluate(profile, c)
        if r.avoid:
            continue
        if r.score <= target_score:
            continue
        scored.append((c, r))

    beat_target_n = len(scored)
    scored = filter_sugar_better_peers(
        target, target_result, scored, target_score=target_score
    )
    after_sugar_n = len(scored)
    scored = filter_sat_fat_better_peers(
        target, target_result, scored, target_score=target_score
    )
    after_sat_n = len(scored)

    scored.sort(key=lambda pair: pair[1].score, reverse=True)
    top = _diversify_by_brand(scored, limit, max_per_brand=1)

    items = [
        AlternativeItem(
            product=_product_out(p),
            rating=_rating_out(r),
            suitability_note=_suitability_note(target_score, r.score, r.warnings),
        )
        for p, r in top
    ]
    note_prefix = " ".join(peer_note_bits).strip()
    note: str | None = None
    if items and note_prefix:
        note = note_prefix
    elif not items and candidates:
        fb = _fallback_best_in_peer_category(
            profile, target, target_score, target_result, candidates, limit
        )
        if fb:
            items = fb
            body = (
                "Nothing clearly healthier passed the nutrition checks. "
                "These are the strongest options in the same food category."
            )
            note = f"{note_prefix} {body}".strip() if note_prefix else body
        else:
            loose = _fallback_best_in_peer_category(
                profile,
                target,
                target_score,
                target_result,
                candidates,
                limit,
                min_score_delta=-10,
            )
            if loose:
                items = loose
                body = (
                    "Still nothing clearly healthier. Here are same-category options within "
                    "about 10 points so you can compare on the pack."
                )
                note = f"{note_prefix} {body}".strip() if note_prefix else body
            else:
                ranked = _fallback_best_in_peer_category(
                    profile,
                    target,
                    target_score,
                    target_result,
                    candidates,
                    limit,
                    use_absolute_score_floor=True,
                    absolute_score_floor=12,
                    relax_macro_guards=True,
                )
                if ranked:
                    items = ranked
                    body = (
                        "Here are the best-scoring options we found in the same food category. "
                        "Your product may already be a strong match for your profile."
                    )
                    note = f"{note_prefix} {body}".strip() if note_prefix else body
                else:
                    empty_note = _empty_alternatives_note(
                        raw_count=raw_count,
                        peer_filtered_count=peer_filtered_count,
                        beat_target_n=beat_target_n,
                        after_sugar_n=after_sugar_n,
                        after_sat_n=after_sat_n,
                        target_result=target_result,
                    )
                    note = f"{note_prefix} {empty_note}".strip() if note_prefix else empty_note
    elif note_prefix:
        note = note_prefix
    return AlternativesResponse(items=items, note=note)