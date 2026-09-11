#!/usr/bin/env python3
"""Resolve real retailer / brand PDPs for Beauti SKUs.

Sources (JSON APIs + HEAD checks — not HTML storefront scraping):
  - Sephora catalog search JSON (`/api/v2/catalog/search`)
  - Existing official brand / Shopify product URLs from 0007 overlay
  - HEAD of candidate pages (reject Sephora `productnotcarried` redirects)

Last resort stored in SQL is a path-only Sephora/Ulta URL (no `?`).
The Worker rewrites unknowns to `search?keyword=` / Ulta `search?search=`.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import importlib.util

_spec = importlib.util.spec_from_file_location(
    "catalog_extract", ROOT / "scripts" / "resolve-real-product-images.py"
)
_mod = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(_mod)
extract_catalog = _mod.extract_catalog

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)
OUT_JSON = ROOT / "scripts" / "data" / "real-product-urls.json"
CACHE = ROOT / "scripts" / "data" / "real-product-urls.cache.json"
IMAGE_OVERLAY = ROOT / "scripts" / "data" / "real-product-images.json"

SEPHORA_SEARCH = "https://www.sephora.com/api/v2/catalog/search?type=keyword&q={q}&content=true"

ULTA_SEARCH_BRANDS = {
    "maybelline",
    "e.l.f.",
    "elf",
    "nyx",
    "essie",
    "opi",
    "l'oréal",
    "l'oreal",
    "loreal",
    "revlon",
    "cerave",
    "neutrogena",
    "olay",
    "sally hansen",
    "coty",
    "physicians formula",
    "covergirl",
    "wet n wild",
    "real techniques",
    "morphe",
    "colourpop",
    "olive & june",
    "nails inc",
    "orly",
    "the gelbottle",
    "beautyblender",
    "l'oréal paris",
    "loreal paris",
}

BRAND_ALIASES = {
    "mac": {"mac", "cosmetics"},
    "rare beauty": {"rare", "beauty", "selena", "gomez"},
    "the ordinary": {"ordinary", "deciem"},
    "nars": {"nars"},
    "fenty beauty": {"fenty"},
    "charlotte tilbury": {"charlotte", "tilbury"},
    "yves saint laurent": {"yves", "saint", "laurent", "ysl"},
    "giorgio armani": {"giorgio", "armani"},
    "estee lauder": {"estee", "lauder", "estée"},
    "lancome": {"lancome", "lancôme"},
    "l'oreal": {"loreal", "oréal", "paris"},
    "e.l.f.": {"elf"},
    "sol de janeiro": {"sol", "janeiro"},
    "drunk elephant": {"drunk", "elephant"},
    "urban decay": {"urban", "decay"},
    "too faced": {"too", "faced"},
    "pat mcgrath labs": {"pat", "mcgrath"},
    "maison margiela": {"maison", "margiela", "replica"},
    "le labo": {"le", "labo"},
    "jo malone": {"jo", "malone"},
    "carolina herrera": {"carolina", "herrera"},
    "dolce & gabbana": {"dolce", "gabbana"},
    "jean paul gaultier": {"jean", "paul", "gaultier"},
    "paco rabanne": {"paco", "rabanne", "rabanne"},
    "viktor & rolf": {"viktor", "rolf"},
    "narciso rodriguez": {"narciso", "rodriguez"},
    "maison francis kurkdjian": {"maison", "francis", "kurkdjian", "mfk"},
    "la roche-posay": {"la", "roche", "posay"},
    "kiehl's": {"kiehls", "kiehl"},
    "make up for ever": {"makeup", "forever"},
    "tower 28": {"tower"},
    "one/size": {"onesize", "one", "size"},
    "the inkey list": {"inkey"},
    "paula's choice": {"paulas", "choice", "paula"},
    "youth to the people": {"youth", "people", "yttp"},
    "beauty of joseon": {"joseon", "beauty"},
    "olive & june": {"olive", "june"},
    "bath & body works": {"bath", "body", "works"},
}

TYPE_TOKENS = {
    "lipstick", "lip", "gloss", "balm", "liner", "blush", "bronzer", "highlighter",
    "foundation", "concealer", "powder", "primer", "mascara", "brow", "eyeshadow",
    "palette", "eyeliner", "serum", "cream", "moisturizer", "cleanser", "toner",
    "sunscreen", "spf", "oil", "mask", "spray", "mist", "perfume", "parfum",
    "cologne", "eau", "elixir", "fragrance", "nail", "lacquer", "polish", "vernis",
    "curler", "tweezer", "brush", "sponge", "shampoo", "conditioner", "hair",
    "rouge",
}

PENALTY_TOKENS = {
    "mini", "travel", "gift", "set", "discovery", "sample", "duo", "trio", "kit",
}

MAKEUP_HINTS = {
    "lipstick", "lip", "rouge", "blush", "mascara", "foundation", "concealer",
    "gloss", "liner", "eyeshadow", "palette", "bronzer", "highlighter", "primer",
    "brow", "nail", "polish", "lacquer", "vernis", "eyeliner",
}
FRAGRANCE_HINTS = {"perfume", "parfum", "cologne", "eau", "fragrance", "edp", "edt"}

STOP = {
    "the", "a", "an", "and", "or", "of", "for", "with", "in", "on", "to", "by",
    "x", "ml", "oz", "size", "hr", "wear", "us", "en",
}


TYPE_GROUPS = (
    {"cream", "moisturizer", "lotion", "moisturiser"},
    {"perfume", "parfum", "fragrance", "cologne", "eau"},
    {"nail", "lacquer", "polish", "vernis"},
    {"mascara", "lash"},
    {"lipstick", "lip", "rouge"},
)


def brand_key(brand: str) -> str:
    return (
        brand.lower()
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .strip()
    )


def prefers_ulta(brand: str) -> bool:
    return brand_key(brand) in ULTA_SEARCH_BRANDS


def strip_query(url: str) -> str:
    return (url or "").strip().split("#", 1)[0].split("?", 1)[0]


def norm(text: str) -> str:
    text = text.lower().replace("®", " ").replace("™", " ").replace("’", "'").replace("·", "")
    text = re.sub(r"[^a-z0-9+%]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokens(text: str) -> set[str]:
    return {t for t in norm(text).split() if t not in STOP and len(t) > 1}


def slugify(text: str, n: int = 80) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", norm(text).replace("%", ""))
    return slug.strip("-")[:n] or "beauty"


def search_fallback_url(brand: str, name: str) -> str:
    if prefers_ulta(brand):
        b = re.sub(r"[^a-z0-9]+", "-", brand_key(brand)).strip("-") or "beauty"
        return f"https://www.ulta.com/brand/{b}"
    return f"https://www.sephora.com/search/{slugify(f'{brand} {name}')}"


def sephora_pdp_from_target(target_url: str) -> str | None:
    path = strip_query(target_url or "")
    if not path:
        return None
    if path.startswith("http"):
        url = path
    else:
        if not path.startswith("/"):
            path = "/" + path
        url = "https://www.sephora.com" + path
    if re.search(r"/product/[^?#]*-P\d+", url, re.I):
        return url
    return None


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def http_head(url: str, timeout: int = 15) -> tuple[int, str]:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA, "Accept": "*/*"})
    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=timeout) as resp:
            return int(resp.status), ""
    except urllib.error.HTTPError as e:
        loc = e.headers.get("Location") or e.headers.get("location") or ""
        return int(e.code), loc
    except Exception:
        return 0, ""


def page_ok(url: str, *, allow_403: bool = False) -> tuple[bool, int, str]:
    status, loc = http_head(url)
    loc_l = loc.lower()
    if "productnotcarried" in loc_l or "pagenotfound" in loc_l or "page-not-found" in loc_l:
        return False, status, loc
    if status == 200:
        return True, status, loc
    if status in {301, 302, 303, 307, 308}:
        if loc.startswith("/") and "sephora.com" in url:
            loc = "https://www.sephora.com" + loc
        if loc.startswith("http") and "productnotcarried" not in loc.lower():
            if status in {301, 308} and "/product/" in loc:
                return True, status, loc
            # Search bounce = dead PDP
            if "/search" in loc_l:
                return False, status, loc
            return True, status, loc
        return False, status, loc
    if allow_403 and status in {403, 405}:
        return True, status, loc
    return False, status, loc


def fetch_json(url: str, timeout: int = 25, retries: int = 3):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.sephora.com/",
        },
    )
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in {429, 503, 502} and attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(0.8 * (attempt + 1))
                continue
            raise
    raise last_err or RuntimeError("fetch failed")


def brand_match(query_brand: str, result_brand: str) -> bool:
    qb = tokens(query_brand)
    rb = tokens(result_brand)
    if not qb or not rb:
        return False
    if qb <= rb or rb <= qb:
        return True
    if qb & rb and (len(qb & rb) >= min(2, len(qb))):
        return True
    key = brand_key(query_brand)
    aliases = BRAND_ALIASES.get(key)
    generic = {"maison", "beauty", "cosmetics", "paris", "the", "la", "le"}
    if aliases:
        hit = (aliases & rb) | (aliases & {norm(result_brand)})
        if hit - generic:
            return True
    # MAC Cosmetics / Rare Beauty by Selena Gomez
    qn = norm(query_brand)
    rn = norm(result_brand)
    if qn and qn in rn:
        return True
    if rn and rn in qn and len(rn) > 4:
        return True
    return False


def core_display_name(name: str) -> str:
    cleaned = (name or "").replace("™", " ").replace("®", " ")
    return re.split(r"\s+[–—]\s+", cleaned, maxsplit=1)[0].strip()


def types_compatible(q_name: str, r_name: str) -> bool:
    qt = tokens(q_name) & TYPE_TOKENS
    rt = tokens(r_name) & TYPE_TOKENS
    if not qt or not rt:
        return True
    if qt & rt:
        return True
    for group in TYPE_GROUPS:
        if (qt & group) and (rt & group):
            return True
    return False


def name_score(q_name: str, r_name: str) -> float:
    core = core_display_name(r_name)
    qn = tokens(q_name)
    rn = tokens(core)
    if not qn or not rn:
        return 0.0
    overlap = len(qn & rn) / len(qn)
    jaccard = len(qn & rn) / len(qn | rn)
    # Parent PDP: result name is a subset of the shade-specific query
    if rn <= qn and len(rn) >= 2:
        overlap = max(overlap, 0.88)
    if qn <= rn and len(qn) >= 2:
        overlap = max(overlap, 0.8)
    extra = (rn - qn) & PENALTY_TOKENS
    penalty = 0.45 ** len(extra) if extra else 1.0
    score = max(overlap, jaccard * 1.15) * penalty
    if not types_compatible(q_name, core):
        score *= 0.3
    q_makeup = bool(qn & MAKEUP_HINTS)
    r_frag = bool(rn & FRAGRANCE_HINTS)
    q_frag = bool(qn & FRAGRANCE_HINTS)
    r_makeup = bool(rn & MAKEUP_HINTS)
    if q_makeup and r_frag and not q_frag:
        score *= 0.1
    if q_frag and r_makeup and not r_frag:
        score *= 0.1
    return float(min(score, 1.0))


def pick_sephora(brand: str, name: str, products: list[dict]) -> dict | None:
    ranked: list[tuple[float, int, dict, str]] = []
    for i, p in enumerate(products):
        rbrand = p.get("brandName") or ""
        rname = p.get("displayName") or p.get("productName") or ""
        if not brand_match(brand, rbrand):
            continue
        url = sephora_pdp_from_target(p.get("targetUrl") or p.get("url") or "")
        if not url:
            continue
        s = name_score(name, rname)
        core = core_display_name(rname)
        # Rank-1 brand hit with compatible makeup type: shade → parent PDP (MAC Ruby Woo).
        # Do not boost fragrance-only overlap (avoids MFK → unrelated "Maison …" EDPs).
        if i == 0 and s < 0.5 and types_compatible(name, core):
            distinctive = (tokens(name) - TYPE_TOKENS - STOP - FRAGRANCE_HINTS) & (
                tokens(core) - TYPE_TOKENS - STOP - FRAGRANCE_HINTS
            )
            makeup_types = tokens(name) & MAKEUP_HINTS & tokens(core)
            if s >= 0.2 and (distinctive or makeup_types):
                s = max(s, 0.52)
        ranked.append((s, i, p, url))
    if not ranked:
        return None
    ranked.sort(key=lambda row: (-row[0], row[1]))
    score, _i, prod, url = ranked[0]
    if score < 0.5:
        return None
    return {
        "url": url,
        "score": round(score, 3),
        "matchName": prod.get("displayName") or prod.get("productName"),
        "productId": prod.get("productId"),
        "brandName": prod.get("brandName"),
    }


def existing_brand_url(overlay: dict, pid: str) -> str | None:
    row = (overlay.get("products") or {}).get(pid) or {}
    url = strip_query(row.get("productUrl") or "")
    if not url.startswith("https://"):
        return None
    if "google." in url or "sephora.com/search" in url:
        return None
    if re.search(r"sephora\.com/product/", url, re.I) and not re.search(r"-P\d+", url):
        return None
    if "sephora.com" in url and re.search(r"-P\d+", url):
        return url  # already a sephora PDP
    if "ulta.com/search" in url:
        return None
    return url


def sephora_search(brand: str, name: str, cache: dict) -> list[dict]:
    q = f"{brand} {name}".strip()
    if q in cache:
        return cache[q]
    url = SEPHORA_SEARCH.format(q=urllib.parse.quote(q))
    try:
        data = fetch_json(url)
        prods = data.get("products") or []
    except Exception as e:
        print(f"    search fail {q!r}: {e}", flush=True)
        return []
    cache[q] = prods
    return prods


def classify_kind(url: str, fallback_brand: str) -> str:
    if re.search(r"sephora\.com/product/.*-P\d+", url, re.I):
        return "sephora-pdp"
    if re.search(r"ulta\.com/p/", url, re.I) and re.search(r"(pimprod|xlsImpprod|prod)\d+", url, re.I):
        return "ulta-pdp"
    if "sephora.com/search" in url:
        return "sephora-search"
    if "ulta.com/brand/" in url or "ulta.com/search" in url:
        return "ulta-search"
    if url.startswith("https://"):
        return "brand-pdp"
    return "sephora-search" if not prefers_ulta(fallback_brand) else "ulta-search"


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

    overlay = {}
    if IMAGE_OVERLAY.exists():
        overlay = json.loads(IMAGE_OVERLAY.read_text())

    cache: dict = {}
    if CACHE.exists():
        try:
            cache = json.loads(CACHE.read_text()).get("sephoraSearch") or {}
        except Exception:
            cache = {}

    resolved: dict[str, dict] = {}
    for i, p in enumerate(products):
        pid, name, brand = p["id"], p["name"], p["brand"]
        print(f"[{i+1}/{len(products)}] {pid}", flush=True)
        chosen = None
        source = None

        if not prefers_ulta(brand):
            hits = sephora_search(brand, name, cache)
            time.sleep(sleep_s)
            pick = pick_sephora(brand, name, hits)
            if pick:
                ok, status, loc = page_ok(pick["url"], allow_403=True)
                if ok:
                    chosen = pick["url"]
                    source = {
                        "kind": "sephora-pdp",
                        "source": f"sephora-api:{pick.get('productId')}",
                        "matchName": pick.get("matchName"),
                        "score": pick.get("score"),
                        "headStatus": status,
                        "headLocation": loc or None,
                    }
                else:
                    print(f"    reject {pick['url']} status={status} loc={loc}", flush=True)

        if not chosen:
            brand_url = existing_brand_url(overlay, pid)
            if brand_url:
                ok, status, loc = page_ok(brand_url, allow_403=True)
                final = loc if loc.startswith("http") and status in {301, 302, 308} else brand_url
                final = strip_query(final)
                if ok and final.startswith("https://") and "?" not in final:
                    # Prefer a live brand PDP over retailer search
                    chosen = final
                    source = {
                        "kind": classify_kind(final, brand),
                        "source": "brand-overlay",
                        "headStatus": status,
                        "headLocation": loc or None,
                    }

        if not chosen:
            chosen = search_fallback_url(brand, name)
            source = {
                "kind": classify_kind(chosen, brand),
                "source": "retailer-search-fallback",
                "headStatus": None,
            }

        resolved[pid] = {
            "id": pid,
            "name": name,
            "brand": brand,
            "productUrl": chosen,
            **(source or {}),
        }

        if (i + 1) % 25 == 0:
            CACHE.write_text(json.dumps({"sephoraSearch": cache}, indent=2))

    CACHE.write_text(json.dumps({"sephoraSearch": cache}, indent=2))

    stats = {
        "total": len(products),
        "sephoraPdp": 0,
        "ultaPdp": 0,
        "brandPdp": 0,
        "searchFallback": 0,
    }
    for row in resolved.values():
        kind = row.get("kind")
        if kind == "sephora-pdp":
            stats["sephoraPdp"] += 1
        elif kind == "ulta-pdp":
            stats["ultaPdp"] += 1
        elif kind == "brand-pdp":
            stats["brandPdp"] += 1
        else:
            stats["searchFallback"] += 1
    stats["verifiedPdp"] = stats["sephoraPdp"] + stats["ultaPdp"] + stats["brandPdp"]

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
