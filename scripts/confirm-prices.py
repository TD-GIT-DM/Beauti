#!/usr/bin/env python3
"""Re-verify Beauti sellable prices against the linked retailer JSON.

Same sources as the honest-price pass: Sephora catalog search JSON, Shopify
`/products/{handle}.js` (USD), and brand `products.json` when the linked .js
URL is gone. Does not invent markdowns and does not scrape HTML.

Writes scripts/data/confirmed-prices.json. Then:

  node scripts/generate-confirm-prices.mjs
  npm run db:migrate:local    # or db:migrate:remote
"""

from __future__ import annotations

import json
import re
import sys
import threading
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
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
strip_query = _mod.strip_query

_price_spec = importlib.util.spec_from_file_location(
    "price_resolver", ROOT / "scripts" / "resolve-honest-prices.py"
)
_price = importlib.util.module_from_spec(_price_spec)
assert _price_spec.loader is not None
_price_spec.loader.exec_module(_price)

money = _price.money
round_money = _price.round_money
sephora_product_id = _price.sephora_product_id

OUT_JSON = ROOT / "scripts" / "data" / "confirmed-prices.json"
URLS_JSON = ROOT / "scripts" / "data" / "real-product-urls.json"
LIVE_API = "https://beauti.tristan-morgenthaler.workers.dev/api/products"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
P_ID_RE = re.compile(r"(P\d+)", re.I)
HANDLE_RE = re.compile(r"/products/([^/?#]+)", re.I)
SIZE_PENALTY = {"mini", "sample", "deluxe", "travel", "gift", "set", "points", "sachet", "refill", "jumbo"}
STOP = {"the", "and", "for", "with", "eau", "parfum", "perfume"}


def discount_percent(price: float, list_price: float) -> int:
    if list_price <= 0 or price <= 0 or price >= list_price - 0.009:
        return 0
    return int(round((list_price - price) / list_price * 100))


def deal_score(price: float, list_price: float, availability: str) -> int:
    disc = discount_percent(price, list_price)
    score = 32 + disc * 1.8
    if disc <= 0:
        if price <= 15:
            score += 12
        elif price <= 28:
            score += 8
        elif price <= 45:
            score += 4
    if availability == "limited":
        score -= 6
    elif availability == "out_of_stock":
        score -= 22
    return max(8, min(99, int(round(score))))


def tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", (text or "").lower()) if len(t) > 2}


def is_mini_name(name: str) -> bool:
    n = (name or "").lower()
    return "mini" in n or "travel size" in n or "travel-size" in n


def is_phantom_range_sale(lists: list[float], sales: list[float], on_sale: bool) -> bool:
    if on_sale or not lists or not sales:
        return False
    return max(lists) > min(lists) + 0.009 and max(sales) <= min(lists) + 0.009


def pick_offer(offers: list[dict], catalog_name: str, prior: float | None) -> dict:
    name_toks = tokens(catalog_name)
    want = name_toks & SIZE_PENALTY
    pool = []
    for offer in offers:
        extra = [t for t in tokens(offer.get("title") or "") if t in SIZE_PENALTY and t not in want]
        if not extra:
            pool.append(offer)
    if not pool:
        pool = list(offers)
    shade = [t for t in name_toks if t not in SIZE_PENALTY and t not in STOP]
    if shade:
        hits = [o for o in pool if tokens(o.get("title") or "") and any(t in tokens(o.get("title") or "") for t in shade)]
        if hits and len(hits) < len(pool):
            pool = hits
    if is_mini_name(catalog_name):
        return min(pool, key=lambda o: o["price"])
    if not prior or prior <= 0:
        return pool[0]

    def dist(offer: dict) -> float:
        return min(abs(offer["price"] - prior), abs(offer["listPrice"] - prior))

    best = pool[0]
    for offer in pool[1:]:
        d = dist(offer)
        bd = dist(best)
        if d < bd - 0.009:
            best = offer
        elif abs(d - bd) <= 0.009 and abs(offer["listPrice"] - prior) <= 0.02:
            if offer["listPrice"] - offer["price"] > best["listPrice"] - best["price"] + 0.009:
                best = offer
    return best


def same_size(prior: float, candidate: float) -> bool:
    return abs(prior - candidate) <= max(3.0, candidate * 0.12)


def choose_sephora_offer(offers: list[dict], catalog_name: str, prior: float | None) -> dict:
    """Keep a mid-size price that sits inside a Sephora range. Snap to an endpoint only for the same size."""
    if is_mini_name(catalog_name):
        return min(offers, key=lambda o: o["price"])
    if len(offers) == 1:
        return offers[0]
    if not prior or prior <= 0:
        return max(offers, key=lambda o: o["listPrice"])
    lists = [o["listPrice"] for o in offers]
    lo, hi = min(lists), max(lists)
    if prior < lo - 0.51:
        return min(offers, key=lambda o: o["price"])
    if prior > hi + 0.51:
        return max(offers, key=lambda o: o["listPrice"])
    near = [o for o in offers if same_size(prior, o["price"]) or same_size(prior, o["listPrice"])]
    if near:
        best = near[0]

        def dist(offer: dict) -> float:
            return min(abs(offer["price"] - prior), abs(offer["listPrice"] - prior))

        for offer in near[1:]:
            if dist(offer) < dist(best) - 0.009:
                best = offer
            elif offer["listPrice"] - offer["price"] > best["listPrice"] - best["price"] + 0.009 and same_size(prior, offer["listPrice"]):
                best = offer
        return best
    discs = {discount_percent(o["price"], o["listPrice"]) for o in offers}
    if len(discs) == 1 and lo < prior < hi:
        disc = next(iter(discs))
        if disc > 0:
            return {"price": round_money(prior * (1 - disc / 100.0)), "listPrice": round_money(prior), "title": ""}
    return {"price": round_money(prior), "listPrice": round_money(prior), "title": ""}


def prices_from_sephora(catalog_name: str, product: dict, prior: float | None) -> dict | None:
    cs = product.get("currentSku") or {}
    lists = money(cs.get("listPrice"))
    sales = money(cs.get("salePrice"))
    on_sale = str(product.get("onSaleData") or "NONE").upper() not in {"NONE", "", "NULL"}
    if not lists and not sales:
        return None
    phantom = is_phantom_range_sale(lists, sales, on_sale)
    real_sale = (not phantom) and bool(sales) and (
        on_sale or (bool(lists) and min(sales) + 0.009 < max(lists))
    )
    if real_sale:
        ls = sorted({round_money(v) for v in (lists or sales)})
        ss = sorted({round_money(v) for v in sales})
        if len(ls) == len(ss):
            offers = [{"price": min(ss[i], listed), "listPrice": listed, "title": ""} for i, listed in enumerate(ls)]
        elif len(ls) >= 2 and len(ss) >= 2 and max(ls) > min(ls):
            lo_l, hi_l, lo_s, hi_s = min(ls), max(ls), min(ss), max(ss)
            offers = []
            for listed in ls:
                t = (listed - lo_l) / (hi_l - lo_l)
                current = lo_s + t * (hi_s - lo_s)
                offers.append({"price": round_money(min(current, listed)), "listPrice": round_money(listed), "title": ""})
        else:
            listed = ls[-1]
            offers = [{"price": round_money(min(min(ss), listed)), "listPrice": round_money(listed), "title": ""}]
        chosen = choose_sephora_offer(offers, catalog_name, prior)
        price = chosen["price"]
        listed = chosen["listPrice"]
        if price + 0.009 >= listed:
            price = listed
        return {"price": round_money(price), "listPrice": round_money(listed)}
    vals = sorted({round_money(v) for v in (lists or sales)})
    chosen = choose_sephora_offer(
        [{"price": n, "listPrice": n, "title": ""} for n in vals], catalog_name, prior
    )
    return {"price": round_money(chosen["price"]), "listPrice": round_money(chosen["price"])}


def shopify_money(raw, unit: str) -> float | None:
    if raw in (None, "", 0, "0"):
        return None
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None
    if val <= 0:
        return None
    value = val / 100.0 if unit == "cents" else val
    if value <= 0 or value >= 20_000:
        return None
    return round_money(value)


def prices_from_shopify(data: dict, catalog_name: str, prior: float | None, unit: str) -> dict | None:
    variants = data.get("variants") or []
    rows = []
    for var in variants or [data]:
        price = shopify_money(var.get("price"), unit)
        if price is None:
            continue
        compare = shopify_money(var.get("compare_at_price"), unit)
        listed = compare if compare and compare > price + 0.009 else price
        rows.append({"price": price, "listPrice": listed, "title": str(var.get("title") or var.get("option1") or "")})
    if not rows:
        return None
    chosen = pick_offer(rows, catalog_name, prior)
    return {"price": round_money(chosen["price"]), "listPrice": round_money(chosen["listPrice"])}


def near_catalog(price: float, listed: float, prior: float | None) -> bool:
    if not prior or prior <= 0:
        return True
    return abs(price - prior) / prior <= 0.45 or abs(listed - prior) / prior <= 0.45


def http_json(url: str, referer: str) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": referer,
            "Cookie": "cart_currency=USD; localization=US",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8", "replace"))
    return data if isinstance(data, dict) else None


def load_live() -> dict[str, dict]:
    try:
        data = http_json(LIVE_API, LIVE_API)
        products = (data or {}).get("products") or []
        if len(products) >= 18:
            return {p["id"]: p for p in products}
    except Exception as exc:
        print(f"live catalog unavailable ({exc}); using 0009 prices", flush=True)
    text = (ROOT / "migrations" / "0009_honest_prices.sql").read_text()
    out = {}
    for m in re.finditer(
        r"UPDATE products SET price = ([0-9.]+), list_price = ([0-9.]+).*?WHERE id = '([^']+)'",
        text,
    ):
        price = float(m.group(1))
        listed = float(m.group(2))
        out[m.group(3)] = {
            "id": m.group(3),
            "price": price,
            "listPrice": listed,
            "discountPercent": discount_percent(price, listed),
            "availability": "in_stock",
        }
    return out


def shopify_js_url(product_url: str) -> str | None:
    url = strip_query(product_url or "")
    if not url.startswith("https://"):
        return None
    if "sephora.com" in url or "ulta.com" in url or "google." in url:
        return None
    m = HANDLE_RE.search(url)
    if not m:
        return None
    parsed = urllib.parse.urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}/products/{m.group(1)}.js?currency=USD"


def fetch_sephora(brand: str, name: str, product_id: str) -> dict | None:
    def search(q: str) -> list[dict]:
        url = "https://www.sephora.com/api/v2/catalog/search?type=keyword&q=" + urllib.parse.quote(q) + "&content=true"
        try:
            data = http_json(url, "https://www.sephora.com/")
        except Exception:
            return []
        return (data or {}).get("products") or []

    hits = search(f"{brand} {name}".strip())
    for row in hits:
        if str(row.get("productId") or "") == product_id:
            return row
    for row in search(product_id):
        if str(row.get("productId") or "") == product_id:
            return row
    return None


def fetch_shop_products(origin: str) -> list[dict]:
    found: list[dict] = []
    for page in range(1, 5):
        url = f"{origin}/products.json?limit=250&page={page}&currency=USD"
        try:
            data = http_json(url, origin + "/")
        except Exception:
            break
        batch = (data or {}).get("products") or []
        found.extend(batch)
        if len(batch) < 250:
            break
    return found


def match_shop_product(name: str, brand: str, products: list[dict]) -> dict | None:
    q = tokens(f"{brand} {name}")
    best = None
    best_score = 0.0
    for product in products:
        title = str(product.get("title") or "")
        vendor = str(product.get("vendor") or "")
        t = tokens(f"{vendor} {title}")
        overlap = len(q & t)
        if overlap < 2:
            continue
        score = overlap / max(len(q), 1)
        extra = [tok for tok in tokens(title) if tok in SIZE_PENALTY and tok not in tokens(name)]
        if extra:
            score *= 0.25
        if score > best_score:
            best_score = score
            best = product
    if best is None or best_score < 0.5:
        return None
    return best


def main() -> None:
    live = load_live()
    print(f"baseline products={len(live)}", flush=True)
    urls = {}
    if URLS_JSON.exists():
        urls = json.loads(URLS_JSON.read_text()).get("products") or {}
    catalog = extract_catalog()

    sephora_jobs = {}
    shopify_jobs = []
    search_jobs = []
    for item in catalog:
        meta = urls.get(item["id"]) or {}
        kind = meta.get("kind") or ""
        product_url = meta.get("productUrl") or ""
        pid = sephora_product_id(product_url, meta.get("source"))
        if kind == "sephora-pdp" and pid:
            sephora_jobs.setdefault(pid, []).append(item)
        elif shopify_js_url(product_url):
            shopify_jobs.append(item)
        else:
            search_jobs.append(item)

    print(f"sephora pids={len(sephora_jobs)} shopify={len(shopify_jobs)} other={len(search_jobs)}", flush=True)

    def seph_worker(pair):
        pid, group = pair
        sample = group[0]
        meta = urls.get(sample["id"]) or {}
        name = meta.get("matchName") or sample["name"]
        try:
            return pid, fetch_sephora(sample["brand"], name, pid)
        except Exception as exc:
            print(f"  sephora fail {pid}: {exc}", flush=True)
            return pid, None

    sephora_hits = {}
    with ThreadPoolExecutor(8) as pool:
        for i, (pid, prod) in enumerate(pool.map(seph_worker, sephora_jobs.items())):
            sephora_hits[pid] = prod
            if (i + 1) % 40 == 0:
                print(f"  sephora {i+1}/{len(sephora_jobs)}", flush=True)

    shop_cache: dict[str, list[dict]] = {}
    shop_cache_lock = threading.Lock()

    def shop_products(origin: str) -> list[dict]:
        with shop_cache_lock:
            cached = shop_cache.get(origin)
        if cached is not None:
            return cached
        found = fetch_shop_products(origin)
        with shop_cache_lock:
            shop_cache.setdefault(origin, found)
            return shop_cache[origin]

    def shop_worker(item):
        meta = urls.get(item["id"]) or {}
        js_url = shopify_js_url(meta.get("productUrl") or "")
        prior = float((live.get(item["id"]) or {}).get("price") or 0)
        if js_url:
            try:
                data = http_json(js_url, js_url)
            except Exception:
                data = None
            if data:
                parsed = prices_from_shopify(data, item["name"], prior, "cents")
                # Exact PDP, but ignore a different size (travel vs full) posing as the SKU.
                if parsed and near_catalog(parsed["price"], parsed["listPrice"], prior):
                    return item["id"], {**parsed, "source": f"shopify-js:{js_url.split('?')[0]}", "kind": "brand-pdp"}
        # Linked .js missing: brand products.json, same shop, same size only.
        parsed_url = urllib.parse.urlparse(strip_query(meta.get("productUrl") or ""))
        if parsed_url.scheme == "https" and parsed_url.netloc and "sephora" not in parsed_url.netloc and "ulta" not in parsed_url.netloc:
            origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
            match = match_shop_product(item["name"], item["brand"], shop_products(origin))
            handle = ""
            hm = HANDLE_RE.search(meta.get("productUrl") or "")
            if hm:
                handle = hm.group(1)
            other = str((match or {}).get("handle") or "")
            shared = tokens(handle.replace("-", " ")) & tokens(other.replace("-", " "))
            overlap = len(shared) / max(len(tokens(handle.replace("-", " "))), 1) if handle else 0
            if match and overlap >= 0.45:
                parsed = prices_from_shopify(match, item["name"], prior, "dollars")
                if parsed and near_catalog(parsed["price"], parsed["listPrice"], prior):
                    return item["id"], {
                        **parsed,
                        "source": f"shopify-products:{origin}",
                        "kind": "brand-shop",
                    }
        return item["id"], None

    shopify_hits = {}
    with ThreadPoolExecutor(8) as pool:
        for pid, parsed in pool.map(shop_worker, shopify_jobs):
            shopify_hits[pid] = parsed
    print(f"  shopify quoted {sum(1 for v in shopify_hits.values() if v)}/{len(shopify_jobs)}", flush=True)

    def search_worker(item):
        try:
            hits = []
            url = "https://www.sephora.com/api/v2/catalog/search?type=keyword&q=" + urllib.parse.quote(
                f"{item['brand']} {item['name']}"
            ) + "&content=true"
            data = http_json(url, "https://www.sephora.com/")
            hits = (data or {}).get("products") or []
        except Exception:
            return item["id"], None
        pick = pick_sephora(item["brand"], item["name"], hits)
        if not pick or float(pick.get("score") or 0) < 0.62:
            return item["id"], None
        prod = next((p for p in hits if str(p.get("productId") or "") == str(pick.get("productId"))), None)
        if not prod:
            return item["id"], None
        prior = float((live.get(item["id"]) or {}).get("price") or 0)
        parsed = prices_from_sephora(item["name"], prod, prior)
        if not parsed or not near_catalog(parsed["price"], parsed["listPrice"], prior):
            return item["id"], None
        return item["id"], {**parsed, "source": f"sephora-api:{pick.get('productId')}", "kind": "sephora-search"}

    search_hits = {}
    with ThreadPoolExecutor(8) as pool:
        for i, (pid, parsed) in enumerate(pool.map(search_worker, search_jobs)):
            search_hits[pid] = parsed
            if (i + 1) % 40 == 0:
                print(f"  search {i+1}/{len(search_jobs)}", flush=True)

    resolved = {}
    stats = {
        "verified": 0,
        "verifiedSephora": 0,
        "verifiedShopify": 0,
        "unverified": 0,
        "priceFlips": 0,
        "fakeDiscountsRemoved": 0,
        "understatedRaised": 0,
        "overstatedReduced": 0,
        "unchanged": 0,
    }

    def consider(item: dict, parsed: dict | None, bucket: str) -> None:
        if not parsed:
            stats["unverified"] += 1
            return
        base = live.get(item["id"]) or {}
        prior_price = float(base.get("price") or 0)
        prior_list = float(base.get("listPrice") or prior_price or 0)
        prior_disc = int(base.get("discountPercent") or discount_percent(prior_price, prior_list))
        price = float(parsed["price"])
        listed = float(parsed["listPrice"])
        if listed + 0.009 < price:
            listed = price
        disc = discount_percent(price, listed)
        if disc <= 0:
            listed = price
            disc = 0
        availability = base.get("availability") or "in_stock"
        flipped = abs(price - prior_price) >= 0.01 or abs(listed - prior_list) >= 0.01
        fake = prior_disc > 0 and disc == 0
        raised = disc > prior_disc
        reduced = disc < prior_disc and disc > 0
        changed = flipped or fake or raised or reduced
        stats["verified"] += 1
        if bucket == "sephora":
            stats["verifiedSephora"] += 1
        else:
            stats["verifiedShopify"] += 1
        if not changed:
            stats["unchanged"] += 1
        if flipped:
            stats["priceFlips"] += 1
        if fake:
            stats["fakeDiscountsRemoved"] += 1
        if raised:
            stats["understatedRaised"] += 1
        if reduced:
            stats["overstatedReduced"] += 1
        resolved[item["id"]] = {
            "id": item["id"],
            "name": item["name"],
            "brand": item["brand"],
            "price": price,
            "listPrice": listed,
            "discountPercent": disc,
            "dealScore": deal_score(price, listed, availability),
            "availability": availability,
            "priorPrice": prior_price,
            "priorList": prior_list,
            "priorDiscount": prior_disc,
            "source": parsed.get("source"),
            "kind": parsed.get("kind"),
            "changed": changed,
            "priceFlipped": flipped,
            "fakeDiscountRemoved": fake,
            "understatedRaised": raised,
        }

    for pid, group in sephora_jobs.items():
        prod = sephora_hits.get(pid)
        for item in group:
            if not prod:
                consider(item, None, "sephora")
                continue
            prior = float((live.get(item["id"]) or {}).get("price") or 0)
            parsed = prices_from_sephora(item["name"], prod, prior)
            if parsed:
                parsed = {**parsed, "source": f"sephora-api:{pid}", "kind": "sephora-pdp"}
            consider(item, parsed, "sephora")

    for item in shopify_jobs:
        consider(item, shopify_hits.get(item["id"]), "shopify")
    for item in search_jobs:
        hit = search_hits.get(item["id"])
        consider(item, hit, "sephora" if hit and str(hit.get("kind", "")).startswith("sephora") else "shopify")

    payload = {"generated": True, "stats": stats, "products": {pid: resolved[pid] for pid in sorted(resolved)}}
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n")
    print("stats", json.dumps(stats), flush=True)
    print(f"wrote {OUT_JSON}", flush=True)


if __name__ == "__main__":
    main()
