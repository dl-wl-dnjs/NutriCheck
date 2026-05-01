"""Strict peer selection for GET /alternatives: avoids broad OFF tag overlap
(en:sweets, en:snacks, etc.) that mixed unrelated products. Shared post-score
filters for sugar and saturated fat when the target flagged those nutrients.
"""

from __future__ import annotations

from backend.models.product import Product
from backend.services import nutriscore_compute
from backend.services.scoring import ScoreResult

# Tags that are too high in the OFF hierarchy to define a "peer" on their own.
TAGS_TOO_BROAD: frozenset[str] = frozenset(
    {
        "en:snacks",
        "en:sweet-snacks",
        "en:sweets",
        "en:confectioneries",
        "en:candies",
        "en:desserts",
        "en:plant-based-foods-and-beverages",
        "en:beverages",
        "en:foods",
        "en:groceries",
        "en:dairies",
        "en:spreads",
        "en:breakfasts",
        "en:canned-foods",
        "en:frozen-foods",
        "en:snacks-and-sweets",
        "en:drinks",
        "en:beverages-and-beverages-preparations",
        "en:unsweetened-beverages",
        "en:sweetened-beverages",
        "en:plant-based-beverages",
        "en:alcoholic-beverages",
        "en:non-alcoholic-beverages",
    }
)

# First segment of OFF ``category`` string that is too vague for same-aisle matching.
WEAK_CATEGORY_FIRST_SEGMENTS: frozenset[str] = frozenset(
    {
        "beverages",
        "snacks",
        "foods",
        "groceries",
        "dairies",
        "spreads",
        "frozen foods",
        "canned foods",
    }
)

SUGAR_IMPROVEMENT_G = 3.0
SAT_FAT_IMPROVEMENT_G = 1.5
# When sugar is not materially lower, still allow if score beats target by this much at same/lower sugar.
SUGAR_SCORE_TRADE_MIN = 7
SAT_FAT_SCORE_TRADE_MIN = 7


def en_tags(tags: list | None) -> list[str]:
    if not tags:
        return []
    return [t for t in tags if isinstance(t, str) and t.startswith("en:")]


def is_weak_category_label(category: str | None) -> bool:
    """True when OFF ``Product.category`` is only a vague first-segment bucket."""
    if not category or not str(category).strip():
        return True
    first = str(category).split(",")[0].strip().lower()
    return first in WEAK_CATEGORY_FIRST_SEGMENTS


def meaningful_tag_overlap(target: Product, candidate: Product) -> frozenset[str]:
    t = set(en_tags(target.categories_tags))
    c = set(en_tags(candidate.categories_tags))
    return frozenset((t & c) - TAGS_TOO_BROAD)


def _most_specific_meaningful_tag(tags: list | None) -> str | None:
    for t in reversed(en_tags(tags)):
        if t not in TAGS_TOO_BROAD:
            return t
    return None


def peer_match_strict(target: Product, candidate: Product) -> bool:
    if meaningful_tag_overlap(target, candidate):
        return True
    narrow = _most_specific_meaningful_tag(target.categories_tags)
    if narrow and narrow in set(en_tags(candidate.categories_tags)):
        return True
    return False


def peer_match_relaxed(target: Product, candidate: Product) -> bool:
    """Target and candidate share at least one non-broad tag among the target's last few ``en:`` tags."""
    te = en_tags(target.categories_tags)
    ce = set(en_tags(candidate.categories_tags))
    if not te:
        return False
    suffix = te[-min(6, len(te)) :]
    overlap = set(suffix) & ce
    return bool(overlap - TAGS_TOO_BROAD)


def peer_match_any_target_specific_tag(target: Product, candidate: Product) -> bool:
    """Any non-broad ``en:`` tag on the target appears on the candidate (not only the last N tags)."""
    ce = set(en_tags(candidate.categories_tags))
    for t in en_tags(target.categories_tags):
        if t not in TAGS_TOO_BROAD and t in ce:
            return True
    return False


def proteins_100g(product: Product) -> float | None:
    n = product.nutriments or {}
    for key in ("proteins_100g", "protein_100g"):
        raw = n.get(key)
        if raw is None:
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            continue
    return None


def _is_drink_taxonomy(tags: list | None) -> bool:
    k = nutriscore_compute.resolve_food_kind(tags)
    return k in ("beverage", "water")


def _beverage_subcluster(tags: list | None) -> str | None:
    """Narrow drink subtype for peer compatibility (None if not a beverage or unknown)."""
    if not tags:
        return None
    k = nutriscore_compute.resolve_food_kind(tags)
    if k == "water":
        return "water"
    if k != "beverage":
        return None
    blob = " ".join(str(t).lower() for t in tags)
    if any(
        x in blob
        for x in (
            "en:sodas",
            "en:colas",
            "carbonated-drinks",
            "soft-drinks",
            "en:carbonated",
            "en:lemonades",
        )
    ):
        return "soda"
    if any(x in blob for x in ("fruit-juices", "en:juices", "nectars", "en:fruit-juices")):
        return "juice"
    if any(x in blob for x in ("energy-drinks", "en:energy-drinks")):
        return "energy"
    if any(x in blob for x in ("sports-drinks", "en:sports-drinks", "isotonic")):
        return "sports"
    if any(
        x in blob
        for x in (
            "tea-based",
            "en:teas",
            "en:iced-teas",
            "coffee-drinks",
            "en:coffees",
            "en:plant-milks",
        )
    ):
        return "tea_coffee_plant_milk"
    if any(
        x in blob
        for x in (
            "milk-drinks",
            "dairy-drinks",
            "en:flavoured-milks",
            "chocolate-milks",
            "protein",
            "shake",
            "meal-replacements",
            "en:meal-replacement",
            "en:yogurt-drinks",
            "kefir",
            "smoothies",
            "en:smoothies",
        )
    ):
        return "dairy_protein"
    return "other_beverage"


def _candidate_is_soda_typed(candidate: Product) -> bool:
    return _beverage_subcluster(candidate.categories_tags) == "soda"


def beverage_peer_compatible(target: Product, candidate: Product) -> bool:
    """Block unlike drink peers (e.g. protein milk shake vs cola)."""
    t_tags, c_tags = target.categories_tags, candidate.categories_tags
    t_drink = _is_drink_taxonomy(t_tags)
    c_drink = _is_drink_taxonomy(c_tags)
    if not t_drink or not c_drink:
        return True

    tp = proteins_100g(target)
    cp = proteins_100g(candidate)
    if tp is not None and tp >= 6.0 and _candidate_is_soda_typed(candidate) and (cp is None or cp < 5.0):
        return False

    tc = _beverage_subcluster(t_tags)
    cc = _beverage_subcluster(c_tags)
    if tc is None or cc is None:
        return True
    if tc == cc:
        return True
    soda_side = tc == "soda" or cc == "soda"
    if tc == "other_beverage" or cc == "other_beverage":
        if soda_side and tp is not None and tp >= 5.0:
            return False
        return True
    return False


def dedupe_products_by_barcode(products: list[Product]) -> list[Product]:
    seen: set[str] = set()
    out: list[Product] = []
    for p in products:
        b = (p.barcode or "").strip()
        if not b or b in seen:
            continue
        seen.add(b)
        out.append(p)
    return out


def pick_parent_category_tag(tags: list | None) -> str | None:
    """Next-broader OFF ``en:`` tag (parent of the leaf), for a second category fetch."""
    chain = en_tags(tags)
    if len(chain) >= 2:
        return chain[-2]
    return None


def filter_peer_last_resort_same_aisle(target: Product, candidates: list[Product]) -> list[Product]:
    """When strict taxonomy peers are empty: same free-text category, then shared OFF tags (capped)."""
    deduped = dedupe_products_by_barcode(candidates)
    tc = (target.category or "").strip().lower()
    if tc and not is_weak_category_label(target.category):
        same = [c for c in deduped if (c.category or "").strip().lower() == tc]
        if same:
            return [c for c in same[:50] if beverage_peer_compatible(target, c)]
    te = set(en_tags(target.categories_tags))
    if not te:
        return []
    two_hit: list[Product] = []
    one_hit: list[Product] = []
    for c in deduped:
        ce = set(en_tags(c.categories_tags))
        inter = te & ce
        meaningful = inter - TAGS_TOO_BROAD
        if len(meaningful) >= 2:
            two_hit.append(c)
        elif len(meaningful) == 1:
            one_hit.append(c)
    pool = two_hit if two_hit else one_hit
    out = [c for c in pool[:50] if beverage_peer_compatible(target, c)]
    return out


def filter_peer_loose_shared_en(target: Product, candidates: list[Product]) -> list[Product]:
    """Last-chance peers: any overlapping ``en:`` tag (may include broad) + beverage rules."""
    if not candidates:
        return []
    deduped = dedupe_products_by_barcode(candidates)
    te = set(en_tags(target.categories_tags))
    if not te:
        return []
    out: list[Product] = []
    for c in deduped:
        ce = set(en_tags(c.categories_tags))
        if te & ce and beverage_peer_compatible(target, c):
            out.append(c)
    return out


def filter_peer_candidates(target: Product, candidates: list[Product]) -> list[Product]:
    """Drop same-barcode dupes, then keep only taxonomy peers (strict → relaxed)."""
    if not candidates:
        return []
    deduped = dedupe_products_by_barcode(candidates)

    if not en_tags(target.categories_tags):
        tc = (target.category or "").strip().lower()
        if tc and not is_weak_category_label(target.category):
            same = [c for c in deduped if (c.category or "").strip().lower() == tc]
            return [c for c in same if beverage_peer_compatible(target, c)]
        return [c for c in deduped if beverage_peer_compatible(target, c)]

    strict = [c for c in deduped if peer_match_strict(target, c)]
    strict = [c for c in strict if beverage_peer_compatible(target, c)]
    if strict:
        return strict
    relaxed = [c for c in deduped if peer_match_relaxed(target, c)]
    relaxed = [c for c in relaxed if beverage_peer_compatible(target, c)]
    if relaxed:
        return relaxed
    fallback = [c for c in deduped if peer_match_any_target_specific_tag(target, c)]
    return [c for c in fallback if beverage_peer_compatible(target, c)]


def sugars_100g(product: Product) -> float | None:
    raw = (product.nutriments or {}).get("sugars_100g")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def saturated_fat_100g(product: Product) -> float | None:
    n = product.nutriments or {}
    for key in ("saturated-fat_100g", "saturated_fat_100g"):
        raw = n.get(key)
        if raw is None:
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            continue
    return None


def filter_sugar_better_peers(
    target: Product,
    target_result: ScoreResult,
    scored: list[tuple[Product, ScoreResult]],
    *,
    target_score: int,
) -> list[tuple[Product, ScoreResult]]:
    if not scored:
        return scored
    if not any("sugar" in w.lower() for w in target_result.warnings):
        return scored
    t_val = sugars_100g(target)
    if t_val is None:
        return scored
    out: list[tuple[Product, ScoreResult]] = []
    for p, r in scored:
        c_val = sugars_100g(p)
        if c_val is None:
            continue
        if c_val <= t_val - SUGAR_IMPROVEMENT_G:
            out.append((p, r))
            continue
        # Same or lower sugar if the personalized score is clearly better (common in candy aisles).
        if c_val <= t_val and r.score >= target_score + SUGAR_SCORE_TRADE_MIN:
            out.append((p, r))
    return out


def filter_sat_fat_better_peers(
    target: Product,
    target_result: ScoreResult,
    scored: list[tuple[Product, ScoreResult]],
    *,
    target_score: int,
) -> list[tuple[Product, ScoreResult]]:
    if not scored:
        return scored
    if not any("saturated fat" in w.lower() for w in target_result.warnings):
        return scored
    t_val = saturated_fat_100g(target)
    if t_val is None:
        return scored
    out: list[tuple[Product, ScoreResult]] = []
    for p, r in scored:
        c_val = saturated_fat_100g(p)
        if c_val is None:
            continue
        if c_val <= t_val - SAT_FAT_IMPROVEMENT_G:
            out.append((p, r))
            continue
        if c_val <= t_val and r.score >= target_score + SAT_FAT_SCORE_TRADE_MIN:
            out.append((p, r))
    return out
