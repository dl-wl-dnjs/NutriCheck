"""Personalized health score and warnings (FR-7, FR-8, FR-9)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.models.health_profile import HealthProfile
from backend.models.product import Product


@dataclass(frozen=True)
class RatingResult:
    score: int
    label: str
    avoid: bool
    avoid_reason: str | None
    warnings: list[str]
    limited_information: bool


def _nutrient_float(nutriments: dict[str, Any] | None, key: str) -> float | None:
    if not nutriments:
        return None
    raw = nutriments.get(key)
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _score_from_nutrients(nutriments: dict[str, Any] | None, fitness_goal: str) -> tuple[int, list[str]]:
    warnings: list[str] = []
    score = 80
    sodium = _nutrient_float(nutriments, "sodium_100g") or _nutrient_float(nutriments, "salt_100g")
    if sodium is not None and sodium > 1.5:
        score -= 25
        warnings.append("High sodium per 100g")
    elif sodium is not None and sodium > 0.9:
        score -= 12
        warnings.append("Elevated sodium")

    sugars = _nutrient_float(nutriments, "sugars_100g")
    if sugars is not None and sugars > 22.5:
        score -= 20
        warnings.append("High sugar per 100g")
    elif sugars is not None and sugars > 15:
        score -= 10
        warnings.append("Elevated sugar")

    sat = _nutrient_float(nutriments, "saturated-fat_100g")
    if sat is not None and sat > 5:
        score -= 15
        warnings.append("High saturated fat")
    elif sat is not None and sat > 3:
        score -= 8
        warnings.append("Elevated saturated fat")

    fg = fitness_goal.lower()
    if "lose" in fg or "weight" in fg:
        if sugars is not None and sugars > 12:
            score -= 5
    if "muscle" in fg or "gain" in fg:
        protein = _nutrient_float(nutriments, "proteins_100g")
        if protein is not None and protein < 5:
            warnings.append("Lower protein for stated muscle goal")

    score = max(0, min(100, score))
    return score, warnings


def evaluate_product(profile: HealthProfile, product: Product) -> RatingResult:
    allergens = [str(a).lower().strip() for a in (profile.allergens or []) if str(a).strip()]
    ingredients = (product.ingredients_text or "").lower()
    limited = bool(product.limited_data)

    for allergen in allergens:
        if not allergen:
            continue
        if allergen in ingredients or _token_match(ingredients, allergen):
            return RatingResult(
                score=0,
                label="AVOID",
                avoid=True,
                avoid_reason=f"Flagged ingredient or allergen match: {allergen}",
                warnings=["AVOID: ingredient may conflict with your saved allergens."],
                limited_information=limited,
            )

    warnings: list[str] = []
    if limited:
        warnings.append("Limited information available for this product.")

    base_score, nutrient_warnings = _score_from_nutrients(product.nutriments or {}, profile.fitness_goal)
    warnings.extend(nutrient_warnings)

    conditions = [str(c).lower() for c in (profile.health_conditions or [])]
    if "hypertension" in " ".join(conditions) or "high blood pressure" in " ".join(conditions):
        sodium = _nutrient_float(product.nutriments, "sodium_100g")
        if sodium is not None and sodium > 0.6:
            warnings.append("Sodium may be high for hypertension-related goals.")

    score = base_score
    if score >= 80:
        label = "Excellent"
    elif score >= 60:
        label = "Good"
    else:
        label = "Poor"

    return RatingResult(
        score=score,
        label=label,
        avoid=False,
        avoid_reason=None,
        warnings=warnings,
        limited_information=limited,
    )


def _token_match(haystack: str, needle: str) -> bool:
    if len(needle) < 3:
        return False
    return needle in haystack
