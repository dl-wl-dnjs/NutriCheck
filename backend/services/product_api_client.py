"""Fetch product data from Open Food Facts (primary) and USDA FoodData Central (secondary)."""

from __future__ import annotations

import re
from typing import Any

import httpx

from backend.config import settings

_MAX_HTTP_ATTEMPTS = 3


def _http_get_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
) -> Any | None:
    """GET JSON with small retry budget for transient 5xx / connection errors."""
    last_error: Exception | None = None
    for attempt in range(_MAX_HTTP_ATTEMPTS):
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                response = client.get(url, headers=headers, params=params)
                if response.status_code >= 500 and attempt < _MAX_HTTP_ATTEMPTS - 1:
                    continue
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            last_error = exc
            if attempt >= _MAX_HTTP_ATTEMPTS - 1:
                return None
    return None


def _http_post_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: Any | None = None,
) -> Any | None:
    last_error: Exception | None = None
    for attempt in range(_MAX_HTTP_ATTEMPTS):
        try:
            with httpx.Client(timeout=45.0, follow_redirects=True) as client:
                response = client.post(url, params=params, json=json_body)
                if response.status_code >= 500 and attempt < _MAX_HTTP_ATTEMPTS - 1:
                    continue
                response.raise_for_status()
                return response.json()
        except (httpx.HTTPError, ValueError) as exc:
            last_error = exc
            if attempt >= _MAX_HTTP_ATTEMPTS - 1:
                return None
    return None


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
    payload = _http_get_json(url, headers=headers)
    if not isinstance(payload, dict):
        return None
    if payload.get("status") != 1:
        return None
    product = payload.get("product")
    if not isinstance(product, dict):
        return None
    return product


def _digits_only(barcode: str) -> str:
    return "".join(c for c in (barcode or "") if c.isdigit())


def usda_gtin_matches_scan(barcode: str, gtin_raw: str | None) -> bool:
    """True when scanned ``barcode`` matches FDC ``gtinUpc`` (12/13/14-digit variants)."""
    req = _digits_only(barcode)
    g = _digits_only(str(gtin_raw or ""))
    if not req or not g:
        return False
    if req == g:
        return True
    # GTIN-14 (leading 00) vs UPC-A 12
    if len(req) == 12 and g == "00" + req:
        return True
    if len(g) == 12 and req == "00" + g:
        return True
    if len(req) == 14 and req.startswith("00") and req[2:] == g:
        return True
    if len(g) == 14 and g.startswith("00") and g[2:] == req:
        return True
    rl, gl = req.lstrip("0"), g.lstrip("0")
    if len(rl) >= 8 and len(gl) >= 8 and rl == gl:
        return True
    if len(rl) >= 8 and len(gl) >= 8 and (rl.endswith(gl) or gl.endswith(rl)):
        return True
    return False


def fetch_usda_branded_by_barcode(barcode: str) -> dict[str, Any] | None:
    """Resolve a branded food whose ``gtinUpc`` matches the scanned code (strict match only)."""
    req = _digits_only(barcode)
    if not req:
        return None

    url = "https://api.nal.usda.gov/fdc/v1/foods/search"
    queries: list[str] = [req]
    if len(req) == 12:
        queries.append("00" + req)
    elif len(req) == 14 and req.startswith("00"):
        queries.append(req[2:])

    seen_fdc: set[int] = set()
    for q in queries:
        params = {
            "api_key": settings.usda_fooddata_api_key,
            "query": q,
            "dataType": "Branded",
            "pageSize": 25,
            "pageNumber": 1,
        }
        payload = _http_get_json(url, params=params)
        if not isinstance(payload, dict):
            continue
        foods = payload.get("foods") or []
        if not isinstance(foods, list):
            continue
        for item in foods:
            if not isinstance(item, dict):
                continue
            raw_id = item.get("fdcId")
            if raw_id is not None:
                try:
                    fid = int(raw_id)
                except (TypeError, ValueError):
                    fid = None
                if fid is not None and fid in seen_fdc:
                    continue
                if fid is not None:
                    seen_fdc.add(fid)
            gtin = item.get("gtinUpc")
            if usda_gtin_matches_scan(barcode, gtin):
                return item
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


def _off_string_tag_list(product: dict[str, Any], key: str) -> list[str] | None:
    raw = product.get(key)
    if not isinstance(raw, list):
        return None
    cleaned = [str(t).strip() for t in raw if isinstance(t, str) and t.strip()]
    return cleaned or None


def _off_allergen_statement(product: dict[str, Any]) -> str | None:
    """English-style allergen line from OFF (may duplicate tags, helps substring matching)."""
    for k in ("allergens", "allergens_from_ingredients", "traces"):
        v = product.get(k)
        if isinstance(v, str) and v.strip():
            return v[:10000]
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
        "allergen_statement": _off_allergen_statement(product),
        "allergens_tags": _off_string_tag_list(product, "allergens_tags"),
        "traces_tags": _off_string_tag_list(product, "traces_tags"),
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
        "allergens_tags",
        "traces_tags",
        "allergens",
        "traces",
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
    tag: str,
    *,
    page_size: int = 20,
    page: int = 1,
    exclude_barcodes: set[str] | None = None,
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
        "page": max(1, int(page)),
        "fields": _OFF_SEARCH_FIELDS,
    }
    headers = {"User-Agent": settings.openfoodfacts_user_agent}
    payload = _http_get_json(url, params=params, headers=headers)
    if not isinstance(payload, dict):
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


def usda_search_query_from_product_name(name: str | None, brand: str | None) -> str:
    """Free-text query for USDA FoodData Central branded search (alternatives)."""
    n = (name or "").strip()
    if not n:
        return ""
    return _tokenize_name(n, brand)


def search_usda_branded(
    query: str,
    *,
    page_size: int = 25,
    page_number: int = 1,
) -> list[dict[str, Any]]:
    """Branded foods (US market) from FDC search — hits may omit full nutrients."""
    q = (query or "").strip()
    if not q:
        return []
    params = {
        "api_key": settings.usda_fooddata_api_key,
        "query": q,
        "dataType": "Branded",
        "pageSize": min(max(page_size, 1), 50),
        "pageNumber": max(1, page_number),
    }
    payload = _http_get_json("https://api.nal.usda.gov/fdc/v1/foods/search", params=params)
    if not isinstance(payload, dict):
        return []
    raw = payload.get("foods") or []
    if not isinstance(raw, list):
        return []
    return [x for x in raw if isinstance(x, dict)]


def fetch_usda_foods_by_fdc_ids(fdc_ids: list[int]) -> list[dict[str, Any]]:
    """Full nutrient panels for FDC IDs (POST /v1/foods), chunked."""
    ids = sorted({int(x) for x in fdc_ids if x is not None})
    if not ids:
        return []
    url = "https://api.nal.usda.gov/fdc/v1/foods"
    key = settings.usda_fooddata_api_key
    out: list[dict[str, Any]] = []
    chunk_size = 20
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i : i + chunk_size]
        body = _http_post_json(url, params={"api_key": key}, json_body={"fdcIds": chunk})
        if not isinstance(body, list):
            continue
        out.extend(x for x in body if isinstance(x, dict))
    return out


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
    payload = _http_get_json(url, params=params, headers=headers)
    if not isinstance(payload, dict):
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
    """Read FDC nutrient value; supports search hits (``nutrientId`` / ``value``) and
    ``POST /v1/foods`` detail shape (``nutrient.id`` / ``amount``).
    """
    for n in food_nutrients:
        if not isinstance(n, dict):
            continue
        nid = n.get("nutrientId")
        if nid is None:
            nut = n.get("nutrient")
            if isinstance(nut, dict):
                nid = nut.get("id")
        if nid != nutrient_id:
            continue
        raw = n.get("value")
        if raw is None:
            raw = n.get("amount")
        if raw is not None:
            try:
                return float(raw)
            except (TypeError, ValueError):
                return None
    return None


def _fdc_branded_serving_grams(food: dict[str, Any]) -> float | None:
    """Branded FDC foods report nutrients per serving; convert via serving size when possible."""
    raw = food.get("servingSize")
    if raw is None:
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None
    unit = str(food.get("servingSizeUnit") or "").strip().lower()
    if unit in ("g", "grm", "gram", "grams", "gm"):
        return val
    if "oz" in unit:
        return val * 28.3495
    if "ml" in unit:
        return val
    return None


def _usda_nutrients_per_100g(food: dict[str, Any]) -> dict[str, float]:
    """Map key FDC nutrient IDs to Open Food Facts–style per-100 g keys."""
    nutrients = food.get("foodNutrients") or []
    sg = _fdc_branded_serving_grams(food)
    mult = 100.0 / sg if sg and sg > 0 else 1.0

    def per_100(nid: int) -> float | None:
        raw = _nutrient_amount(nutrients, nid)
        if raw is None:
            return None
        return raw * mult

    out: dict[str, float] = {}
    # Sodium: FDC is mg per serving → g per 100 g
    na = per_100(1093)
    if na is not None:
        out["sodium_100g"] = na / 1000.0
    su = per_100(2000)
    if su is not None:
        out["sugars_100g"] = su
    sf = per_100(1258)
    if sf is not None:
        out["saturated-fat_100g"] = sf
    pr = per_100(1003)
    if pr is not None:
        out["proteins_100g"] = pr
    kcal = per_100(1008)
    if kcal is not None:
        out["energy-kcal_100g"] = kcal
    fat = per_100(1004)
    if fat is not None:
        out["fat_100g"] = fat
    fib = per_100(1079)
    if fib is not None:
        out["fiber_100g"] = fib
    tr = per_100(1257)
    if tr is not None:
        out["trans-fat_100g"] = tr
    return out


def normalize_from_usda(food: dict[str, Any]) -> dict[str, Any]:
    description = food.get("description") or "Unknown product"
    brand = food.get("brandOwner") or food.get("brandName")
    nutriments = _usda_nutrients_per_100g(food)
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
        "categories_tags": None,
        "limited_data": limited,
        "source": "usda",
    }


def filled_macro_field_count(nutriments: dict[str, Any] | None) -> int:
    """How many macro-style per-100g fields are present (ingestion / merge heuristics)."""
    return _filled_macro_values(nutriments or {})


def merge_nutriments_for_richness(
    existing: dict[str, Any] | None,
    incoming: dict[str, Any] | None,
    *,
    incoming_is_richer: bool,
) -> dict[str, Any]:
    """Prefer the richer panel as base, then fill gaps from the other (alternatives upsert)."""
    if incoming_is_richer:
        base, other = incoming or {}, existing or {}
    else:
        base, other = existing or {}, incoming or {}
    out: dict[str, Any] = dict(base)
    for k, v in other.items():
        if v is None:
            continue
        if k not in out or out.get(k) is None:
            out[k] = v
    return out


def _filled_macro_values(nutriments: dict[str, Any]) -> int:
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
        "fat_100g",
        "trans-fat_100g",
    )
    n = 0
    for k in keys:
        v = nutriments.get(k)
        if v is None:
            continue
        try:
            float(v)
        except (TypeError, ValueError):
            continue
        n += 1
    return n


def _merge_normalized_payloads(primary: dict[str, Any], secondary: dict[str, Any]) -> dict[str, Any]:
    """Fill gaps in an OFF-shaped dict using USDA-normalized fields."""
    out = dict(primary)
    n1 = dict(out.get("nutriments") or {})
    n2 = dict(secondary.get("nutriments") or {})
    for key, val in n2.items():
        if val is None:
            continue
        if key not in n1 or n1.get(key) is None:
            n1[key] = val
    out["nutriments"] = n1
    if not out.get("ingredients_text") and secondary.get("ingredients_text"):
        out["ingredients_text"] = secondary["ingredients_text"]
    summary = _simplify_ingredients_text(out.get("ingredients_text"))
    if summary:
        out["simplified_summary"] = summary
    out["limited_data"] = _filled_macro_values(n1) < 2 and not out.get("ingredients_text")
    for key in ("allergen_statement", "allergens_tags", "traces_tags"):
        if not out.get(key) and secondary.get(key):
            out[key] = secondary[key]
    return out


def probe_open_food_facts_reachable() -> bool:
    """Cheap live check that the OFF product API responds (used by /health/deps)."""
    payload = _http_get_json(
        "https://world.openfoodfacts.org/api/v2/product/3017620422003.json",
        headers={"User-Agent": settings.openfoodfacts_user_agent},
    )
    return isinstance(payload, dict) and payload.get("status") == 1


def _usda_merge_enabled() -> bool:
    key = (settings.usda_fooddata_api_key or "").strip()
    return bool(key) and key.upper() != "DEMO_KEY"


def fetch_and_normalize(barcode: str) -> dict[str, Any] | None:
    if settings.usda_only_mode:
        usda = fetch_usda_branded_by_barcode(barcode)
        if usda:
            return normalize_from_usda(usda)
        return None
    off = fetch_open_food_facts(barcode)
    if off:
        primary = normalize_from_open_food_facts(off)
        thin = bool(primary.get("limited_data")) or _filled_macro_values(primary.get("nutriments") or {}) < 2
        if thin or _usda_merge_enabled():
            usda = fetch_usda_branded_by_barcode(barcode)
            if usda:
                secondary = normalize_from_usda(usda)
                primary = _merge_normalized_payloads(primary, secondary)
        return primary
    usda = fetch_usda_branded_by_barcode(barcode)
    if usda:
        return normalize_from_usda(usda)
    return None