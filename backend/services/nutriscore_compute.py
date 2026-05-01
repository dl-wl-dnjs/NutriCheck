"""Nutri-Score–style computation aligned with EU 2017 Santé publique / HAL supplement tables.

Implements category-specific rules where they materially change the score:
general solids, beverages (including plain water), cheeses, added fats (oils/margarines),
and red/processed meat protein caps. Reference: Sarda et al. supplementary
\"Computation of the Nutri-Score\".

Energy uses kJ/100 g (kcal × 4.184). Sodium uses mg/100 g (OFF ``sodium_100g`` is g/100 g).
"""

from __future__ import annotations

from typing import Any, Literal

FoodKind = Literal["general", "beverage", "water", "cheese", "added_fat"]

# --- Negative breakpoints (cumulative points: count thresholds strictly exceeded) ---

# General solid & cheese & added-fat energy
_ENERGY_KJ_BP_SOLID = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]
# Beverages (kJ/100 ml or g)
_ENERGY_KJ_BP_BEVERAGE = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270]

_SAT_FAT_G_BP = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
_SUGARS_G_BP_SOLID = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]
# Beverages (sugars g/100 ml)
_SUGARS_G_BP_BEVERAGE = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]

_SODIUM_MG_BP = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]

# Added fats: SFA / total fat ratio (%)
_SFA_RATIO_PCT_BP = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]

# Positive (fibre, protein, FVL %)
_FIBRE_G_BP = [0.9, 1.9, 2.8, 3.7, 4.7]
_PROTEIN_G_BP = [1.6, 3.2, 4.8, 6.4, 8.0]
_FVL_PCT_BP = [40, 60, 80, 90, 100]

_GRADE_TO_SCORE = {"a": 90, "b": 75, "c": 60, "d": 45, "e": 25}

# Ingredient tokens that suggest meaningful F/V/L when OFF estimate is missing (conservative).
_FVL_INGREDIENT_HINTS = frozenset(
    (
        "apple",
        "apricot",
        "banana",
        "beet",
        "blueberry",
        "broccoli",
        "carrot",
        "cauliflower",
        "cherry",
        "coconut",
        "cranberry",
        "cucumber",
        "date",
        "eggplant",
        "fig",
        "garlic",
        "grape",
        "green bean",
        "kale",
        "leek",
        "lemon",
        "lentil",
        "lettuce",
        "lime",
        "mango",
        "melon",
        "mushroom",
        "oat",
        "onion",
        "orange",
        "pea",
        "peach",
        "pear",
        "pepper",
        "pineapple",
        "plum",
        "pomegranate",
        "potato",
        "pumpkin",
        "raisin",
        "raspberry",
        "spinach",
        "strawberry",
        "sweet potato",
        "tomato",
        "walnut",
        "almond",
        "cashew",
        "hazelnut",
        "pecan",
        "pistachio",
        "sunflower seed",
        "flax",
        "chia",
        "quinoa",
        "bean",
        "chickpea",
        "black bean",
        "kidney bean",
    )
)


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _nutrient(nutriments: dict[str, Any] | None, *keys: str) -> float | None:
    if not nutriments:
        return None
    for k in keys:
        v = _to_float(nutriments.get(k))
        if v is not None:
            return v
    return None


def _tier_points(value: float, breakpoints: list[float]) -> int:
    return sum(1 for t in breakpoints if value > t)


def resolve_food_kind(categories_tags: list[str] | None) -> FoodKind:
    if not categories_tags:
        return "general"
    low = [str(t).lower() for t in categories_tags]
    blob = " ".join(low)
    if any(
        x in blob
        for x in (
            ":waters",
            "en:waters",
            "spring-waters",
            "mineral-waters",
            "drinking-water",
            "carbonated-waters",
        )
    ):
        return "water"
    if "beverages" in blob or ":beverages" in blob:
        return "beverage"
    if any(t.endswith(":cheeses") for t in low):
        return "cheese"
    if any(
        x in blob
        for x in (
            "en:fats",
            ":oils",
            "vegetable-oils",
            "olive-oils",
            "margarines",
            "oils-and-fats",
            "plant-based-foods-fats",
            "fish-oils",
            "colza-oils",
            "sunflower-oils",
        )
    ):
        return "added_fat"
    return "general"


def is_red_meat_or_processed_meat(categories_tags: list[str] | None) -> bool:
    """True for OFF tags that indicate red or processed meat (protein points capped when A<11)."""
    if not categories_tags:
        return False
    blob = " ".join(str(t).lower() for t in categories_tags)
    needles = (
        "en:meats",
        "processed-meats",
        "en:ham",
        "en:hams",
        "en:sausages",
        "en:bacon",
        "en:bacons",
        "en:red-meats",
        "en:charcuteries",
        "en:pates",
        "en:liver-pates",
    )
    return any(n in blob for n in needles)


def _energy_kj_per_100g(nutriments: dict[str, Any]) -> float | None:
    kj = _nutrient(nutriments, "energy-kj_100g", "energy_kj_100g")
    if kj is not None and kj >= 0:
        return float(kj)
    kcal = _nutrient(nutriments, "energy-kcal_100g", "energy_kcal_100g")
    if kcal is not None and kcal >= 0:
        return float(kcal * 4.184)
    generic = _nutrient(nutriments, "energy_100g")
    if generic is not None and generic >= 0:
        if generic > 4000:
            return float(generic)
        return float(generic * 4.184)
    return None


def _sodium_mg_per_100g(nutriments: dict[str, Any]) -> float | None:
    na_g = _nutrient(nutriments, "sodium_100g")
    if na_g is not None and na_g >= 0:
        return float(na_g * 1000.0)
    salt_g = _nutrient(nutriments, "salt_100g")
    if salt_g is not None and salt_g >= 0:
        return float((salt_g / 2.5) * 1000.0)
    return None


def _saturated_fat_g(nutriments: dict[str, Any]) -> float | None:
    v = _nutrient(nutriments, "saturated-fat_100g", "saturated_fat_100g")
    return float(v) if v is not None else None


def _total_fat_g(nutriments: dict[str, Any]) -> float | None:
    v = _nutrient(nutriments, "fat_100g", "fats_100g")
    return float(v) if v is not None and v > 0 else None


def _sugars_g(nutriments: dict[str, Any]) -> float | None:
    s = _nutrient(nutriments, "sugars_100g")
    if s is not None:
        return float(s)
    s = _nutrient(nutriments, "added-sugars_100g", "added_sugars_100g")
    return float(s) if s is not None else None


def _fvl_percent(nutriments: dict[str, Any]) -> float | None:
    return _nutrient(
        nutriments,
        "fruits-vegetables-nuts-estimate-from-ingredients_100g",
        "fruits-vegetables-legumes-estimate-from-ingredients_100g",
        "fruits_vegetables_nuts_100g",
    )


def _fvl_from_ingredients(ingredients_text: str | None) -> float | None:
    if not ingredients_text:
        return None
    t = ingredients_text.lower()
    hits = sum(1 for h in _FVL_INGREDIENT_HINTS if h in t)
    if hits == 0:
        return None
    return min(40.0 + hits * 6.0, 80.0)


def _effective_fvl(
    nutriments: dict[str, Any],
    *,
    ingredients_text: str | None,
    override: float | None,
) -> float:
    if override is not None:
        return float(override)
    v = _fvl_percent(nutriments)
    if v is not None:
        return float(v)
    est = _fvl_from_ingredients(ingredients_text)
    return float(est) if est is not None else 0.0


def fns_to_grade_solid(fns: int) -> str:
    if fns <= -1:
        return "a"
    if fns <= 2:
        return "b"
    if fns <= 10:
        return "c"
    if fns <= 18:
        return "d"
    return "e"


def fns_to_grade_beverage(fns: int) -> str:
    """HAL table: A FNS<=-1; B FNS<=1; C 2-5; D 6-9; E>=19; bridge 10-18 as D."""
    if fns <= -1:
        return "a"
    if fns <= 1:
        return "b"
    if fns <= 5:
        return "c"
    if fns <= 18:
        return "d"
    return "e"


def effective_food_kind(
    nutriments: dict[str, Any] | None,
    categories_tags: list[str] | None,
) -> FoodKind:
    k = resolve_food_kind(categories_tags)
    if k == "added_fat" and (not nutriments or _total_fat_g(nutriments) is None):
        return "general"
    return k


def can_run(
    nutriments: dict[str, Any] | None,
    *,
    categories_tags: list[str] | None = None,
) -> bool:
    kind = effective_food_kind(nutriments or {}, categories_tags)
    if kind == "water":
        return True
    n = nutriments or {}
    if _energy_kj_per_100g(n) is None:
        return False
    if _sugars_g(n) is None:
        return False
    if _saturated_fat_g(n) is None:
        return False
    if _sodium_mg_per_100g(n) is None:
        return False
    if kind == "added_fat" and _total_fat_g(n) is None:
        return False
    return True


def _water_score(
    nutriments: dict[str, Any],
    *,
    ingredients_text: str | None,
    categories_tags: list[str] | None,
) -> tuple[int, str, dict[str, Any]]:
    """Plain water: negligible energy/sugar; EU class A."""
    kj = _energy_kj_per_100g(nutriments) or 0.0
    sug = _sugars_g(nutriments)
    if sug is None:
        sug = 0.0
    bd: dict[str, Any] = {
        "food_kind": "water",
        "A_points": 0,
        "C_points": 0,
        "FNS": -2,
        "negative": {"energy_kj": kj, "sugars_g": sug},
        "positive": {},
        "grade": "a",
    }
    if sug > 1.0 or kj > 80:
        fns, full = compute_fns_and_breakdown(
            nutriments,
            food_kind="beverage",
            categories_tags=categories_tags,
            fvl_percent=None,
            ingredients_text=ingredients_text,
        )
        grade = fns_to_grade_beverage(fns)
        full["food_kind"] = "beverage"
        full["grade"] = grade
        full["FNS"] = fns
        return _GRADE_TO_SCORE[grade], grade, full
    return 90, "a", bd


def compute_fns_and_breakdown(
    nutriments: dict[str, Any],
    *,
    food_kind: FoodKind,
    categories_tags: list[str] | None = None,
    fvl_percent: float | None = None,
    ingredients_text: str | None = None,
) -> tuple[int, dict[str, Any]]:
    energy_kj = _energy_kj_per_100g(nutriments)
    assert energy_kj is not None
    sugars = _sugars_g(nutriments)
    assert sugars is not None
    sat_f = _saturated_fat_g(nutriments)
    assert sat_f is not None
    sodium_mg = _sodium_mg_per_100g(nutriments)
    assert sodium_mg is not None

    neg_detail: dict[str, Any] = {
        "energy_kj": energy_kj,
        "sugars_g": sugars,
        "sodium_mg": sodium_mg,
    }

    if food_kind in ("beverage", "water"):
        pe = _tier_points(energy_kj, _ENERGY_KJ_BP_BEVERAGE)
        ps = _tier_points(sugars, _SUGARS_G_BP_BEVERAGE)
    else:
        pe = _tier_points(energy_kj, _ENERGY_KJ_BP_SOLID)
        ps = _tier_points(sugars, _SUGARS_G_BP_SOLID)

    if food_kind == "added_fat":
        total_fat = _total_fat_g(nutriments)
        assert total_fat is not None
        ratio = (sat_f / total_fat) * 100.0 if total_fat > 0 else 0.0
        pr = _tier_points(ratio, _SFA_RATIO_PCT_BP)
        pf = 0
        neg_detail["sfa_total_fat_ratio_pct"] = ratio
        neg_detail["points_sfa_ratio"] = pr
        neg_detail["points_saturated_fat"] = 0
    else:
        pr = 0
        pf = _tier_points(sat_f, _SAT_FAT_G_BP)
        neg_detail["saturated_fat_g"] = sat_f
        neg_detail["points_saturated_fat"] = pf
        neg_detail["points_sfa_ratio"] = 0

    pn = _tier_points(sodium_mg, _SODIUM_MG_BP)
    neg_detail["points_energy"] = pe
    neg_detail["points_sugars"] = ps
    neg_detail["points_sodium"] = pn

    a_pts = pe + ps + pf + pr + pn

    fiber = _nutrient(nutriments, "fiber_100g", "fibre_100g") or 0.0
    protein = _nutrient(nutriments, "proteins_100g", "protein_100g") or 0.0
    fvl = _effective_fvl(nutriments, ingredients_text=ingredients_text, override=fvl_percent)

    p_fiber = _tier_points(fiber, _FIBRE_G_BP)
    p_protein = _tier_points(protein, _PROTEIN_G_BP)
    p_fvl = _tier_points(fvl, _FVL_PCT_BP)
    c_pts = p_fiber + p_protein + p_fvl

    red = is_red_meat_or_processed_meat(categories_tags)

    if food_kind == "cheese":
        fns = a_pts - c_pts
    elif a_pts < 11:
        if red:
            p_p = min(p_protein, 2)
            fns = a_pts - p_fiber - p_p - p_fvl
        else:
            fns = a_pts - c_pts
    else:
        fns = a_pts - p_fiber - p_fvl

    breakdown: dict[str, Any] = {
        "food_kind": food_kind,
        "A_points": a_pts,
        "C_points": c_pts,
        "FNS": fns,
        "negative": neg_detail,
        "positive": {
            "fiber_g": fiber,
            "points_fiber": p_fiber,
            "protein_g": protein,
            "points_protein": p_protein,
            "fvl_percent": fvl,
            "points_fvl": p_fvl,
        },
    }
    return fns, breakdown


def score_0_100(
    nutriments: dict[str, Any],
    *,
    fvl_percent: float | None = None,
    categories_tags: list[str] | None = None,
    ingredients_text: str | None = None,
) -> tuple[int, str, dict[str, Any]]:
    if not can_run(nutriments, categories_tags=categories_tags):
        raise ValueError("nutriments not sufficient for computed Nutri-Score")

    kind = effective_food_kind(nutriments or {}, categories_tags)
    if kind == "water":
        n = dict(nutriments or {})
        if _energy_kj_per_100g(n) is None:
            n["energy-kcal_100g"] = 0.0
        if _sugars_g(n) is None:
            n["sugars_100g"] = 0.0
        if _saturated_fat_g(n) is None:
            n["saturated-fat_100g"] = 0.0
        if _sodium_mg_per_100g(n) is None:
            n["sodium_100g"] = 0.0
        return _water_score(n, ingredients_text=ingredients_text, categories_tags=categories_tags)

    food_kind: FoodKind = "beverage" if kind == "beverage" else kind
    fns, breakdown = compute_fns_and_breakdown(
        nutriments,
        food_kind=food_kind,
        categories_tags=categories_tags,
        fvl_percent=fvl_percent,
        ingredients_text=ingredients_text,
    )
    if food_kind == "beverage":
        grade = fns_to_grade_beverage(fns)
    else:
        grade = fns_to_grade_solid(fns)
    breakdown["grade"] = grade
    breakdown["FNS"] = fns
    return _GRADE_TO_SCORE[grade], grade, breakdown


# Backward-compatible name for solid-food grade mapping (tests, callers).
fns_to_grade = fns_to_grade_solid
