#!/usr/bin/env python3
"""Refresh Beauti availability from verified JSON sources (not HTML scraping).

Same family as honest prices / URLs:
  - Sephora catalog search JSON (`/api/v2/catalog/search`)
  - Sephora product JSON when the search card omits `isOutOfStock`
  - Shopify public product JSON (`/products/{handle}.js` or `/products.json`)

Does not invent stock. Search cards that omit stock flags are unknown unless a
Shopify catalog match (or product JSON) provides an explicit `available` /
`isOutOfStock` boolean.

Writes scripts/data/availability.json. Then:
  node scripts/generate-availability.mjs  →  migrations/0010_sync_availability.sql
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


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


url_mod = _load("url_resolver", ROOT / "scripts" / "resolve-real-product-urls.py")
img_mod = _load("img_resolver", ROOT / "scripts" / "resolve-real-product-images.py")
price_mod = _load("price_resolver", ROOT / "scripts" / "resolve-honest-prices.py")

extract_catalog = url_mod.extract_catalog
fetch_json = url_mod.fetch_json
sephora_search = url_mod.sephora_search
strip_query = url_mod.strip_query
score_match = img_mod.score_match
load_shopify_catalogs = img_mod.load_shopify_catalogs
shopify_js_url = price_mod.shopify_js_url
sephora_product_id = price_mod.sephora_product_id
find_sephora_by_id = price_mod.find_sephora_by_id
deal_score = price_mod.deal_score
prices_from_sephora_product = price_mod.prices_from_sephora_product
prices_from_shopify_js = price_mod.prices_from_shopify_js

OUT_JSON = ROOT / "scripts" / "data" / "availability.json"
CACHE = ROOT / "scripts" / "data" / "availability.cache.json"
URLS_JSON = ROOT / "scripts" / "data" / "real-product-urls.json"
PRICES_JSON = ROOT / "scripts" / "data" / "honest-prices.json"

P_ID_RE = re.compile(r"-P(\d+)", re.I)


def boolish(raw):
    if raw is True or raw == "true" or raw == 1:
        return True
    if raw is False or raw == "false" or raw == 0:
        return False
    return None


def first_string(*vals) -> str | None:
    for v in vals:
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def format_restock(raw: str) -> str:
    raw = raw.strip()
    if re.match(r"^\d{4}-\d{2}", raw):
        try:
            from datetime import datetime

            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt.strftime("%B %Y")
        except Exception:
            return raw[:80]
    return raw[:80]


def restock_from_record(record: dict | None) -> str | None:
    if not record:
        return None
    nested = record.get("actionFlags") if isinstance(record.get("actionFlags"), dict) else {}
    raw = first_string(
        record.get("replenishmentDate"),
        record.get("replenishmentStatus"),
        record.get("availableDate"),
        record.get("expectedDeliveryDate"),
        record.get("backInStockDate"),
        nested.get("backInStockDate") if nested else None,
        nested.get("replenishmentDate") if nested else None,
    )
    if not raw:
        return None
    lower = raw.lower()
    if lower in {"out of stock", "none", "null"}:
        return None
    return format_restock(raw)


def stock_from_sephora(product: dict | None) -> dict | None:
    """Explicit Sephora flags only. Search cards that omit isOutOfStock → None."""
    if not product:
        return None
    cs = product.get("currentSku") or {}
    oos = boolish(cs.get("isOutOfStock"))
    if oos is None:
        oos = boolish(product.get("isOutOfStock"))
    few = (
        boolish(cs.get("isOnlyFewLeft")) is True
        or boolish(product.get("isOnlyFewLeft")) is True
        or boolish(cs.get("isGoingFast")) is True
        or boolish(product.get("isGoingFast")) is True
    )
    coming = boolish(cs.get("isComingSoon")) is True or boolish(product.get("isComingSoon")) is True
    restock = restock_from_record(cs) or restock_from_record(product)
    if coming and oos is not False:
        return {
            "availability": "out_of_stock",
            "restockEstimate": restock or "coming soon",
            "source": "sephora-api",
            "explicit": True,
        }
    if oos is True:
        return {
            "availability": "out_of_stock",
            "restockEstimate": restock,
            "source": "sephora-api",
            "explicit": True,
        }
    if few and oos is not True:
        return {
            "availability": "limited",
            "restockEstimate": None,
            "source": "sephora-api",
            "explicit": True,
        }
    if oos is False:
        return {
            "availability": "in_stock",
            "restockEstimate": None,
            "source": "sephora-api",
            "explicit": True,
        }

    children = list(product.get("regularChildSkus") or []) + list(product.get("childSkus") or [])
    if children:
        yes = no = 0
        for sku in children:
            flag = boolish(sku.get("isOutOfStock"))
            if flag is True:
                no += 1
            elif flag is False:
                yes += 1
        if yes + no:
            if yes == 0:
                return {
                    "availability": "out_of_stock",
                    "restockEstimate": restock,
                    "source": "sephora-api",
                    "explicit": True,
                }
            if no:
                return {
                    "availability": "limited",
                    "restockEstimate": None,
                    "source": "sephora-api",
                    "explicit": True,
                }
            return {
                "availability": "in_stock",
                "restockEstimate": None,
                "source": "sephora-api",
                "explicit": True,
            }
    return None


def stock_from_shopify(data: dict | None, catalog_name: str = "", matched_variant: dict | None = None) -> dict | None:
    if not data:
        return None
    if matched_variant is not None and isinstance(matched_variant.get("available"), bool):
        avail = matched_variant["available"]
        return {
            "availability": "in_stock" if avail else "out_of_stock",
            "restockEstimate": None,
            "source": "shopify-js",
            "explicit": True,
        }
    variants = data.get("variants") or []
    rows = [v for v in variants if isinstance(v.get("available"), bool)]
    if rows:
        name_l = (catalog_name or "").lower()
        mini = any(tok in name_l for tok in ("mini", "travel size", "travel-size"))
        matched = rows
        if mini:
            mini_vars = [v for v in rows if re.search(r"mini|travel", str(v.get("title") or v.get("option1") or ""), re.I)]
            if mini_vars:
                matched = mini_vars
        yes = sum(1 for v in matched if v.get("available") is True)
        if yes == 0:
            return {
                "availability": "out_of_stock",
                "restockEstimate": None,
                "source": "shopify-js",
                "explicit": True,
            }
        if yes < len(matched):
            return {
                "availability": "limited",
                "restockEstimate": None,
                "source": "shopify-js",
                "explicit": True,
            }
        return {
            "availability": "in_stock",
            "restockEstimate": None,
            "source": "shopify-js",
            "explicit": True,
        }
    top = boolish(data.get("available"))
    if top is None:
        return None
    return {
        "availability": "in_stock" if top else "out_of_stock",
        "restockEstimate": None,
        "source": "shopify-js",
        "explicit": True,
    }


def deal_score_with_avail(price: float, list_price: float, availability: str) -> int:
    score = deal_score(price, list_price)
    if availability == "limited":
        score -= 6
    elif availability == "out_of_stock":
        score -= 22
    return max(8, min(99, int(score)))


def extract_seed_availability() -> dict[str, tuple[str, str | None]]:
    """Prior availability from insert migrations (0002/0004/0006). Default in_stock."""
    prior: dict[str, tuple[str, str | None]] = {}
    pattern = re.compile(
        r"\(\s*'([^']+)',[\s\S]*?,\s*\d+,\s*'(in_stock|out_of_stock|limited)',\s*(NULL|'[^']*')",
        re.I,
    )
    for name in ("0002_seed.sql", "0004_expand_catalog.sql", "0006_perfume_makeup_expand.sql"):
        text = (ROOT / "migrations" / name).read_text()
        for m in pattern.finditer(text):
            pid = m.group(1)
            if pid in prior:
                continue
            rest = m.group(3)
            restock = None if rest == "NULL" else rest.strip("'")
            prior[pid] = (m.group(2), restock)
    return prior


def sephora_product_json(product_id: str, sku_id: str | None, timeout: int = 4) -> dict | None:
    qs = urllib.parse.urlencode({"countryCode": "US", "loc": "en-US", **({"preferedSku": sku_id} if sku_id else {})})
    url = f"https://www.sephora.com/api/v2/catalog/products/{product_id}?{qs}"
    try:
        data = fetch_json(url, timeout=timeout, retries=1)
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    if data.get("currentSku") or data.get("productId") or data.get("regularChildSkus"):
        return data
    if isinstance(data.get("product"), dict):
        return data["product"]
    return None


def main() -> None:
    limit = None
    sleep_s = 0.12
    skip_shops = False
    args = sys.argv[1:]
    if "--limit" in args:
        limit = int(args[args.index("--limit") + 1])
    if "--sleep" in args:
        sleep_s = float(args[args.index("--sleep") + 1])
    if "--skip-shopify-shops" in args:
        skip_shops = True

    products = extract_catalog()
    if limit:
        products = products[:limit]
    print(f"catalog products={len(products)}", flush=True)

    urls = {}
    if URLS_JSON.exists():
        urls = json.loads(URLS_JSON.read_text()).get("products") or {}
    prices = {}
    if PRICES_JSON.exists():
        prices = json.loads(PRICES_JSON.read_text()).get("products") or {}
    prior_avail = extract_seed_availability()

    cache: dict = {}
    if CACHE.exists():
        try:
            cache = json.loads(CACHE.read_text())
        except Exception:
            cache = {}
    sephora_cache = cache.get("sephoraSearch") or {}
    shopify_js_cache = cache.get("shopifyJs") or {}

    by_pid: dict[str, list[dict]] = defaultdict(list)
    others: list[dict] = []
    for p in products:
        meta = urls.get(p["id"]) or {}
        product_id = sephora_product_id(meta.get("productUrl") or "", meta.get("source"))
        row = {**p, "meta": meta, "productId": product_id}
        if meta.get("kind") == "sephora-pdp" and product_id:
            by_pid[product_id].append(row)
        else:
            others.append(row)

    sephora_hits: dict[str, dict] = {}
    unique_pids = list(by_pid.keys())
    for i, product_id in enumerate(unique_pids):
        group = by_pid[product_id]
        sample = group[0]
        print(f"[sephora {i+1}/{len(unique_pids)}] {product_id}", flush=True)
        q_name = sample["meta"].get("matchName") or sample["name"]
        q = f"{sample['brand']} {q_name}".strip()
        cached = q in sephora_cache
        hits = sephora_search(sample["brand"], q_name, sephora_cache)
        if not cached:
            time.sleep(sleep_s)
        prod = find_sephora_by_id(hits, product_id)
        if not prod:
            q2 = f"Sephora {product_id}"
            cached2 = q2 in sephora_cache
            hits2 = sephora_search("Sephora", product_id, sephora_cache)
            if not cached2:
                time.sleep(sleep_s * 0.5)
            prod = find_sephora_by_id(hits2, product_id)
        if prod:
            sephora_hits[product_id] = prod
        if (i + 1) % 40 == 0:
            CACHE.write_text(json.dumps({"sephoraSearch": sephora_cache, "shopifyJs": shopify_js_cache}, indent=2))

    shopify_catalog: list[dict] = []
    shop_cache_path = ROOT / "scripts" / "data" / "availability.shopify.cache.json"
    if not skip_shops:
        if shop_cache_path.exists() and "--refresh-shops" not in args:
            try:
                shopify_catalog = json.loads(shop_cache_path.read_text())
                print(f"shopify catalog cache items={len(shopify_catalog)}", flush=True)
            except Exception:
                shopify_catalog = []
        if not shopify_catalog:
            print("loading brand Shopify catalogs (products.json)…", flush=True)
            loaded = load_shopify_catalogs()
            shopify_catalog = []
            for item in loaded:
                variants = item.get("variants") or []
                shopify_catalog.append(
                    {
                        "shop": item.get("shop"),
                        "title": item.get("title"),
                        "handle": item.get("handle"),
                        "vendor": item.get("vendor"),
                        "variants": variants,
                        "raw": {
                            "title": item.get("title"),
                            "handle": item.get("handle"),
                            "vendor": item.get("vendor"),
                            "available": (item.get("raw") or {}).get("available"),
                            "variants": variants,
                        },
                    }
                )
            shop_cache_path.write_text(json.dumps(shopify_catalog))
            print(f"shopify catalog items={len(shopify_catalog)}", flush=True)

    resolved: dict[str, dict] = {}
    stats = {
        "total": len(products),
        "verifiedSephora": 0,
        "verifiedShopify": 0,
        "unverified": 0,
        "inStock": 0,
        "outOfStock": 0,
        "limited": 0,
        "flippedToInStock": 0,
        "flippedToOutOfStock": 0,
        "flippedOther": 0,
    }

    def record(item: dict, stock: dict, extra: dict | None = None) -> None:
        pid = item["id"]
        avail = stock["availability"]
        restock = stock.get("restockEstimate") if avail == "out_of_stock" else None
        price_row = prices.get(pid) or {}
        price = float(price_row.get("price") or 0) or None
        listed = float(price_row.get("listPrice") or price or 0) or price
        if extra and extra.get("price"):
            price = extra["price"]
            listed = extra.get("listPrice") or price
        if not price:
            price = listed = 1.0
        prev_avail, prev_restock = prior_avail.get(pid, ("in_stock", None))
        flipped = prev_avail != avail
        if flipped and prev_avail == "out_of_stock" and avail in {"in_stock", "limited"}:
            stats["flippedToInStock"] += 1
        elif flipped and prev_avail != "out_of_stock" and avail == "out_of_stock":
            stats["flippedToOutOfStock"] += 1
        elif flipped:
            stats["flippedOther"] += 1
        if avail == "in_stock":
            stats["inStock"] += 1
        elif avail == "out_of_stock":
            stats["outOfStock"] += 1
        else:
            stats["limited"] += 1
        src = stock.get("source") or ""
        if src.startswith("sephora"):
            stats["verifiedSephora"] += 1
        else:
            stats["verifiedShopify"] += 1
        resolved[pid] = {
            "id": pid,
            "name": item["name"],
            "brand": item["brand"],
            "availability": avail,
            "restockEstimate": restock,
            "source": src,
            "kind": extra.get("kind") if extra else stock.get("kind"),
            "explicit": True,
            "priorAvailability": prev_avail,
            "priorRestockEstimate": prev_restock,
            "flipped": flipped,
            "price": price,
            "listPrice": listed,
            "dealScore": deal_score_with_avail(price, listed or price, avail),
        }

    def try_shopify_js(item: dict) -> dict | None:
        meta = item.get("meta") or {}
        js_url = shopify_js_url(meta.get("productUrl") or "")
        if not js_url:
            return None
        if js_url in shopify_js_cache:
            data = shopify_js_cache[js_url]
        else:
            try:
                data = fetch_json(js_url)
            except Exception as exc:
                print(f"    shopify fail {js_url}: {exc}", flush=True)
                data = None
            shopify_js_cache[js_url] = data
            time.sleep(sleep_s)
        if not data:
            return None
        stock = stock_from_shopify(data, item["name"])
        if not stock:
            return None
        parsed = prices_from_shopify_js(data, item["name"])
        record(
            item,
            {**stock, "source": f"shopify-js:{js_url}", "kind": "brand-pdp"},
            {"kind": "brand-pdp", **(parsed or {})},
        )
        return stock

    TYPE_STOP = {
        "lipstick", "lip", "blush", "cream", "oil", "tint", "balm", "serum",
        "mascara", "foundation", "concealer", "palette", "perfume", "parfum",
        "cologne", "fragrance", "gloss", "liner", "powder", "primer", "mist",
        "spray", "eau", "the", "and", "with", "for", "mini", "travel",
    }
    PENALTY = {
        "mini", "sample", "deluxe", "travel", "gift", "set", "points",
        "passport", "candle", "wash", "discovery", "refill", "pouch",
    }

    def title_tokens(text: str) -> set[str]:
        return {t for t in re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).split() if len(t) > 2}

    def try_shopify_catalog(item: dict) -> dict | None:
        if not shopify_catalog:
            return None
        our_toks = title_tokens(item["name"])
        distinctive = our_toks - title_tokens(item["brand"]) - TYPE_STOP
        want_penalty = our_toks & PENALTY
        ranked: list[tuple[float, dict, dict | None]] = []
        for shop_item in shopify_catalog:
            s, var = score_match(item, shop_item)
            if s < 0.45:
                continue
            title = shop_item.get("title") or ""
            extra_pen = title_tokens(title) & PENALTY - want_penalty
            if extra_pen:
                s *= 0.25
            if distinctive:
                hit = len(
                    distinctive
                    & (title_tokens(title) | title_tokens(str((var or {}).get("title") or "")))
                )
                if hit == 0:
                    s *= 0.35
                else:
                    s += 0.12 * hit
            if s >= 0.5:
                ranked.append((s, shop_item, var))
        if not ranked:
            return None
        ranked.sort(key=lambda row: -row[0])
        full = [
            row
            for row in ranked
            if not (title_tokens(row[1].get("title") or "") & PENALTY - want_penalty)
        ]
        use = full or ranked[:8]
        flags: list[bool] = []
        for _s, shop_item, var in use[:12]:
            raw = shop_item.get("raw") or shop_item
            if (
                var is not None
                and isinstance(var.get("available"), bool)
                and distinctive
                and distinctive & title_tokens(str(var.get("title") or ""))
            ):
                flags.append(bool(var["available"]))
                continue
            variants = raw.get("variants") or shop_item.get("variants") or []
            rows = [bool(v.get("available")) for v in variants if isinstance(v.get("available"), bool)]
            if rows:
                flags.extend(rows)
            elif isinstance(raw.get("available"), bool):
                flags.append(bool(raw["available"]))
        if not flags:
            return None
        yes = sum(1 for f in flags if f)
        # Parent / shade-range SKU: purchasable if any matching listing is in stock.
        avail = "in_stock" if yes else "out_of_stock"
        stock = {
            "availability": avail,
            "restockEstimate": None,
            "source": f"shopify-products:{use[0][1].get('shop')}",
            "explicit": True,
            "kind": "brand-shopify",
        }
        best = use[0][1]
        record(
            item,
            stock,
            {"kind": "brand-shopify", "score": round(use[0][0], 3), "match": best.get("title")},
        )
        resolved[item["id"]]["matchName"] = best.get("title")
        resolved[item["id"]]["score"] = round(use[0][0], 3)
        return stock

    product_json_alive = True
    product_json_fails = 0
    for product_id, group in by_pid.items():
        prod = sephora_hits.get(product_id)
        sku_id = ((prod or {}).get("currentSku") or {}).get("skuId")
        detailed = None
        # Product JSON is often 403 from this network; give up after a short fail streak.
        if product_json_alive:
            detailed = sephora_product_json(product_id, sku_id)
            if detailed is None:
                product_json_fails += 1
                if product_json_fails >= 5:
                    product_json_alive = False
                    print("sephora product JSON unavailable; continuing with search + Shopify", flush=True)
            else:
                product_json_fails = 0
        sephora_stock = stock_from_sephora(detailed) or stock_from_sephora(prod)
        for item in group:
            if item["id"] in resolved:
                continue
            if sephora_stock:
                parsed = None
                src_prod = detailed or prod
                if src_prod:
                    parsed = prices_from_sephora_product(item["name"], src_prod, None)
                record(
                    item,
                    {**sephora_stock, "source": f"sephora-api:{product_id}", "kind": "sephora-pdp"},
                    {"kind": "sephora-pdp", **(parsed or {})},
                )
                continue
            if try_shopify_js(item):
                continue
            if try_shopify_catalog(item):
                continue
            stats["unverified"] += 1
            prev_avail, prev_restock = prior_avail.get(item["id"], ("in_stock", None))
            resolved[item["id"]] = {
                "id": item["id"],
                "name": item["name"],
                "brand": item["brand"],
                "availability": prev_avail,
                "restockEstimate": prev_restock,
                "source": "unverified-keep",
                "kind": "unverified",
                "explicit": False,
                "priorAvailability": prev_avail,
                "priorRestockEstimate": prev_restock,
                "flipped": False,
            }

    for i, item in enumerate(others):
        if item["id"] in resolved:
            continue
        print(f"[other {i+1}/{len(others)}] {item['id']}", flush=True)
        if try_shopify_js(item):
            continue
        meta = item.get("meta") or {}
        q = f"{item['brand']} {item['name']}".strip()
        cached = q in sephora_cache
        hits = sephora_search(item["brand"], item["name"], sephora_cache)
        if not cached:
            time.sleep(sleep_s)
        pick_id = sephora_product_id(meta.get("productUrl") or "", meta.get("source"))
        prod = find_sephora_by_id(hits, pick_id) if pick_id else None
        sephora_stock = stock_from_sephora(prod)
        if sephora_stock:
            parsed = prices_from_sephora_product(item["name"], prod, None) if prod else None
            record(
                item,
                {**sephora_stock, "source": f"sephora-api:{pick_id or 'search'}", "kind": "sephora-search"},
                {"kind": "sephora-search", **(parsed or {})},
            )
            continue
        if try_shopify_catalog(item):
            continue
        stats["unverified"] += 1
        prev_avail, prev_restock = prior_avail.get(item["id"], ("in_stock", None))
        resolved[item["id"]] = {
            "id": item["id"],
            "name": item["name"],
            "brand": item["brand"],
            "availability": prev_avail,
            "restockEstimate": prev_restock,
            "source": "unverified-keep",
            "kind": "unverified",
            "explicit": False,
            "priorAvailability": prev_avail,
            "priorRestockEstimate": prev_restock,
            "flipped": False,
        }

        if (i + 1) % 25 == 0:
            CACHE.write_text(json.dumps({"sephoraSearch": sephora_cache, "shopifyJs": shopify_js_cache}, indent=2))

    CACHE.write_text(json.dumps({"sephoraSearch": sephora_cache, "shopifyJs": shopify_js_cache}, indent=2))

    stats["verified"] = stats["verifiedSephora"] + stats["verifiedShopify"]
    stats["flipped"] = stats["flippedToInStock"] + stats["flippedToOutOfStock"] + stats["flippedOther"]

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
