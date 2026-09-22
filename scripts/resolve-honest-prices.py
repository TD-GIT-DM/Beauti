#!/usr/bin/env python3
"""Refresh Beauti catalog prices from verified JSON sources (not HTML scraping).

Sources, same family as the URL resolver:
  - Sephora catalog search JSON (`/api/v2/catalog/search`)
  - Shopify public product JSON (`/products/{handle}.js` or `/products.json`)
  - Curated known list prices in scripts/data/known-list-prices.json

Writes scripts/data/honest-prices.json. Then:
  node scripts/generate-confirm-prices.mjs  →  migrations/0012_confirm_prices.sql

salePrice counts only when it is below every list price. valuePrice is the
compare-at for a single list price. Brand products.json compare_at (dollars)
can raise an understated percent. No invented markdowns.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "url_resolver", ROOT / "scripts" / "resolve-real-product-urls.py"
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)

extract_catalog = _mod.extract_catalog
fetch_json = _mod.fetch_json
pick_sephora = _mod.pick_sephora
sephora_search = _mod.sephora_search
strip_query = _mod.strip_query

OUT_JSON = ROOT / "scripts" / "data" / "honest-prices.json"
CACHE = ROOT / "scripts" / "data" / "honest-prices.cache.json"
URLS_JSON = ROOT / "scripts" / "data" / "real-product-urls.json"
KNOWN_JSON = ROOT / "scripts" / "data" / "known-list-prices.json"

MONEY_RE = re.compile(r"\$?\s*([0-9]+(?:\.[0-9]+)?)")
P_ID_RE = re.compile(r"-P(\d+)", re.I)
SHOPIFY_HANDLE_RE = re.compile(r"/products/([^/?#]+)", re.I)


def money(raw) -> list[float]:
    if raw is None:
        return []
    if isinstance(raw, (int, float)):
        val = float(raw)
        return [val] if 0 < val < 20_000 else []
    return [float(m.group(1)) for m in MONEY_RE.finditer(str(raw)) if 0 < float(m.group(1)) < 20_000]


def shopify_cents(raw) -> float | None:
    """Shopify `/products/{handle}.js` stores money as integer cents. Decimal strings are dollars."""
    return shopify_amount(raw, "cents")


def shopify_dollars(raw) -> float | None:
    """Shopify `/products.json` stores money as dollar strings ("34.00")."""
    return shopify_amount(raw, "dollars")


def shopify_amount(raw, unit: str) -> float | None:
    if raw in (None, "", 0, "0", "0.00"):
        return None
    text = str(raw).strip()
    try:
        val = float(raw)
    except (TypeError, ValueError):
        parsed = money(raw)
        return parsed[0] if parsed else None
    if val <= 0:
        return None
    as_dollars = unit == "dollars" or (isinstance(raw, str) and "." in text)
    value = val if as_dollars else val / 100.0
    if value <= 0 or value >= 20_000:
        return None
    return round_money(value)


def round_money(n: float) -> float:
    return round(float(n) + 1e-9, 2)


def discount_percent(price: float, list_price: float) -> int:
    if list_price <= 0 or price <= 0 or price >= list_price - 0.009:
        return 0
    return int(round((list_price - price) / list_price * 100))


def deal_score(price: float, list_price: float) -> int:
    disc = discount_percent(price, list_price)
    score = 32 + disc * 1.8
    if disc <= 0:
        if price <= 15:
            score += 12
        elif price <= 28:
            score += 8
        elif price <= 45:
            score += 4
    return max(8, min(99, int(round(score))))


def extract_seed_prices() -> dict[str, float]:
    prices: dict[str, float] = {}
    for name in ("0002_seed.sql", "0004_expand_catalog.sql", "0006_perfume_makeup_expand.sql"):
        text = (ROOT / "migrations" / name).read_text()
        for m in re.finditer(r"\(\s*'([^']+)',[\s\S]*?,\s*([0-9]+\.[0-9]{2}),\s*'USD'", text):
            pid = m.group(1)
            if pid not in prices:
                prices[pid] = float(m.group(2))
    return prices


def sephora_product_id(url: str, source: str | None = None) -> str | None:
    if source and source.startswith("sephora-api:"):
        return source.split(":", 1)[1]
    m = P_ID_RE.search(url or "")
    return f"P{m.group(1)}" if m else None


def is_mini_name(catalog_name: str) -> bool:
    name_l = (catalog_name or "").lower()
    return any(tok in name_l for tok in ("mini", "travel size", "travel-size"))


def uniq_money(values: list[float]) -> list[float]:
    return sorted({round_money(v) for v in values if v and 0 < v < 20_000})


def pick_from_range(values: list[float], catalog_name: str, prior: float | None) -> float:
    """Match the catalog size. Keep a mid-range price that sits inside the source range."""
    uniq = uniq_money(values)
    if not uniq:
        raise ValueError("empty price range")
    lo, hi = uniq[0], uniq[-1]
    if is_mini_name(catalog_name):
        return lo
    if prior is None or prior <= 0:
        return hi
    if prior < lo - 0.51:
        return lo
    if prior > hi + 0.51:
        return hi
    nearest = min(uniq, key=lambda v: abs(v - prior))
    if abs(nearest - prior) <= max(3.0, nearest * 0.12):
        return nearest
    return round_money(prior)


def _sephora_payload(current: float, listed: float, cs: dict, product: dict) -> dict:
    if current > listed:
        current = listed
    price = round_money(current)
    list_price = round_money(listed if listed >= price else price)
    return {
        "price": price,
        "listPrice": list_price,
        "onSale": list_price > price + 0.009,
        "listPriceRaw": cs.get("listPrice"),
        "salePriceRaw": cs.get("salePrice"),
        "valuePriceRaw": cs.get("valuePrice"),
        "onSaleData": product.get("onSaleData"),
    }


def prices_from_sephora_product(catalog_name: str, product: dict, prior: float | None = None) -> dict | None:
    cs = product.get("currentSku") or {}
    lists = uniq_money(money(cs.get("listPrice")))
    sales = uniq_money(money(cs.get("salePrice")))
    values = uniq_money(money(cs.get("valuePrice")))
    if not lists and not sales:
        return None

    real_sale = bool(sales) and bool(lists) and min(sales) + 0.009 < min(lists)
    if real_sale:
        if len(lists) == len(sales) and len(lists) > 1:
            anchor = pick_from_range(lists, catalog_name, prior)
            idx = min(range(len(lists)), key=lambda i: abs(lists[i] - anchor))
            current = sales[idx]
            listed = lists[idx]
        else:
            current = min(sales)
            listed = min(lists)
        parsed = _sephora_payload(current, listed, cs, product)
    else:
        base = lists or sales
        current = pick_from_range(base, catalog_name, prior)
        parsed = _sephora_payload(current, current, cs, product)

    if parsed["listPrice"] <= parsed["price"] + 0.009 and values and len(lists) <= 1:
        higher = [v for v in values if v > parsed["price"] + 0.009]
        if len(higher) == 1 or (higher and max(higher) - min(higher) < 0.02):
            parsed = _sephora_payload(parsed["price"], higher[0], cs, product)
    return parsed


SET_RE = re.compile(
    r"\b(gift|set|duo|trio|kit|coffret|sampler|discovery|vault|bundle|ritual|collection|sample|refill|jumbo|exclusif|exclusive|candles?)\b",
    re.I,
)
MINI_RE = re.compile(r"\b(mini|miniature|travel)\b", re.I)


def title_fits(catalog_name: str, title: str) -> bool:
    name = (catalog_name or "").lower()
    label = title or ""
    if SET_RE.search(label) and not SET_RE.search(name):
        return False
    if MINI_RE.search(label) and not is_mini_name(name) and "travel" not in name:
        return False
    if " + " in label and " + " not in name:
        return False
    return True


NAME_STOP = {
    "the", "a", "an", "and", "or", "of", "for", "with", "in", "on", "to", "de",
    "eau", "parfum", "toilette", "cologne",
}
NAME_GENERIC = {
    "lipstick", "lip", "colour", "color", "serum", "cream", "primer", "palette",
    "spray", "powder", "gloss", "balm", "mascara", "foundation", "concealer",
    "makeup", "beauty", "shade", "shades", "liquid",
}
FORM_WORDS = {
    "powder", "mist", "oil", "cream", "serum", "primer", "palette", "lipstick", "mascara",
    "concealer", "foundation", "spray", "shampoo", "conditioner", "gloss", "balm", "blush",
    "liner", "lotion", "wash", "gel", "soap", "scrub", "mask", "toner", "essence",
    "sunscreen", "bronzer", "highlighter", "perfume", "parfum", "toilette", "cologne",
}
QUALIFIER_RE = re.compile(r"\b(starter|beginners?)\b", re.I)
SIZE_WORDS = {
    "ml", "oz", "fl", "pack", "single", "full", "regular", "default", "title",
    "size", "portable", "pcs", "pc",
}
SIZE_TOKEN = re.compile(r"^\d+(?:\.\d+)?(?:ml|oz|g|fl|l|pack)?$")


def name_words(text: str) -> set[str]:
    text = (text or "").lower().replace("®", " ").replace("™", " ").replace("’", "'").replace("‘", "'")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return {t for t in text.split() if t not in NAME_STOP and len(t) > 1}


def title_match_rank(catalog_name: str, title: str, variant_titles: list[str] | None = None) -> tuple[float, int] | None:
    """Coverage and extra-token count, or None when the title is a different product.

    Keep in sync with catalogTitleRank in src/lib/catalog-price.ts.
    """
    if not title_fits(catalog_name, title):
        return None
    if QUALIFIER_RE.search(title or "") and not QUALIFIER_RE.search(catalog_name or ""):
        return None
    ours = name_words(catalog_name)
    if not ours:
        return None
    title_toks = name_words(title)
    catalog_forms = ours & FORM_WORDS
    title_forms = title_toks & FORM_WORDS
    if title_forms - catalog_forms:
        return None
    form_synonym = {"lipstick": {"lip"}}
    for word in catalog_forms - title_forms:
        if not form_synonym.get(word, set()) & title_toks:
            return None
    hay = set(title_toks)
    for variant in variant_titles or []:
        hay |= name_words(variant)
    distinctive = {t for t in ours if t not in NAME_GENERIC} or ours
    if not distinctive <= hay:
        return None
    coverage = len(ours & hay) / len(ours)
    if coverage + 1e-9 < (2 / 3):
        return None
    extra = 0
    for token in title_toks:
        if token in ours or token in NAME_GENERIC or token in SIZE_WORDS or SIZE_TOKEN.match(token):
            continue
        extra += 1
    if extra > 1:
        return None
    return coverage, extra


def listing_fits(catalog_name: str, item: dict) -> bool:
    title = str(item.get("title") or "")
    if title and not title_fits(catalog_name, title):
        return False
    tags = item.get("tags") or []
    tag_text = " ".join(str(t) for t in tags) if isinstance(tags, list) else str(tags)
    meta = f"{item.get('type') or item.get('product_type') or ''} {tag_text}"
    if re.search(r"\bsample\b", meta, re.I) and not re.search(r"\bsample\b", catalog_name or "", re.I):
        return False
    return True


def url_handle(url: str) -> str:
    m = SHOPIFY_HANDLE_RE.search(strip_query(url or ""))
    return m.group(1).lower() if m else ""


def prices_from_shopify_variants(variants: list, catalog_name: str, prior: float | None, unit: str) -> dict | None:
    rows: list[dict] = []
    for var in variants:
        price = shopify_amount(var.get("price"), unit)
        if price is None:
            continue
        compare = shopify_amount(var.get("compare_at_price"), unit)
        listed = compare if compare and compare > price + 0.009 else price
        rows.append({"price": price, "listPrice": listed, "title": str(var.get("title") or var.get("option1") or "")})
    if not rows:
        return None
    fitting = [row for row in rows if title_fits(catalog_name, row["title"])]
    unnamed = [row for row in rows if not row["title"].strip() or row["title"].strip().lower() == "default title"]
    if not fitting and not unnamed:
        return None
    pool = fitting or unnamed
    if prior and prior > 0:
        plausible = [row for row in pool if price_is_plausible(row["price"], prior)]
        if not plausible:
            return None
        pool = plausible
        chosen = min(pool, key=lambda row: (abs(row["price"] - prior), row["price"]))
    else:
        chosen = min(pool, key=lambda row: row["price"])
    price = round_money(chosen["price"])
    listed = round_money(chosen["listPrice"] if chosen["listPrice"] >= price else price)
    return {
        "price": price,
        "listPrice": listed,
        "onSale": listed > price + 0.009,
        "variants": len(rows),
    }


def choose_verified_price(quotes: list[dict]) -> dict | None:
    """Deepest real compare-at wins. Otherwise keep the linked price, or the lowest verified price."""
    usable = []
    for quote in quotes:
        price = quote.get("price")
        listed = quote.get("listPrice")
        if not price or price <= 0 or not listed or listed <= 0:
            continue
        if listed + 0.001 < price - 0.001:
            continue
        usable.append(quote)
    if not usable:
        return None
    real = [quote for quote in usable if quote["listPrice"] > quote["price"] + 0.009]
    if real:
        return max(real, key=lambda quote: (discount_percent(quote["price"], quote["listPrice"]), -quote["price"]))
    linked = [quote for quote in usable if quote.get("linked")]
    pool = linked or usable
    best = min(pool, key=lambda quote: quote["price"])
    return {**best, "price": round_money(best["price"]), "listPrice": round_money(best["price"]), "onSale": False}


def find_sephora_by_id(products: list[dict], product_id: str) -> dict | None:
    for p in products:
        if str(p.get("productId") or "") == product_id:
            return p
    return None


def shopify_js_url(product_url: str) -> str | None:
    url = strip_query(product_url or "")
    if not url.startswith("https://"):
        return None
    if "sephora.com" in url or "ulta.com" in url or "google." in url:
        return None
    m = SHOPIFY_HANDLE_RE.search(url)
    if not m:
        return None
    handle = m.group(1)
    parsed = urllib.parse.urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/products/{handle}.js"


def prices_from_shopify_js(data: dict, catalog_name: str, prior: float | None = None) -> dict | None:
    variants = data.get("variants") or []
    if not variants:
        variants = [data]
    return prices_from_shopify_variants(variants, catalog_name, prior, "cents")


def finalize(row: dict, prior: float | None) -> dict:
    price = round_money(row["price"])
    listed = round_money(row.get("listPrice") or price)
    if listed < price:
        listed = price
    disc = discount_percent(price, listed)
    if disc <= 0:
        listed = price
        disc = 0
    return {
        **row,
        "price": price,
        "listPrice": listed,
        "discountPercent": disc,
        "dealScore": deal_score(price, listed),
        "promoCodes": [],
        "priorPrice": prior,
    }


def price_is_plausible(next_price: float, prior: float | None) -> bool:
    if not next_price or next_price <= 0:
        return False
    if not prior or prior <= 0:
        return True
    return prior * 0.45 <= next_price <= prior * 1.5


def apply_brand_products(products: list[dict], resolved: dict, urls: dict, prior_for, args: list[str]) -> None:
    """Match brand products.json and raise a discount when compare_at is real."""
    img_spec = importlib.util.spec_from_file_location(
        "img_resolver", ROOT / "scripts" / "resolve-real-product-images.py"
    )
    img_mod = importlib.util.module_from_spec(img_spec)
    assert img_spec and img_spec.loader
    img_spec.loader.exec_module(img_mod)

    cache_path = ROOT / "scripts" / "data" / "price-shopify.cache.json"
    catalog: list[dict] = []
    if cache_path.exists() and "--refresh-shops" not in args:
        try:
            loaded = json.loads(cache_path.read_text())
            if isinstance(loaded, list) and loaded:
                catalog = loaded
                print(f"shopify products.json cache items={len(catalog)}", flush=True)
        except Exception:
            catalog = []
    if not catalog:
        print("loading brand products.json", flush=True)
        try:
            catalog = img_mod.load_shopify_catalogs()
        except Exception as exc:
            print(f"shopify catalog failed: {exc}", flush=True)
            catalog = []
        if catalog:
            cache_path.write_text(json.dumps(catalog))
            print(f"shopify products.json items={len(catalog)}", flush=True)
    if not catalog:
        return

    by_brand: dict[str, list[dict]] = {}

    def candidates(brand: str) -> list[dict]:
        key = brand or ""
        if key not in by_brand:
            by_brand[key] = [item for item in catalog if img_mod.brand_ok(brand, item)]
        return by_brand[key]

    raised = 0
    for item in products:
        pid = item["id"]
        prior = prior_for(pid)
        options: list[tuple] = []
        meta = urls.get(pid) or {}
        product_url = meta.get("productUrl") or ""
        for shop_item in candidates(item["brand"]):
            if not listing_fits(item["name"], shop_item):
                continue
            title = shop_item.get("title") or ""
            variants = shop_item.get("variants") or []
            variant_titles = [str(var.get("title") or "") for var in variants]
            rank = title_match_rank(item["name"], title, variant_titles)
            if not rank:
                continue
            coverage, extra = rank
            parsed = prices_from_shopify_variants(variants, item["name"], prior, "dollars")
            if not parsed or parsed["price"] <= 0:
                continue
            if not price_is_plausible(parsed["price"], prior):
                continue
            shop = shop_item.get("shop") or ""
            handle = str(shop_item.get("handle") or "")
            handle_match = bool(handle) and url_handle(product_url) == handle.lower()
            options.append(
                (
                    0 if handle_match else 1,
                    extra,
                    -coverage,
                    abs(parsed["price"] - prior) if prior else 0.0,
                    parsed["price"],
                    {
                        "id": pid,
                        "name": item["name"],
                        "brand": item["brand"],
                        **parsed,
                        "source": f"shopify-products:{shop}",
                        "kind": "brand-products",
                        "matchName": title,
                        "score": round(coverage, 3),
                        "linked": handle_match,
                    },
                )
            )
        if not options:
            continue
        options.sort(key=lambda row: row[:5])
        brand_row = options[0][5]
        existing = resolved.get(pid)
        quotes = []
        if existing and existing.get("kind") != "cleared":
            quotes.append({**existing, "linked": True})
        quotes.append(brand_row)
        winner = choose_verified_price(quotes)
        if not winner:
            continue
        row = finalize(winner, prior)
        prev = existing or {}
        if row["discountPercent"] > (prev.get("discountPercent") or 0) or (
            existing and existing.get("kind") == "cleared" and row["kind"] != "cleared"
        ):
            raised += 1
        resolved[pid] = row
    print(f"brand products.json quotes applied, discount-or-verify touches={raised}", flush=True)


def recompute_stats(resolved: dict, previous_doc: dict) -> dict:
    stats = {
        "total": len(resolved),
        "verified": 0,
        "verifiedSephora": 0,
        "verifiedShopify": 0,
        "knownList": 0,
        "clearedOnly": 0,
        "realMarkdowns": 0,
        "clearedDiscounts": 0,
        "flipped": 0,
        "fakeRemoved": 0,
        "understatedRaised": 0,
    }
    for pid, row in resolved.items():
        kind = row.get("kind") or ""
        prev = previous_doc.get(pid) or {}
        prev_price = prev.get("price")
        prev_list = prev.get("listPrice") if prev.get("listPrice") is not None else prev_price
        prev_disc = prev.get("discountPercent")
        if prev_disc is None and prev_price and prev_list:
            prev_disc = discount_percent(float(prev_price), float(prev_list))
        prev_disc = int(prev_disc or 0)
        new_disc = int(row.get("discountPercent") or 0)
        changed = prev_price is None or abs(float(row["price"]) - float(prev_price)) >= 0.01 or abs(
            float(row["listPrice"]) - float(prev_list or 0)
        ) >= 0.01
        row["changed"] = bool(changed)
        row["previousPrice"] = prev_price
        row["previousListPrice"] = prev_list
        row["previousDiscountPercent"] = prev_disc
        if kind == "cleared":
            stats["clearedOnly"] += 1
        elif kind == "known-list":
            stats["knownList"] += 1
            stats["verified"] += 1
        elif kind.startswith("sephora"):
            stats["verifiedSephora"] += 1
            stats["verified"] += 1
        elif kind in {"brand-pdp", "brand-products"}:
            stats["verifiedShopify"] += 1
            stats["verified"] += 1
        else:
            stats["verified"] += 1
        if new_disc > 0:
            stats["realMarkdowns"] += 1
        else:
            stats["clearedDiscounts"] += 1
        if changed and prev_price is not None:
            stats["flipped"] += 1
        if prev_disc > 0 and new_disc == 0:
            stats["fakeRemoved"] += 1
        if new_disc > prev_disc:
            stats["understatedRaised"] += 1
    return stats


def _self_check() -> None:
    value = prices_from_sephora_product(
        "Violet Faves",
        {"currentSku": {"listPrice": "$34.00", "valuePrice": "$48.00"}, "onSaleData": "NONE"},
        34,
    )
    assert value and value["price"] == 34 and value["listPrice"] == 48, value
    sale = prices_from_sephora_product(
        "Extra Fussy",
        {"currentSku": {"listPrice": "$26.00", "salePrice": "$18.20", "valuePrice": "$45.00"}, "onSaleData": "FULL"},
        26,
    )
    assert sale and sale["price"] == 18.2 and sale["listPrice"] == 26, sale
    rang = prices_from_sephora_product(
        "Pillow Talk",
        {"currentSku": {"listPrice": "$37.00 - $39.00", "salePrice": "$37.00"}, "onSaleData": "NONE"},
        37,
    )
    assert rang and rang["price"] == 37 and rang["listPrice"] == 37, rang
    kept_size = prices_from_sephora_product(
        "Bal d'Afrique Eau de Parfum",
        {"currentSku": {"listPrice": "$90.00 - $330.00"}, "onSaleData": "NONE"},
        196,
    )
    assert kept_size and kept_size["price"] == 196 and kept_size["listPrice"] == 196, kept_size
    blush = prices_from_sephora_product(
        "Colorful Blush",
        {"currentSku": {"listPrice": "$14.00 - $15.00", "salePrice": "$7.00"}, "onSaleData": "FULL"},
        14,
    )
    assert blush and blush["price"] == 7 and blush["listPrice"] == 14, blush
    cents = prices_from_shopify_variants(
        [{"title": "Default Title", "price": 3400, "compare_at_price": 4800}],
        "Trio",
        48,
        "cents",
    )
    assert cents and cents["price"] == 34 and cents["listPrice"] == 48, cents
    dollars = prices_from_shopify_variants(
        [{"title": "Default Title", "price": "34.00", "compare_at_price": "48.00"}],
        "Trio",
        48,
        "dollars",
    )
    assert dollars and dollars["price"] == 34 and dollars["listPrice"] == 48, dollars
    bottle = prices_from_shopify_variants(
        [
            {"title": "100ml", "price": "140.00", "compare_at_price": None},
            {"title": "10ml Miniature", "price": "88.00", "compare_at_price": None},
        ],
        "Vanilla | 28",
        130,
        "dollars",
    )
    assert bottle and bottle["price"] == 140 and bottle["listPrice"] == 140, bottle
    skipped = prices_from_shopify_variants(
        [
            {"title": "100ml", "price": "559.00", "compare_at_price": None},
            {"title": "10ml Miniature", "price": "125.00", "compare_at_price": None},
        ],
        "Vanilla | 28",
        88,
        "dollars",
    )
    assert skipped is None, skipped
    kept = choose_verified_price(
        [
            {"price": 40, "listPrice": 40, "linked": True, "kind": "sephora-pdp"},
            {"price": 18, "listPrice": 18, "linked": False, "kind": "brand-products"},
        ]
    )
    assert kept and kept["price"] == 40 and kept["listPrice"] == 40, kept
    raised = choose_verified_price(
        [
            {"price": 25, "listPrice": 25, "linked": True, "kind": "sephora-pdp"},
            {"price": 20, "listPrice": 28, "linked": False, "kind": "brand-products"},
        ]
    )
    assert raised and raised["price"] == 20 and raised["listPrice"] == 28, raised
    mist = title_match_rank(
        "Stay All Night Micro-Fine Setting Mist",
        "Stay All Night Micro-Fine Setting Mist",
    )
    lipstick = title_match_rank(
        "Stay All Night Micro-Fine Setting Mist",
        "O FACE Satin Lipstick - All Night",
    )
    assert mist and mist[1] == 0, mist
    assert lipstick is None, lipstick
    assert title_match_rank("Molecule 01", "Escentric 01") is None
    assert title_match_rank("Molecule 01", "Molecule 01") is not None
    assert title_match_rank("Molecule 01", "Molecule 01 + Clary Sage") is None
    revive = title_match_rank(
        "Revive Serum Ginseng + Snail",
        "Revive Serum : Ginseng + Snail Mucin",
    )
    assert revive and revive[1] == 1, revive
    assert title_match_rank("Revive Serum Ginseng + Snail", "Relief Sun") is None
    assert title_match_rank("Delina Eau de Parfum", "DELINA") is not None
    assert title_match_rank("Delina Eau de Parfum", "DELINA EXCLUSIF") is None
    assert title_match_rank("Delina Eau de Parfum", "DELINA LA ROSEE") is None
    assert title_match_rank("Slant Tweezer", "Navy Blue Slant Tweezer") is None
    assert title_match_rank("Vanilla Sky Body Mist", "Vanilla Sky Hair & Body Mist") is not None
    assert title_match_rank("Naxos Eau de Parfum", "Naxos Sample") is None
    assert title_match_rank("Pro Filt'r Soft Matte Foundation 370", "Pro Filt'r Soft Matte Powder Foundation") is None
    assert title_match_rank("Not Another Cherry Eau de Parfum", "Not Another Cherry - Candles") is None
    assert title_match_rank("Retinol Serum", "Starter Retinol Serum") is None
    assert title_match_rank("Vanilla | 28 Travel Spray", "Vanilla | 28") is None
    assert title_match_rank("The Vitamin C 23 Serum", "Advanced The Vitamin C 23 Serum") is not None
    assert title_match_rank("Velvet Ribbon Lipstick", "Velvet Ribbon (True Velvet Lip Colour)") is not None
    assert not listing_fits("Molecule 01", {"title": "Molecule 01", "type": "10ml Sample", "tags": ["Sample"]})
    print("price self-check ok", flush=True)


def main() -> None:
    _self_check()
    limit = None
    sleep_s = 0.12
    args = sys.argv[1:]
    if "--limit" in args:
        limit = int(args[args.index("--limit") + 1])
    if "--sleep" in args:
        sleep_s = float(args[args.index("--sleep") + 1])

    products = extract_catalog()
    if limit:
        products = products[:limit]
    print(f"catalog products={len(products)}", flush=True)

    prior_prices = extract_seed_prices()
    previous_doc: dict = {}
    if OUT_JSON.exists():
        try:
            previous_doc = json.loads(OUT_JSON.read_text()).get("products") or {}
        except Exception:
            previous_doc = {}

    def prior_for(pid: str) -> float | None:
        prev = previous_doc.get(pid) or {}
        if prev.get("price"):
            return float(prev["price"])
        return prior_prices.get(pid)

    urls = {}
    if URLS_JSON.exists():
        urls = (json.loads(URLS_JSON.read_text()).get("products") or {})

    known = {}
    if KNOWN_JSON.exists():
        known = (json.loads(KNOWN_JSON.read_text()).get("prices") or {})

    cache: dict = {}
    if CACHE.exists():
        try:
            cache = json.loads(CACHE.read_text())
        except Exception:
            cache = {}
    sephora_cache = cache.get("sephoraSearch") or {}
    shopify_cache = cache.get("shopifyJs") or {}

    # Group Sephora PDPs by product id so we fetch once per linked page.
    by_pid: dict[str, list[dict]] = defaultdict(list)
    others: list[dict] = []
    for p in products:
        meta = urls.get(p["id"]) or {}
        product_id = sephora_product_id(meta.get("productUrl") or "", meta.get("source"))
        if meta.get("kind") == "sephora-pdp" and product_id:
            by_pid[product_id].append({**p, "meta": meta, "productId": product_id})
        else:
            others.append({**p, "meta": meta})

    unique_pids = list(by_pid.keys())
    sephora_hits: dict[str, dict] = {}
    for i, product_id in enumerate(unique_pids):
        group = by_pid[product_id]
        sample = group[0]
        meta = sample["meta"]
        brand = sample["brand"]
        match_name = meta.get("matchName") or sample["name"]
        q_brand, q_name = brand, match_name
        print(f"[sephora {i+1}/{len(unique_pids)}] {product_id}", flush=True)
        hits = sephora_search(q_brand, q_name, sephora_cache)
        time.sleep(sleep_s)
        prod = find_sephora_by_id(hits, product_id)
        if not prod:
            hits2 = sephora_search("Sephora", product_id, sephora_cache)
            time.sleep(sleep_s * 0.5)
            prod = find_sephora_by_id(hits2, product_id) or find_sephora_by_id(hits, product_id)
        if prod:
            sephora_hits[product_id] = prod

    resolved: dict[str, dict] = {}
    stats = {
        "total": len(products),
        "verifiedSephora": 0,
        "verifiedShopify": 0,
        "knownList": 0,
        "clearedOnly": 0,
        "realMarkdowns": 0,
    }

    for product_id, group in by_pid.items():
        prod = sephora_hits.get(product_id)
        for item in group:
            prior = prior_for(item["id"])
            if prod:
                parsed = prices_from_sephora_product(item["name"], prod, prior)
                if parsed:
                    row = finalize(
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "brand": item["brand"],
                            **parsed,
                            "source": f"sephora-api:{product_id}",
                            "kind": "sephora-pdp",
                            "matchName": prod.get("displayName") or prod.get("productName"),
                        },
                        prior,
                    )
                    if row["discountPercent"] > 0:
                        stats["realMarkdowns"] += 1
                    stats["verifiedSephora"] += 1
                    resolved[item["id"]] = row
                    continue
            others.append(item)

    for i, item in enumerate(others):
        if item["id"] in resolved:
            continue
        prior = prior_for(item["id"])
        meta = item.get("meta") or {}
        print(f"[other {i+1}/{len(others)}] {item['id']}", flush=True)

        # 1) Shopify product JSON for official brand PDPs
        js_url = shopify_js_url(meta.get("productUrl") or "")
        shopify_data = None
        if js_url:
            if js_url in shopify_cache:
                shopify_data = shopify_cache[js_url]
            else:
                try:
                    shopify_data = fetch_json(js_url)
                    shopify_cache[js_url] = shopify_data
                except Exception as exc:
                    shopify_cache[js_url] = None
                    print(f"    shopify fail {js_url}: {exc}", flush=True)
                    shopify_data = None
                time.sleep(sleep_s)
            parsed = None
            if shopify_data and listing_fits(item["name"], shopify_data):
                parsed = prices_from_shopify_js(shopify_data, item["name"], prior)
            if parsed:
                row = finalize(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "brand": item["brand"],
                        **parsed,
                        "source": f"shopify-js:{js_url}",
                        "kind": "brand-pdp",
                        "matchName": shopify_data.get("title"),
                    },
                    prior,
                )
                if row["discountPercent"] > 0:
                    stats["realMarkdowns"] += 1
                stats["verifiedShopify"] += 1
                resolved[item["id"]] = row
                continue

        # 2) Sephora search even for brand / fallback SKUs
        hits = sephora_search(item["brand"], item["name"], sephora_cache)
        time.sleep(sleep_s)
        pick = pick_sephora(item["brand"], item["name"], hits)
        if pick:
            prod = next((p for p in hits if (p.get("displayName") or p.get("productName")) == pick.get("matchName")), None)
            prod = prod or find_sephora_by_id(hits, str(pick.get("productId") or ""))
            if prod:
                parsed = prices_from_sephora_product(item["name"], prod, prior)
                if parsed:
                    row = finalize(
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "brand": item["brand"],
                            **parsed,
                            "source": f"sephora-api:{pick.get('productId')}",
                            "kind": "sephora-search",
                            "matchName": pick.get("matchName"),
                            "score": pick.get("score"),
                        },
                        prior,
                    )
                    if row["discountPercent"] > 0:
                        stats["realMarkdowns"] += 1
                    stats["verifiedSephora"] += 1
                    resolved[item["id"]] = row
                    continue

        # 3) Curated known list
        known_row = known.get(item["id"])
        if known_row and known_row.get("price"):
            row = finalize(
                {
                    "id": item["id"],
                    "name": item["name"],
                    "brand": item["brand"],
                    "price": known_row["price"],
                    "listPrice": known_row.get("listPrice") or known_row["price"],
                    "onSale": False,
                    "source": known_row.get("source") or "known-msrp",
                    "kind": "known-list",
                },
                prior,
            )
            stats["knownList"] += 1
            resolved[item["id"]] = row
            continue

        # 4) Keep current selling price, clear fake discount
        keep = prior if prior and prior > 0 else 0.0
        if keep <= 0:
            keep = 0.0
        row = finalize(
            {
                "id": item["id"],
                "name": item["name"],
                "brand": item["brand"],
                "price": keep or 1.0,
                "listPrice": keep or 1.0,
                "onSale": False,
                "source": "catalog-keep-cleared",
                "kind": "cleared",
            },
            prior,
        )
        if keep <= 0:
            print(f"    warn no prior price for {item['id']}", flush=True)
        stats["clearedOnly"] += 1
        resolved[item["id"]] = row

        if (i + 1) % 25 == 0:
            CACHE.write_text(json.dumps({"sephoraSearch": sephora_cache, "shopifyJs": shopify_cache}, indent=2))

    CACHE.write_text(json.dumps({"sephoraSearch": sephora_cache, "shopifyJs": shopify_cache}, indent=2))

    apply_brand_products(products, resolved, urls, prior_for, args)
    stats = recompute_stats(resolved, previous_doc)

    payload = {
        "generated": True,
        "stats": stats,
        "products": {pid: resolved[pid] for pid in sorted(resolved)},
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, sort_keys=False) + "\n")
    print("stats", json.dumps(stats), flush=True)
    print(f"wrote {OUT_JSON}", flush=True)


if __name__ == "__main__":
    main()
