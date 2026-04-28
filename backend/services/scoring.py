"""Personalized health-score algorithm for the new POST /scan endpoint.

Returns a 0-100 integer score, a tier (good/okay/bad), a list of human-readable
warnings (allergen matches and condition conflicts), and a short recommendation
string the UI can show under the ring.

This module is the canonical scorer used by the new endpoints. The legacy
``rating_service`` is kept temporarily for the old /api/scan/barcode route until
the frontend migration is complete and old routes are removed.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from backend.config import settings
from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.services import nutriscore_compute

# Allergen synonyms — a single user-selected allergen can match many ingredient
# strings. Keys are lowercased substrings of profile.allergens entries; values
# are extra ingredient-text substrings to scan for. Strings are matched as
# case-insensitive substrings against the ingredients_text and category fields.
ALLERGEN_SYNONYMS: dict[str, list[str]] = {
    "wheat": ["wheat", "gluten", "barley", "rye", "spelt", "semolina", "farro", "couscous"],
    "gluten": ["wheat", "gluten", "barley", "rye", "spelt", "semolina", "farro"],
    "dairy": ["milk", "lactose", "whey", "casein", "butter", "cheese", "cream", "yogurt"],
    "milk": ["milk", "lactose", "whey", "casein", "butter", "cheese", "cream", "yogurt"],
    "egg": ["egg", "albumin", "ovalbumin"],
    "peanut": ["peanut", "groundnut", "arachis"],
    "peanuts": ["peanut", "peanuts", "groundnut", "arachis"],
    "tree nut": ["almond", "cashew", "hazelnut", "pecan", "pistachio", "walnut", "macadamia", "brazil nut"],
    "tree nuts": ["almond", "cashew", "hazelnut", "pecan", "pistachio", "walnut", "macadamia", "brazil nut"],
    "soy": ["soy", "soya", "edamame", "tofu", "tempeh"],
    "shellfish": ["shrimp", "crab", "lobster", "prawn", "crayfish", "oyster", "mussel", "clam", "scallop"],
    "fish": ["salmon", "tuna", "cod", "tilapia", "anchovy", "sardine", "haddock", "mackerel"],
    "sesame": ["sesame", "tahini"],
}

GLUTEN_TOKENS = ["wheat", "gluten", "barley", "rye", "spelt", "semolina", "farro", "couscous"]


@dataclass(frozen=True)
class ScoreResult:
    score: int
    tier: str  # good | okay | bad
    label: str  # human-readable: Excellent / Good / Poor / AVOID
    avoid: bool
    avoid_reason: str | None
    warnings: list[str] = field(default_factory=list)
    recommendation: str | None = None
    limited_information: bool = False


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


def _has_token(haystack: str, needle: str) -> bool:
    needle = needle.strip().lower()
    if len(needle) < 3:
        return False
    return needle in haystack


def _allergen_search_text(product: Product) -> str:
    """Text blob for matching: ingredients, category, OFF allergen line, en: tags, traces."""
    parts: list[str] = []
    if product.ingredients_text:
        parts.append(str(product.ingredients_text))
    if product.category:
        parts.append(str(product.category))
    stmt = getattr(product, "allergen_statement", None)
    if stmt:
        parts.append(str(stmt))
    for key in ("allergens_tags", "traces_tags"):
        raw = getattr(product, key, None)
        if isinstance(raw, list) and raw:
            parts.append(" ".join(str(t) for t in raw))
    return " ".join(parts).lower()


def _allergen_matches(allergens: list[str], search_text: str) -> list[str]:
    """Return the list of user-selected allergens that appear in this product."""
    text = search_text.lower()
    matched: list[str] = []
    for raw in allergens:
        a = raw.strip().lower()
        if not a:
            continue
        if _has_token(text, a):
            matched.append(raw)
            continue
        for synonym_key, tokens in ALLERGEN_SYNONYMS.items():
            if synonym_key in a:
                if any(_has_token(text, tok) for tok in tokens):
                    matched.append(raw)
                    break
    seen: set[str] = set()
    deduped: list[str] = []
    for m in matched:
        if m.lower() in seen:
            continue
        seen.add(m.lower())
        deduped.append(m)
    return deduped


def _tier_for_score(score: int) -> str:
    if score >= 70:
        return "good"
    if score >= 40:
        return "okay"
    return "bad"


def _label_for_score(score: int) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"


def _nutriscore_to_base(nutriscore_grade: str | None) -> int | None:
    """Open Food Facts grades a-e -> 0-100 baseline."""
    if not nutriscore_grade:
        return None
    g = str(nutriscore_grade).strip().lower()
    return {"a": 90, "b": 75, "c": 60, "d": 45, "e": 25}.get(g)


def _macro_nutrient_count(nutriments: dict[str, Any]) -> int:
    """How many per-100g macro-style fields are present (rough completeness signal)."""
    keys = (
        "sodium_100g",
        "salt_100g",
        "sugars_100g",
        "saturated-fat_100g",
        "saturated_fat_100g",
        "proteins_100g",
        "protein_100g",
        "fiber_100g",
        "fibre_100g",
        "energy-kcal_100g",
        "energy_kcal_100g",
        "energy_100g",
        "energy-kj_100g",
        "fat_100g",
        "trans-fat_100g",
        "trans_fat_100g",
    )
    n = 0
    for k in keys:
        if _nutrient(nutriments, k) is not None:
            n += 1
    return n


def _apply_core_nutrient_penalties(
    score: int,
    *,
    sodium_g: float | None,
    sugars_g: float | None,
    sat_fat_g: float | None,
    trans_g: float | None,
    warnings: list[str],
    skip_nutriscore_negatives: bool = False,
) -> int:
    """Shared sodium / sugar / saturated / trans fat deductions (per 100 g).

    When ``skip_nutriscore_negatives`` is True, skip sodium / sugar / saturated fat
    (already reflected in a computed Nutri-Score base) but still penalize trans fat.
    """
    if not skip_nutriscore_negatives:
        if sodium_g is not None:
            if sodium_g > 1.5:
                score -= 25
                warnings.append("High sodium per 100 g.")
            elif sodium_g > 0.6:
                score -= 10
                warnings.append("Elevated sodium per 100 g.")
    if not skip_nutriscore_negatives and sugars_g is not None:
        if sugars_g > 22.5:
            score -= 20
            warnings.append("High sugar per 100 g.")
        elif sugars_g > 12:
            score -= 8
            warnings.append("Elevated sugar per 100 g.")
    if not skip_nutriscore_negatives and sat_fat_g is not None:
        if sat_fat_g > 5:
            score -= 15
            warnings.append("High saturated fat per 100 g.")
        elif sat_fat_g > 3:
            score -= 6
            warnings.append("Elevated saturated fat per 100 g.")
    if trans_g is not None and trans_g > 0.05:
        if trans_g > 0.5:
            score -= 14
            warnings.append("High trans fat per 100 g.")
        elif trans_g > 0.2:
            score -= 8
            warnings.append("Contains trans fat per 100 g.")
        else:
            score -= 4
            warnings.append("Trace trans fat per 100 g.")
    return score


def _score_without_nutriscore_label(
    *,
    sodium_g: float | None,
    sugars_g: float | None,
    sat_fat_g: float | None,
    protein_g: float | None,
    energy_kcal: float | None,
    fiber_g: float | None,
    trans_g: float | None,
    macro_fields: int,
) -> tuple[int, list[str], bool]:
    """Nutrition-facts–driven score when Open Food Facts has no Nutri-Score grade.

    Uses one combined pass (core nutrients + energy density + fiber/protein signals)
    so values are not double-counted against a flat baseline.
    """
    w: list[str] = []
    # Neutral-slightly-positive anchor; penalties and bonuses reflect label quality.
    score = 76
    score = _apply_core_nutrient_penalties(
        score,
        sodium_g=sodium_g,
        sugars_g=sugars_g,
        sat_fat_g=sat_fat_g,
        trans_g=trans_g,
        warnings=w,
    )

    if fiber_g is not None:
        if fiber_g >= 8:
            score += 8
        elif fiber_g >= 5:
            score += 5
        elif fiber_g >= 3:
            score += 2

    if protein_g is not None:
        if protein_g >= 20:
            score += 7
        elif protein_g >= 15:
            score += 5
        elif protein_g >= 10:
            score += 3
        elif protein_g >= 8:
            score += 2

    if energy_kcal is not None:
        if energy_kcal >= 500:
            score -= 12
            w.append("Very calorie-dense per 100 g.")
        elif energy_kcal >= 400:
            score -= 8
        elif energy_kcal >= 350:
            score -= 4
        elif energy_kcal <= 80:
            score += 6
        elif energy_kcal <= 140:
            score += 4

    uncertain = macro_fields < 5
    if uncertain:
        w.append("Estimated from nutrition facts (no Nutri-Score on file for this product).")

    score = max(15, min(96, int(round(score))))
    return score, w, uncertain


def evaluate(profile: HealthProfile, product: Product) -> ScoreResult:
    nutriments: dict[str, Any] = product.nutriments or {}
    ingredients_text = (product.ingredients_text or "").lower()
    category_text = (product.category or "").lower()
    allergen_blob = _allergen_search_text(product)
    limited = bool(product.limited_data)

    allergens_raw = [str(a) for a in (profile.allergens or []) if str(a).strip()]
    conditions_lower = " ".join(str(c).lower() for c in (profile.health_conditions or []))
    goal = (profile.fitness_goal or "").lower()

    warnings: list[str] = []
    if limited:
        warnings.append("Limited information available for this product.")

    matched_allergens = _allergen_matches(allergens_raw, allergen_blob)
    if matched_allergens:
        listed = ", ".join(matched_allergens)
        return ScoreResult(
            score=0,
            tier="bad",
            label="AVOID",
            avoid=True,
            avoid_reason=f"Contains your allergen: {listed}",
            warnings=[f"Allergen match: {listed}"] + warnings,
            recommendation="Don't consume. This product contains an ingredient on your allergen list.",
            limited_information=limited,
        )

    if "celiac" in conditions_lower:
        combined_gluten_text = f"{ingredients_text} {allergen_blob}"
        gluten_hits = [tok for tok in GLUTEN_TOKENS if _has_token(combined_gluten_text, tok)]
        if gluten_hits:
            return ScoreResult(
                score=0,
                tier="bad",
                label="AVOID",
                avoid=True,
                avoid_reason=f"Contains gluten source ({', '.join(sorted(set(gluten_hits)))}). Not safe for celiac disease.",
                warnings=[f"Celiac warning: contains {', '.join(sorted(set(gluten_hits)))}"] + warnings,
                recommendation="Don't consume. Gluten-containing ingredient detected.",
                limited_information=limited,
            )

    usda_facts_only = settings.usda_only_mode or (getattr(product, "source", None) == "usda")

    nutriscore_grade = nutriments.get("nutrition-score-grade") or nutriments.get("nutriscore_grade")
    base_ns = _nutriscore_to_base(nutriscore_grade)
    if usda_facts_only:
        base_ns = None

    macro_fields = _macro_nutrient_count(nutriments)

    cats_raw = getattr(product, "categories_tags", None)
    categories_tags: list[str] | None = cats_raw if isinstance(cats_raw, list) else None
    if usda_facts_only:
        categories_tags = None

    sodium_g = _nutrient(nutriments, "sodium_100g")
    if sodium_g is None:
        salt_g = _nutrient(nutriments, "salt_100g")
        sodium_g = (salt_g / 2.5) if salt_g is not None else None
    sugars_g = _nutrient(nutriments, "sugars_100g")
    sat_fat_g = _nutrient(nutriments, "saturated-fat_100g", "saturated_fat_100g")
    protein_g = _nutrient(nutriments, "proteins_100g", "protein_100g")
    energy_kcal = _nutrient(nutriments, "energy-kcal_100g", "energy_kcal_100g")
    if energy_kcal is None:
        energy_kj = _nutrient(nutriments, "energy_100g", "energy-kj_100g")
        if energy_kj is not None:
            energy_kcal = energy_kj / 4.184
    fiber_g = _nutrient(nutriments, "fiber_100g", "fibre_100g")
    trans_g = _nutrient(nutriments, "trans-fat_100g", "trans_fat_100g")

    score_uncertain = False
    apply_generic_macro_penalties = False
    base_from_computed_nutriscore = False
    score: int

    if (not usda_facts_only) and nutriscore_compute.can_run(nutriments, categories_tags=categories_tags):
        score, _computed_grade, breakdown = nutriscore_compute.score_0_100(
            nutriments,
            categories_tags=categories_tags,
            ingredients_text=getattr(product, "ingredients_text", None),
        )
        base_from_computed_nutriscore = True
        neg = breakdown["negative"]
        if neg.get("points_energy", 0) >= 4:
            warnings.append("Calorie-dense per 100 g (Nutri-Score energy points).")
        if neg.get("points_sugars", 0) >= 4:
            warnings.append("High sugar drives this Nutri-Score.")
        if neg.get("points_sodium", 0) >= 4:
            warnings.append("Sodium contributes strongly to this Nutri-Score.")
        if neg.get("points_sfa_ratio", 0) >= 4:
            warnings.append("High saturated-to-total fat ratio contributes strongly to this Nutri-Score.")
        elif neg.get("points_saturated_fat", 0) >= 4:
            warnings.append("Saturated fat contributes strongly to this Nutri-Score.")
        score = _apply_core_nutrient_penalties(
            score,
            sodium_g=sodium_g,
            sugars_g=sugars_g,
            sat_fat_g=sat_fat_g,
            trans_g=trans_g,
            warnings=warnings,
            skip_nutriscore_negatives=True,
        )
    elif base_ns is not None:
        score = base_ns
        apply_generic_macro_penalties = True
    elif macro_fields < 2:
        score = 50
        score_uncertain = True
        warnings.append("Score is uncertain: very little nutrition data on file.")
    else:
        score, fact_warnings, score_uncertain = _score_without_nutriscore_label(
            sodium_g=sodium_g,
            sugars_g=sugars_g,
            sat_fat_g=sat_fat_g,
            protein_g=protein_g,
            energy_kcal=energy_kcal,
            fiber_g=fiber_g,
            trans_g=trans_g,
            macro_fields=macro_fields,
        )
        warnings.extend(fact_warnings)

    if apply_generic_macro_penalties:
        score = _apply_core_nutrient_penalties(
            score,
            sodium_g=sodium_g,
            sugars_g=sugars_g,
            sat_fat_g=sat_fat_g,
            trans_g=trans_g,
            warnings=warnings,
            skip_nutriscore_negatives=False,
        )

    cond_dampen = 0.5 if base_from_computed_nutriscore else 1.0
    if "diabetes" in conditions_lower:
        if sugars_g is not None and sugars_g > 10:
            score -= int(round(15 * cond_dampen))
            warnings.append("High sugar may spike blood glucose.")
        if sugars_g is not None and 5 < sugars_g <= 10:
            score -= int(round(5 * cond_dampen))
    if "hypertension" in conditions_lower or "high blood pressure" in conditions_lower:
        if sodium_g is not None and sodium_g > 0.4:
            score -= int(round(12 * cond_dampen))
            warnings.append("Sodium may be high for blood-pressure goals.")
    if "cholesterol" in conditions_lower:
        if sat_fat_g is not None and sat_fat_g > 3:
            score -= int(round(10 * cond_dampen))
            warnings.append("Saturated fat may raise LDL cholesterol.")

    if "muscle" in goal or "gain" in goal:
        if protein_g is not None:
            if protein_g >= 15:
                score += 8
            elif protein_g >= 8:
                score += 3
            elif protein_g < 4:
                warnings.append("Low protein for a muscle-gain goal.")
    if "lose" in goal or "weight" in goal:
        if energy_kcal is not None:
            if energy_kcal <= 100:
                score += 6
            elif energy_kcal <= 200:
                score += 2
            elif energy_kcal > 400:
                score -= 6
                warnings.append("Calorie-dense for a weight-loss goal.")
    if "whole" in goal:
        if fiber_g is not None and fiber_g >= 6:
            score += 4

    score = max(0, min(100, int(round(score))))
    tier = _tier_for_score(score)
    label = _label_for_score(score)

    if tier == "good":
        recommendation = "Good fit for your profile. Enjoy in normal portions."
    elif tier == "okay":
        recommendation = "Acceptable, but watch the flagged nutrients."
    else:
        recommendation = "Better alternatives likely exist for your profile."

    return ScoreResult(
        score=score,
        tier=tier,
        label=label,
        avoid=False,
        avoid_reason=None,
        warnings=warnings,
        recommendation=recommendation,
        limited_information=limited or score_uncertain,
    )