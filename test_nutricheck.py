"""
NutriCheck Unit Test Suite
Run with: pytest test_nutricheck.py -v --cov=backend --cov-report=term-missing
Install deps: pip install pytest pytest-cov fastapi httpx pydantic
"""

import uuid
from unittest.mock import MagicMock

import pytest
from pydantic import ValidationError

# ── Scoring imports ───────────────────────────────────────────────────────────
from backend.services.scoring import (
    _allergen_matches,
    _has_token,
    _label_for_score,
    _nutriscore_to_base,
    _tier_for_score,
    _to_float,
    evaluate,
)

# ── Schema imports ────────────────────────────────────────────────────────────
from backend.schemas.scan_v2 import ScanRequest
from backend.schemas.profile import ProfileUpsertRequest, _normalize_string_list
from backend.schemas.health_profile import HealthProfileCreateRequest

# ── Rating service imports ────────────────────────────────────────────────────
from backend.services.rating_service import evaluate_product, _score_from_nutrients


# ─────────────────────────────────────────────────────────────────────────────
# Helpers — build mock HealthProfile and Product without hitting the database
# ─────────────────────────────────────────────────────────────────────────────

def make_profile(conditions=None, allergens=None, goal="maintenance"):
    profile = MagicMock()
    profile.health_conditions = conditions or []
    profile.allergens = allergens or []
    profile.fitness_goal = goal
    return profile


def make_product(
    name="Test Product",
    ingredients_text="",
    nutriments=None,
    category="",
    limited_data=False,
):
    product = MagicMock()
    product.name = name
    product.ingredients_text = ingredients_text
    product.nutriments = nutriments or {}
    product.category = category
    product.limited_data = limited_data
    return product


# =============================================================================
# SECTION 1: _to_float
# =============================================================================

class TestToFloat:
    def test_none_returns_none(self):
        assert _to_float(None) is None

    def test_int_converts(self):
        assert _to_float(5) == 5.0

    def test_float_passthrough(self):
        assert _to_float(3.14) == 3.14

    def test_string_number_converts(self):
        assert _to_float("2.5") == 2.5

    def test_invalid_string_returns_none(self):
        assert _to_float("abc") is None

    def test_zero_converts(self):
        assert _to_float(0) == 0.0


# =============================================================================
# SECTION 2: _has_token
# =============================================================================

class TestHasToken:
    def test_found_in_haystack(self):
        assert _has_token("contains peanut butter", "peanut") is True

    def test_not_found(self):
        assert _has_token("contains almonds", "peanut") is False

    def test_short_needle_returns_false(self):
        assert _has_token("contains eg", "eg") is False

    def test_case_insensitive(self):
        assert _has_token("contains wheat flour", "wheat") is True

    def test_empty_haystack(self):
        assert _has_token("", "peanut") is False


# =============================================================================
# SECTION 3: _tier_for_score
# =============================================================================

class TestTierForScore:
    def test_score_70_is_good(self):
        assert _tier_for_score(70) == "good"

    def test_score_100_is_good(self):
        assert _tier_for_score(100) == "good"

    def test_score_69_is_okay(self):
        assert _tier_for_score(69) == "okay"

    def test_score_40_is_okay(self):
        assert _tier_for_score(40) == "okay"

    def test_score_39_is_bad(self):
        assert _tier_for_score(39) == "bad"

    def test_score_0_is_bad(self):
        assert _tier_for_score(0) == "bad"


# =============================================================================
# SECTION 4: _label_for_score
# =============================================================================

class TestLabelForScore:
    def test_80_plus_is_excellent(self):
        assert _label_for_score(80) == "Excellent"

    def test_100_is_excellent(self):
        assert _label_for_score(100) == "Excellent"

    def test_60_to_79_is_good(self):
        assert _label_for_score(60) == "Good"
        assert _label_for_score(79) == "Good"

    def test_40_to_59_is_fair(self):
        assert _label_for_score(40) == "Fair"
        assert _label_for_score(59) == "Fair"

    def test_below_40_is_poor(self):
        assert _label_for_score(39) == "Poor"
        assert _label_for_score(0) == "Poor"


# =============================================================================
# SECTION 5: _nutriscore_to_base
# =============================================================================

class TestNutriscoreToBase:
    def test_grade_a(self):
        assert _nutriscore_to_base("a") == 90

    def test_grade_b(self):
        assert _nutriscore_to_base("b") == 75

    def test_grade_c(self):
        assert _nutriscore_to_base("c") == 60

    def test_grade_d(self):
        assert _nutriscore_to_base("d") == 45

    def test_grade_e(self):
        assert _nutriscore_to_base("e") == 25

    def test_uppercase_grade(self):
        assert _nutriscore_to_base("A") == 90

    def test_none_returns_none(self):
        assert _nutriscore_to_base(None) is None

    def test_invalid_grade_returns_none(self):
        assert _nutriscore_to_base("z") is None


# =============================================================================
# SECTION 6: _allergen_matches
# =============================================================================

class TestAllergenMatches:
    def test_direct_peanut_match(self):
        result = _allergen_matches(["peanut"], "contains peanut butter", "snacks")
        assert "peanut" in result

    def test_synonym_match_gluten_via_wheat(self):
        result = _allergen_matches(["gluten"], "made with wheat flour", "cereals")
        assert "gluten" in result

    def test_no_match(self):
        result = _allergen_matches(["peanut"], "contains almonds and cashews", "snacks")
        assert result == []

    def test_empty_allergens(self):
        result = _allergen_matches([], "contains peanut butter", "snacks")
        assert result == []

    def test_dairy_synonym_via_milk(self):
        result = _allergen_matches(["dairy"], "ingredients: milk, sugar, cocoa", "chocolate")
        assert "dairy" in result

    def test_sesame_via_tahini(self):
        result = _allergen_matches(["sesame"], "contains tahini paste", "spreads")
        assert "sesame" in result

    def test_deduplication(self):
        result = _allergen_matches(["peanut", "peanut"], "contains peanut", "snacks")
        assert result.count("peanut") == 1

    def test_case_insensitive_ingredient(self):
        result = _allergen_matches(["peanut"], "Contains PEANUT BUTTER", "snacks")
        assert "peanut" in result


# =============================================================================
# SECTION 7: evaluate (scoring.py) — allergen and celiac hard stops
# =============================================================================

class TestEvaluateAllergenAvoid:
    def test_peanut_allergen_returns_avoid(self):
        profile = make_profile(allergens=["peanut"])
        product = make_product(ingredients_text="peanut butter, sugar, salt")
        result = evaluate(profile, product)
        assert result.avoid is True
        assert result.score == 0
        assert result.label == "AVOID"
        assert result.tier == "bad"

    def test_no_allergen_match_does_not_avoid(self):
        profile = make_profile(allergens=["peanut"])
        product = make_product(ingredients_text="oats, honey, almonds")
        result = evaluate(profile, product)
        assert result.avoid is False

    def test_celiac_with_wheat_returns_avoid(self):
        profile = make_profile(conditions=["celiac"])
        product = make_product(ingredients_text="whole wheat flour, yeast, salt")
        result = evaluate(profile, product)
        assert result.avoid is True
        assert result.score == 0

    def test_celiac_with_gluten_free_product_does_not_avoid(self):
        profile = make_profile(conditions=["celiac"])
        product = make_product(ingredients_text="rice flour, tapioca starch, sugar")
        result = evaluate(profile, product)
        assert result.avoid is False

    def test_limited_data_adds_warning(self):
        profile = make_profile()
        product = make_product(limited_data=True)
        result = evaluate(profile, product)
        assert any("Limited" in w for w in result.warnings)

    def test_allergen_avoid_reason_contains_allergen_name(self):
        profile = make_profile(allergens=["sesame"])
        product = make_product(ingredients_text="tahini, lemon juice, garlic")
        result = evaluate(profile, product)
        assert result.avoid is True
        assert "sesame" in result.avoid_reason.lower()


# =============================================================================
# SECTION 8: evaluate — nutrient-based scoring
# =============================================================================

class TestEvaluateNutrientScoring:
    def test_high_sodium_deducts_points(self):
        profile = make_profile()
        product = make_product(nutriments={"sodium_100g": 2.0})
        result = evaluate(profile, product)
        assert result.score <= 60

    def test_high_sugar_deducts_points(self):
        profile = make_profile()
        product = make_product(nutriments={"sugars_100g": 25.0})
        result = evaluate(profile, product)
        assert result.score <= 60

    def test_high_sat_fat_deducts_points(self):
        profile = make_profile()
        product = make_product(nutriments={"saturated-fat_100g": 6.0})
        result = evaluate(profile, product)
        assert result.score <= 65

    def test_clean_product_scores_well(self):
        profile = make_profile()
        product = make_product(nutriments={
            "sodium_100g": 0.1,
            "sugars_100g": 2.0,
            "saturated-fat_100g": 0.5,
            "nutrition-score-grade": "a",
        })
        result = evaluate(profile, product)
        assert result.score >= 70

    def test_score_clamped_to_100(self):
        profile = make_profile(goal="muscle gain")
        product = make_product(nutriments={
            "nutrition-score-grade": "a",
            "proteins_100g": 30.0,
        })
        result = evaluate(profile, product)
        assert result.score <= 100

    def test_score_never_below_zero(self):
        profile = make_profile(conditions=["diabetes", "hypertension"])
        product = make_product(nutriments={
            "sodium_100g": 3.0,
            "sugars_100g": 30.0,
            "saturated-fat_100g": 8.0,
        })
        result = evaluate(profile, product)
        assert result.score >= 0


# =============================================================================
# SECTION 9: evaluate — condition-specific penalties
# =============================================================================

class TestEvaluateConditionPenalties:
    def test_diabetes_high_sugar_extra_penalty(self):
        profile_base = make_profile()
        profile_diabetes = make_profile(conditions=["diabetes"])
        product = make_product(nutriments={"sugars_100g": 15.0})
        result_base = evaluate(profile_base, product)
        result_diabetes = evaluate(profile_diabetes, product)
        assert result_diabetes.score < result_base.score

    def test_hypertension_high_sodium_extra_penalty(self):
        profile_base = make_profile()
        profile_hypertension = make_profile(conditions=["hypertension"])
        product = make_product(nutriments={"sodium_100g": 0.8})
        result_base = evaluate(profile_base, product)
        result_hypertension = evaluate(profile_hypertension, product)
        assert result_hypertension.score < result_base.score

    def test_cholesterol_high_sat_fat_extra_penalty(self):
        profile_base = make_profile()
        profile_cholesterol = make_profile(conditions=["high cholesterol"])
        product = make_product(nutriments={"saturated-fat_100g": 4.0})
        result_base = evaluate(profile_base, product)
        result_cholesterol = evaluate(profile_cholesterol, product)
        assert result_cholesterol.score < result_base.score


# =============================================================================
# SECTION 10: evaluate — fitness goal bonuses
# =============================================================================

class TestEvaluateFitnessGoalBonuses:
    def test_muscle_gain_high_protein_bonus(self):
        profile_base = make_profile(goal="maintenance")
        profile_muscle = make_profile(goal="muscle gain")
        product = make_product(nutriments={"proteins_100g": 20.0})
        result_base = evaluate(profile_base, product)
        result_muscle = evaluate(profile_muscle, product)
        assert result_muscle.score > result_base.score

    def test_weight_loss_low_calorie_bonus(self):
        profile_base = make_profile(goal="maintenance")
        profile_loss = make_profile(goal="lose weight")
        product = make_product(nutriments={"energy-kcal_100g": 80.0})
        result_base = evaluate(profile_base, product)
        result_loss = evaluate(profile_loss, product)
        assert result_loss.score >= result_base.score

    def test_weight_loss_high_calorie_penalty(self):
        profile = make_profile(goal="lose weight")
        product = make_product(nutriments={"energy-kcal_100g": 500.0})
        result = evaluate(profile, product)
        assert any("Calorie" in w for w in result.warnings)

    def test_muscle_gain_low_protein_warning(self):
        profile = make_profile(goal="muscle gain")
        product = make_product(nutriments={"proteins_100g": 2.0})
        result = evaluate(profile, product)
        assert any("protein" in w.lower() for w in result.warnings)


# =============================================================================
# SECTION 11: evaluate — tier and label outputs
# =============================================================================

class TestEvaluateTierAndLabel:
    def test_good_tier_has_positive_recommendation(self):
        profile = make_profile()
        product = make_product(nutriments={"nutrition-score-grade": "a"})
        result = evaluate(profile, product)
        if result.tier == "good":
            assert "Good fit" in result.recommendation

    def test_bad_tier_has_alternatives_recommendation(self):
        profile = make_profile()
        product = make_product(nutriments={
            "sodium_100g": 3.0,
            "sugars_100g": 30.0,
            "saturated-fat_100g": 8.0,
        })
        result = evaluate(profile, product)
        if result.tier == "bad":
            assert "alternatives" in result.recommendation.lower()

    def test_non_avoid_result_has_false_avoid_flag(self):
        profile = make_profile(allergens=["peanut"])
        product = make_product(ingredients_text="oats, honey, water")
        result = evaluate(profile, product)
        assert result.avoid is False
        assert result.label != "AVOID"


# =============================================================================
# SECTION 12: ProfileUpsertRequest schema validation
# =============================================================================

class TestProfileUpsertRequest:
    def test_valid_request_passes(self):
        req = ProfileUpsertRequest(
            health_conditions=["diabetes"],
            allergens=["peanut"],
            fitness_goal="lose weight",
        )
        assert req.fitness_goal == "lose weight"

    def test_empty_fitness_goal_fails(self):
        with pytest.raises(ValidationError):
            ProfileUpsertRequest(
                health_conditions=[],
                allergens=[],
                fitness_goal="",
            )

    def test_fitness_goal_trimmed(self):
        req = ProfileUpsertRequest(
            health_conditions=[],
            allergens=[],
            fitness_goal="  maintenance  ",
        )
        assert req.fitness_goal == "maintenance"

    def test_none_allergens_becomes_empty_list(self):
        req = ProfileUpsertRequest(
            health_conditions=None,
            allergens=None,
            fitness_goal="maintenance",
        )
        assert req.allergens == []

    def test_duplicate_allergens_deduped(self):
        req = ProfileUpsertRequest(
            health_conditions=[],
            allergens=["peanut", "Peanut", "PEANUT"],
            fitness_goal="maintenance",
        )
        assert len(req.allergens) == 1

    def test_whitespace_only_allergen_removed(self):
        req = ProfileUpsertRequest(
            health_conditions=[],
            allergens=["   ", "peanut"],
            fitness_goal="maintenance",
        )
        assert "   " not in req.allergens
        assert "peanut" in req.allergens

    def test_fitness_goal_max_length(self):
        with pytest.raises(ValidationError):
            ProfileUpsertRequest(
                health_conditions=[],
                allergens=[],
                fitness_goal="x" * 101,
            )


# =============================================================================
# SECTION 13: ScanRequest schema validation
# =============================================================================

class TestScanRequest:
    def test_valid_request(self):
        req = ScanRequest(
            user_id=str(uuid.uuid4()),
            barcode="0123456789012",
        )
        assert len(req.barcode) >= 4

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValidationError):
            ScanRequest(user_id="not-a-uuid", barcode="1234567890123")

    def test_non_numeric_barcode_stripped(self):
        req = ScanRequest(
            user_id=str(uuid.uuid4()),
            barcode="012-345-678",
        )
        assert "-" not in req.barcode

    def test_barcode_too_short_after_cleaning_raises(self):
        with pytest.raises(ValidationError):
            ScanRequest(user_id=str(uuid.uuid4()), barcode="12")

    def test_barcode_with_spaces_cleaned(self):
        req = ScanRequest(
            user_id=str(uuid.uuid4()),
            barcode="0123 4567 8901",
        )
        assert " " not in req.barcode


# =============================================================================
# SECTION 14: HealthProfileCreateRequest schema validation
# =============================================================================

class TestHealthProfileCreateRequest:
    def test_valid_request(self):
        req = HealthProfileCreateRequest(
            user_id=str(uuid.uuid4()),
            health_conditions=["diabetes"],
            allergens=["peanut"],
            fitness_goal="lose weight",
        )
        assert req.fitness_goal == "lose weight"

    def test_invalid_user_id_raises(self):
        with pytest.raises(ValidationError):
            HealthProfileCreateRequest(
                user_id="bad-id",
                health_conditions=[],
                allergens=[],
                fitness_goal="maintenance",
            )

    def test_whitespace_allergens_filtered(self):
        req = HealthProfileCreateRequest(
            user_id=str(uuid.uuid4()),
            health_conditions=[],
            allergens=["  ", "peanut", "  "],
            fitness_goal="maintenance",
        )
        assert "  " not in req.allergens
        assert "peanut" in req.allergens

    def test_empty_condition_filtered(self):
        req = HealthProfileCreateRequest(
            user_id=str(uuid.uuid4()),
            health_conditions=["", "diabetes", "  "],
            allergens=[],
            fitness_goal="maintenance",
        )
        assert "" not in req.health_conditions
        assert "diabetes" in req.health_conditions


# =============================================================================
# SECTION 15: _normalize_string_list (profile schema helper)
# =============================================================================

class TestNormalizeStringList:
    def test_removes_empty_strings(self):
        result = _normalize_string_list(["", "peanut", "  "])
        assert "" not in result
        assert "peanut" in result

    def test_deduplicates_case_insensitive(self):
        result = _normalize_string_list(["Peanut", "peanut", "PEANUT"])
        assert len(result) == 1

    def test_preserves_original_casing_of_first(self):
        result = _normalize_string_list(["Peanut", "peanut"])
        assert result[0] == "Peanut"

    def test_empty_list(self):
        assert _normalize_string_list([]) == []

    def test_strips_whitespace(self):
        result = _normalize_string_list(["  peanut  "])
        assert result[0] == "peanut"


# =============================================================================
# SECTION 16: rating_service._score_from_nutrients
# =============================================================================

class TestScoreFromNutrients:
    def test_high_sodium_deducts(self):
        score, warnings = _score_from_nutrients({"sodium_100g": 2.0}, "maintenance")
        assert score <= 55
        assert any("sodium" in w.lower() for w in warnings)

    def test_high_sugar_deducts(self):
        score, warnings = _score_from_nutrients({"sugars_100g": 25.0}, "maintenance")
        assert score <= 60
        assert any("sugar" in w.lower() for w in warnings)

    def test_high_sat_fat_deducts(self):
        score, warnings = _score_from_nutrients({"saturated-fat_100g": 6.0}, "maintenance")
        assert score <= 65
        assert any("fat" in w.lower() for w in warnings)

    def test_clean_nutrients_no_warnings(self):
        score, warnings = _score_from_nutrients({
            "sodium_100g": 0.1,
            "sugars_100g": 2.0,
            "saturated-fat_100g": 0.5,
        }, "maintenance")
        assert score == 80
        assert warnings == []

    def test_none_nutriments_returns_base(self):
        score, warnings = _score_from_nutrients(None, "maintenance")
        assert score == 80
        assert warnings == []

    def test_weight_loss_goal_high_sugar_extra_penalty(self):
        score_base, _ = _score_from_nutrients({"sugars_100g": 15.0}, "maintenance")
        score_loss, _ = _score_from_nutrients({"sugars_100g": 15.0}, "lose weight")
        assert score_loss < score_base


# =============================================================================
# SECTION 17: rating_service.evaluate_product
# =============================================================================

class TestEvaluateProduct:
    def test_allergen_match_returns_avoid(self):
        profile = make_profile(allergens=["peanut"])
        product = make_product(ingredients_text="peanut butter, sugar")
        result = evaluate_product(profile, product)
        assert result.avoid is True
        assert result.score == 0
        assert result.label == "AVOID"

    def test_no_allergen_match_does_not_avoid(self):
        profile = make_profile(allergens=["peanut"])
        product = make_product(ingredients_text="oats, honey, water")
        result = evaluate_product(profile, product)
        assert result.avoid is False

    def test_limited_data_adds_warning(self):
        profile = make_profile()
        product = make_product(limited_data=True)
        result = evaluate_product(profile, product)
        assert any("Limited" in w for w in result.warnings)

    def test_excellent_label_for_high_score(self):
        profile = make_profile()
        product = make_product(nutriments={
            "sodium_100g": 0.05,
            "sugars_100g": 1.0,
            "saturated-fat_100g": 0.2,
        })
        result = evaluate_product(profile, product)
        assert result.label in ["Excellent", "Good"]

    def test_hypertension_sodium_warning(self):
        profile = make_profile(conditions=["hypertension"])
        product = make_product(nutriments={"sodium_100g": 0.8})
        result = evaluate_product(profile, product)
        assert any(
            "sodium" in w.lower() or "hypertension" in w.lower()
            for w in result.warnings
        )