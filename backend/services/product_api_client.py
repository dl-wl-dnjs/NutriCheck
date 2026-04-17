"""Fetch product data from Open Food Facts (primary) and USDA FoodData Central (secondary)."""

from __future__ import annotations

import re
from typing import Any

import httpx

from backend.config import settings


def _simplify_ingredients_text(text: str | None, max_len: int = 600) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"\s+", " ", text).strip()
    if len(cleaned) > max_len:
        return cleaned[: max_len - 1] + "…"
    return cleaned


def fetch_open_food_facts(barcode: str) -> dict[str, Any] | None:
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
    headers = {"User-Agent": settings.openfoodfacts_user_agent}
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    if payload.get("status") != 1:
        return None
    product = payload.get("product")
    if not isinstance(product, dict):
        return None
    return product


def fetch_usda_branded_by_barcode(barcode: str) -> dict[str, Any] | None:
    params = {
        "api_key": settings.usda_fooddata_api_key,
        "query": barcode,
        "dataType": "Branded",
        "pageSize": 10,
        "pageNumber": 1,
    }
    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None
    foods = payload.get("foods") or []
    for item in foods:
        gtin = str(item.get("gtinUpc") or "").strip()
        if gtin.replace(" ", "") == barcode:
            return item
    if foods:
        return foods[0]
    return None


def _first_off_image(product: dict[str, Any]) -> str | None:
    """Pick the highest-quality front image URL Open Food Facts returns."""
    for key in (
        "image_front_url",
        "image_url",
        "image_front_small_url",
        "image_small_url",
        "image_thumb_url",
    ):
        v = product.get(key)
        if isinstance(v, str) and v.strip().startswith("http"):
            return v.strip()
    return None


def _off_categories_tags(product: dict[str, Any]) -> list[str] | None:
    tags = product.get("categories_tags")
    if isinstance(tags, list):
        cleaned = [str(t).strip() for t in tags if isinstance(t, str) and t.strip()]
        return cleaned or None
    return None


def normalize_from_open_food_facts(product: dict[str, Any]) -> dict[str, Any]:
    nutriments = product.get("nutriments") or {}
    if not isinstance(nutriments, dict):
        nutriments = {}
    ingredients = product.get("ingredients_text") or product.get("ingredients_text_en")
    name = product.get("product_name") or product.get("product_name_en") or "Unknown product"
    brands_raw = product.get("brands") or ""
    # The product endpoint returns brands as a comma string; the search endpoint returns a list.
    if isinstance(brands_raw, list):
        brands = ", ".join(b for b in brands_raw if isinstance(b, str))
    else:
        brands = str(brands_raw)
    categories_raw = product.get("categories") or ""
    if isinstance(categories_raw, list):
        categories = ", ".join(c for c in categories_raw if isinstance(c, str))
    else:
        categories = str(categories_raw)
    first_category = categories.split(",")[0].strip() if categories else None
    limited = len(nutriments) < 3 and not ingredients
    summary = _simplify_ingredients_text(str(ingredients) if ingredients else None)
    return {
        "name": str(name)[:500],
        "brand": str(brands)[:300] if brands else None,
        "category": first_category[:200] if first_category else None,
        "ingredients_text": str(ingredients)[:20000] if ingredients else None,
        "nutriments": nutriments,
        "simplified_summary": summary or None,
        "image_url": _first_off_image(product),
        "categories_tags": _off_categories_tags(product),
        "limited_data": limited,
        "source": "openfoodfacts",
    }


def _category_slug_from_tag(tag: str) -> str:
    """`en:chocolate-spreads` -> `chocolate-spreads` (the slug used by /category/<slug>.json)."""
    return tag.split(":", 1)[1] if ":" in tag else tag


_OFF_SEARCH_FIELDS = ",".join(
    [
        "code",
        "product_name",
        "product_name_en",
        "brands",
        "categories",
        "categories_tags",
        "image_front_url",
        "image_url",
        "image_front_small_url",
        "image_small_url",
        "nutriments",
        "ingredients_text",
        "ingredients_text_en",
        "nutrition_grade_fr",
        "nutrition_grades",
    ]
)


def fetch_open_food_facts_by_category(
    tag: str, *, page_size: int = 20, exclude_barcodes: set[str] | None = None
) -> list[dict[str, Any]]:
    """Return up to ``page_size`` products in the given OFF category tag.

    Uses ``search.openfoodfacts.org``'s ElasticSearch API because the legacy
    ``world.openfoodfacts.org/category/<slug>.json`` endpoint now 301→facets URL
    and is frequently 503. The search service expects the raw tag form, e.g.
    ``en:chocolate-spreads`` or ``fr:pates-a-tartiner``, and is resilient.
    """
    tag_normalized = tag.strip().lower()
    if not tag_normalized:
        return []
    # The search API expects the fully-qualified tag (``en:...`` or ``fr:...``).
    if ":" not in tag_normalized:
        tag_normalized = f"en:{tag_normalized}"
    exclude = {b.strip() for b in (exclude_barcodes or set()) if b and b.strip()}
    url = "https://search.openfoodfacts.org/search"
    params = {
        "q": f'categories_tags:"{tag_normalized}"',
        "page_size": page_size,
        "fields": _OFF_SEARCH_FIELDS,
    }
    headers = {"User-Agent": settings.openfoodfacts_user_agent}
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []
    raw = payload.get("hits") or payload.get("products") or []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for p in raw:
        if not isinstance(p, dict):
            continue
        code = str(p.get("code") or "").strip()
        if not code or code in exclude:
            continue
        normalized = normalize_from_open_food_facts(p)
        normalized["barcode"] = code
        out.append(normalized)
    return out


# Tokens we strip from product names before using them as a search query — brand
# crumbs / packaging sizes shouldn't constrain the search.
_NAME_NOISE = re.compile(
    r"(\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l|oz|lb|ct|pack|packs|piece|pieces|count)\b|\b\d+\b)",
    re.IGNORECASE,
)


def _tokenize_name(name: str, brand: str | None) -> str:
    cleaned = _NAME_NOISE.sub(" ", name)
    if brand:
        for b in brand.split(","):
            b = b.strip()
            if b:
                cleaned = re.sub(re.escape(b), " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def fetch_open_food_facts_by_name(
    name: str,
    *,
    brand: str | None = None,
    page_size: int = 20,
    exclude_barcodes: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Fallback for products that have no ``categories_tags`` in OFF.

    Uses a free-text search so we can still surface similar products by name
    (e.g. a bare-bones UK cereal listing still finds other cereal entries).
    """
    q = _tokenize_name(name, brand)
    if not q:
        return []
    exclude = {b.strip() for b in (exclude_barcodes or set()) if b and b.strip()}
    url = "https://search.openfoodfacts.org/search"
    params = {"q": q, "page_size": page_size, "fields": _OFF_SEARCH_FIELDS}
    headers = {"User-Agent": settings.openfoodfacts_user_agent}
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            response = client.get(url, params=params, headers=headers)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return []
    raw = payload.get("hits") or payload.get("products") or []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for p in raw:
        if not isinstance(p, dict):
            continue
        code = str(p.get("code") or "").strip()
        if not code or code in exclude:
            continue
        normalized = normalize_from_open_food_facts(p)
        normalized["barcode"] = code
        out.append(normalized)
    return out


def _nutrient_amount(food_nutrients: list[dict[str, Any]], nutrient_id: int) -> float | None:
    for n in food_nutrients:
        if n.get("nutrientId") == nutrient_id:
            try:
                return float(n.get("value"))
            except (TypeError, ValueError):
                return None
    return None


def normalize_from_usda(food: dict[str, Any]) -> dict[str, Any]:
    description = food.get("description") or "Unknown product"
    brand = food.get("brandOwner") or food.get("brandName")
    nutrients = food.get("foodNutrients") or []
    nutriments: dict[str, float] = {}
    sodium = _nutrient_amount(nutrients, 1093)
    sugars = _nutrient_amount(nutrients, 2000)
    sat_fat = _nutrient_amount(nutrients, 1258)
    if sodium is not None:
        nutriments["sodium_100g"] = sodium / 1000.0
    if sugars is not None:
        nutriments["sugars_100g"] = sugars
    if sat_fat is not None:
        nutriments["saturated-fat_100g"] = sat_fat
    ingredients = food.get("ingredients") or ""
    limited = len(nutriments) < 2 and not ingredients
    summary = _simplify_ingredients_text(str(ingredients))
    return {
        "name": str(description)[:500],
        "brand": str(brand)[:300] if brand else None,
        "category": "Branded",
        "ingredients_text": str(ingredients)[:20000] if ingredients else None,
        "nutriments": nutriments,
        "simplified_summary": summary or None,
        "image_url": None,  # USDA Branded does not expose a reliable photo URL.
        "limited_data": limited,
        "source": "usda",
    }


def fetch_and_normalize(barcode: str) -> dict[str, Any] | None:
    off = fetch_open_food_facts(barcode)
    if off:
        return normalize_from_open_food_facts(off)
    usda = fetch_usda_branded_by_barcode(barcode)
    if usda:
        return normalize_from_usda(usda)
    return None
