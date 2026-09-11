#!/usr/bin/env python3
"""Refresh Beauti catalog prices from verified JSON sources (not HTML scraping).

Sources, same family as the URL resolver:
  - Sephora catalog search JSON (`/api/v2/catalog/search`)
  - Shopify public product JSON (`/products/{handle}.js` or `/products.json`)
  - Curated known list prices in scripts/data/known-list-prices.json

Writes scripts/data/honest-prices.json. Then:
  node scripts/generate-honest-prices.mjs  →  migrations/0009_honest_prices.sql
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
    """Shopify `/products/{handle}.js` stores money as integer cents."""
    if raw in (None, "", 0, "0"):
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        parsed = money(raw)
        return parsed[0] if parsed else None
    if val <= 0:
        return None
    return round(val / 100.0, 2)


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


def pick_from_range(values: list[float], catalog_name: str, prior: float | None) -> float:
    """Choose a size that matches the catalog SKU — never pair a mini with a jumbo."""
    uniq = sorted({round_money(v) for v in values})
    lo, hi = uniq[0], uniq[-1]
    if is_mini_name(catalog_name):
        return lo
    if prior is None:
        return hi
    if prior < lo - 0.51:
        return lo  # catalog was below every real size — use lowest found
    if prior > hi + 0.51:
        return hi
    # Prior sits on the PDP range: snap to a listed endpoint when it is clearly
    # the same size, otherwise keep the mid-size (e.g. 50ml between travel and 100ml).
    nearest = min(uniq, key=lambda v: abs(v - prior))
    if abs(nearest - prior) <= max(3.0, nearest * 0.12):
        return nearest
    return round_money(prior)


def prices_from_sephora_product(catalog_name: str, product: dict, prior: float | None = None) -> dict | None:
    cs = product.get("currentSku") or {}
    list_vals = money(cs.get("listPrice"))
    sale_vals = money(cs.get("salePrice"))
    on_sale = str(product.get("onSaleData") or "NONE").upper() not in {"NONE", "", "NULL"}
    if not list_vals and not sale_vals:
        return None

    real_sale = bool(sale_vals) and (on_sale or (list_vals and min(sale_vals) + 0.009 < max(list_vals)))
    if real_sale:
        lists = sorted(list_vals) if list_vals else sorted(sale_vals)
        sales = sorted(sale_vals)
        if len(lists) == len(sales) and len(lists) >= 1:
            listed = pick_from_range(lists, catalog_name, prior)
            # pair the same size index
            idx = min(range(len(lists)), key=lambda i: abs(lists[i] - listed))
            listed = lists[idx]
            current = sales[idx]
        else:
            listed = pick_from_range(lists, catalog_name, prior)
            # proportional sale when only endpoints are published
            if len(lists) >= 2 and len(sales) >= 2 and (max(lists) - min(lists)) > 0:
                t = (listed - min(lists)) / (max(lists) - min(lists))
                current = min(sales) + t * (max(sales) - min(sales))
            else:
                current = min(sales)
        if current > listed:
            current = listed
        return {
            "price": round_money(current),
            "listPrice": round_money(listed),
            "onSale": listed > current + 0.009,
            "listPriceRaw": cs.get("listPrice"),
            "salePriceRaw": cs.get("salePrice"),
            "onSaleData": product.get("onSaleData"),
        }

    if not list_vals:
        current = pick_from_range(sale_vals, catalog_name, prior)
        return {
            "price": round_money(current),
            "listPrice": round_money(current),
            "onSale": False,
            "listPriceRaw": cs.get("listPrice"),
            "salePriceRaw": cs.get("salePrice"),
            "onSaleData": product.get("onSaleData"),
        }

    current = pick_from_range(list_vals, catalog_name, prior)
    return {
        "price": round_money(current),
        "listPrice": round_money(current),
        "onSale": False,
        "listPriceRaw": cs.get("listPrice"),
        "salePriceRaw": cs.get("salePrice"),
        "onSaleData": product.get("onSaleData"),
    }


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


def prices_from_shopify_js(data: dict, catalog_name: str) -> dict | None:
    variants = data.get("variants") or []
    if not variants:
        price = shopify_cents(data.get("price"))
        compare = shopify_cents(data.get("compare_at_price"))
        if price is None:
            return None
        listed = compare if compare and compare > price else price
        return {"price": price, "listPrice": listed, "onSale": listed > price + 0.009, "variants": 0}

    rows: list[tuple[float, float]] = []
    for var in variants:
        price = shopify_cents(var.get("price"))
        if price is None:
            continue
        compare = shopify_cents(var.get("compare_at_price"))
        listed = compare if compare and compare > price else price
        rows.append((price, listed))
    if not rows:
        return None

    name_l = (catalog_name or "").lower()
    mini = any(tok in name_l for tok in ("mini", "travel size", "travel-size"))
    # Lowest found current selling price; for full-size names prefer the
    # highest in-stock variant so we do not advertise a mini as the hero SKU.
    if mini:
        price, listed = min(rows, key=lambda r: r[0])
    else:
        # Prefer the most common full-size: highest current price that is not a jumbo outlier
        prices = sorted({r[0] for r in rows})
        price = prices[-1]
        listed = max(r[1] for r in rows if r[0] == price)
    return {
        "price": round_money(price),
        "listPrice": round_money(listed if listed >= price else price),
        "onSale": listed > price + 0.009,
        "variants": len(rows),
    }


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


def main() -> None:
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
            prior = prior_prices.get(item["id"])
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
        prior = prior_prices.get(item["id"])
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
            if shopify_data:
                parsed = prices_from_shopify_js(shopify_data, item["name"])
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

    stats["verified"] = stats["verifiedSephora"] + stats["verifiedShopify"] + stats["knownList"]
    stats["clearedDiscounts"] = sum(1 for r in resolved.values() if r["discountPercent"] == 0)

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
