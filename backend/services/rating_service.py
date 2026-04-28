"""Legacy rating adapter — delegates to ``scoring.evaluate`` for one canonical model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.models.health_profile import HealthProfile
from backend.models.product import Product
from backend.services import scoring


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
    """Kept for unit tests; new code should use ``scoring.evaluate`` directly."""
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
    s = scoring.evaluate(profile, product)
    return RatingResult(
        score=s.score,
        label=s.label,
        avoid=s.avoid,
        avoid_reason=s.avoid_reason,
        warnings=list(s.warnings),
        limited_information=s.limited_information,
    )
