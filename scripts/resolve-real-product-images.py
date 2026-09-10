#!/usr/bin/env python3
"""Resolve official product pack-shot URLs from documented public APIs/CDNs.

Sources (no HTML storefront scraping):
  - Brand Shopify products.json (documented Storefront resource)
  - MAC/ELC sdcdn.io pack-shot path pattern
  - Wikimedia Commons API
  - Known Sephora / Ulta image CDN path patterns (SKU → URL)
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UA = "BeautiCatalogImageCheck/1.0 (+https://github.com/TD-GIT-DM/Beauti)"
OUT_JSON = ROOT / "scripts" / "data" / "real-product-images.json"
OUT_SQL = ROOT / "migrations" / "0007_real_product_images.sql"

SHOPIFY_SHOPS = [
    "https://www.rarebeauty.com",
    "https://www.soldejaneiro.com",
    "https://www.summerfridays.com",
    "https://gisou.com",
    "https://www.glossier.com",
    "https://tower28beauty.com",
    "https://saiehello.com",
    "https://www.rhodeskin.com",
    "https://fentybeauty.com",
    "https://www.meritbeauty.com",
    "https://iliabeauty.com",
    "https://www.milkmakeup.com",
    "https://theouai.com",
    "https://www.kayali.com",
    "https://hudabeauty.com",
    "https://patrickta.com",
    "https://westman-atelier.com",
    "https://kosas.com",
    "https://www.hauslabs.com",
    "https://elfcosmetics.com",
    "https://colourpop.com",
    "https://oliveandjune.com",
    "https://glowrecipe.com",
    "https://olaplex.com",
    "https://patternbeauty.com",
    "https://www.livingproof.com",
    "https://colorwowhair.com",
    "https://snif.co",
    "https://ellisbrooklyn.com",
    "https://www.nestnewyork.com",
    "https://commodityfragrances.com",
    "https://dedcool.com",
    "https://www.skylar.com",
    "https://onesizebeauty.com",
    "https://thrivecausemetics.com",
    "https://refybeauty.com",
    "https://makeupbymario.com",
    "https://www.natashadenona.com",
    "https://juviasplace.com",
    "https://www.cirquecolors.com",
    "https://theinkeylist.com",
    "https://naturium.com",
    "https://www.peachandlily.com",
    "https://beautyofjoseon.com",
    "https://www.cosrx.com",
    "https://www.sundayriley.com",
    "https://supergoop.com",
    "https://www.tatcha.com",
    "https://www.anastasiabeverlyhills.com",
    "https://kyliecosmetics.com",
    "https://www.diptyqueparis.com",
    "https://amika.com",
    "https://www.paulaschoice.com",
    "https://goodmolecules.com",
    "https://www.youthtothepeople.com",
    "https://www.mae-love.com",
    "https://maelove.com",
    "https://www.olehenriksen.com",
    "https://www.beautyblender.com",
    "https://www.realtechniques.com",
    "https://morphe.com",
    "https://www.tweezerman.com",
    "https://www.ghdhair.com",
    "https://www.lisaeldridge.com",
    "https://www.hourglasscosmetics.com",
    "https://www.stila.com",
    "https://www.stilacosmetics.com",
    "https://www.rmsbeauty.com",
    "https://www.philosophyskincare.com",
    "https://www.cleanreserve.com",
    "https://fineryfragrance.com",
    "https://www.lattafa.com",
    "https://www.juliettehasagun.com",
    "https://www.escentric.com",
    "https://www.parfums-de-marly.com",
    "https://www.kilianparis.com",
    "https://www.creedboutique.com",
    "https://www.fredericmalle.com",
    "https://www.initio-parfums.com",
    "https://nishane.com",
    "https://www.amouage.com",
    "https://www.xerjoff.com",
    "https://www.maisonfranciskurkdjian.com",
]

# Brand aliases → tokens used when matching a Shopify catalog product
BRAND_ALIASES = {
    "rare beauty": ["rare beauty", "rarebeauty"],
    "sol de janeiro": ["sol de janeiro", "soldejaneiro"],
    "summer fridays": ["summer fridays"],
    "gisou": ["gisou"],
    "glossier": ["glossier"],
    "tower 28": ["tower 28", "tower28"],
    "saie": ["saie"],
    "rhode": ["rhode"],
    "fenty beauty": ["fenty"],
    "fenty skin": ["fenty"],
    "merit": ["merit"],
    "ilia": ["ilia"],
    "milk makeup": ["milk"],
    "ouai": ["ouai"],
    "kayali": ["kayali"],
    "huda beauty": ["huda"],
    "patrick ta": ["patrick ta"],
    "westman atelier": ["westman"],
    "kosas": ["kosas"],
    "haus labs": ["haus"],
    "e.l.f.": ["e.l.f", "elf"],
    "colourpop": ["colourpop", "colour pop"],
    "olive & june": ["olive"],
    "glow recipe": ["glow recipe"],
    "olaplex": ["olaplex"],
    "pattern": ["pattern"],
    "living proof": ["living proof"],
    "color wow": ["color wow"],
    "snif": ["snif"],
    "ellis brooklyn": ["ellis"],
    "nest new york": ["nest"],
    "commodity": ["commodity"],
    "dedcool": ["dedcool", "ded cool"],
    "skylar": ["skylar"],
    "one/size": ["one size", "onesize", "one/size"],
    "thrive causemetics": ["thrive"],
    "refy": ["refy"],
    "makeup by mario": ["mario"],
    "natasha denona": ["natasha"],
    "juvia's place": ["juvia"],
    "cirque colors": ["cirque"],
    "the inkey list": ["inkey"],
    "naturium": ["naturium"],
    "peach & lily": ["peach"],
    "beauty of joseon": ["joseon"],
    "cosrx": ["cosrx"],
    "sunday riley": ["sunday riley"],
    "supergoop": ["supergoop"],
    "tatcha": ["tatcha"],
    "anastasia beverly hills": ["anastasia", "abh"],
    "kylie cosmetics": ["kylie"],
    "diptyque": ["diptyque"],
    "amika": ["amika"],
    "paula's choice": ["paula"],
    "good molecules": ["good molecules"],
    "youth to the people": ["youth to the people", "yttp"],
    "maelove": ["maelove", "mae love"],
    "ole henriksen": ["ole henriksen"],
    "beautyblender": ["beautyblender"],
    "real techniques": ["real techniques"],
    "morphe": ["morphe"],
    "tweezerman": ["tweezerman"],
    "ghd": ["ghd"],
    "lisa eldridge": ["lisa eldridge"],
    "hourglass": ["hourglass"],
    "stila": ["stila"],
    "rms beauty": ["rms"],
    "philosophy": ["philosophy"],
    "clean": ["clean reserve", "clean"],
    "fine'ry": ["finery", "fine'ry"],
    "lattafa": ["lattafa"],
    "juliette has a gun": ["juliette"],
    "escentric molecules": ["escentric", "molecule"],
    "parfums de marly": ["marly", "delina", "layton"],
    "kilian": ["kilian"],
    "creed": ["creed"],
    "frederic malle": ["malle", "frederic"],
    "initio": ["initio"],
    "nishane": ["nishane"],
    "amouage": ["amouage"],
    "xerjoff": ["xerjoff"],
    "maison francis kurkdjian": ["kurkdjian", "baccarat", "mfk"],
}


def fetch(url: str, timeout: int = 20) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "application/json,image/*,*/*"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def fetch_json(url: str, timeout: int = 20):
    return json.loads(fetch(url, timeout))


def strip_query(url: str) -> str:
    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url
    url = url.split("?", 1)[0].split("#", 1)[0]
    return url


def norm(text: str) -> str:
    text = text.lower()
    text = text.replace("®", " ").replace("™", " ").replace("’", "'")
    text = re.sub(r"[^a-z0-9+%]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


STOP = {
    "the", "a", "an", "and", "or", "of", "for", "with", "in", "on", "to", "de",
    "eau", "parfum", "toilette", "cologne", "edp", "edt", "edc", "ml", "oz",
    "size", "travel", "spray", "set", "gift",
}


def tokens(text: str) -> set[str]:
    return {t for t in norm(text).split() if t not in STOP and len(t) > 1}


def extract_catalog() -> list[dict]:
    products: list[dict] = []
    seen: set[str] = set()

    seed = (ROOT / "migrations" / "0002_seed.sql").read_text()
    blocks = re.findall(
        r"\(\s*'([^']+)',\s*'((?:[^']|'')+)',\s*'((?:[^']|'')+)',\s*'((?:[^']|'')+)',\s*'([^']+)'",
        seed,
    )
    for pid, name, brand, _desc, image in blocks:
        if pid in seen:
            continue
        seen.add(pid)
        products.append(
            {
                "id": pid,
                "name": name.replace("''", "'"),
                "brand": brand.replace("''", "'"),
                "image": image,
                "from": "0002",
            }
        )

    for script in [
        ROOT / "scripts" / "generate-expand-catalog.mjs",
        ROOT / "scripts" / "generate-perfume-makeup-expand.mjs",
    ]:
        text = script.read_text()
        for m in re.finditer(
            r'(?:p|perfume|lipItem|blushItem|serumItem|nailItem)\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
            text,
        ):
            pid, name, brand = m.group(1), m.group(2), m.group(3)
            if pid in seen:
                continue
            seen.add(pid)
            products.append({"id": pid, "name": name, "brand": brand, "image": "", "from": script.name})
        for m in re.finditer(
            r'baseItem\(\s*"[^"]+",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
            text,
        ):
            pid, name, brand = m.group(1), m.group(2), m.group(3)
            if pid in seen:
                continue
            seen.add(pid)
            products.append({"id": pid, "name": name, "brand": brand, "image": "", "from": script.name})

    return products


def shopify_image(product: dict, variant: dict | None = None) -> str | None:
    if variant and variant.get("featured_image"):
        src = variant["featured_image"].get("src")
        if src:
            return strip_query(src)
    img = product.get("image") or {}
    if img.get("src"):
        return strip_query(img["src"])
    images = product.get("images") or []
    if images and images[0].get("src"):
        return strip_query(images[0]["src"])
    return None


def load_shopify_catalogs() -> list[dict]:
    catalog: list[dict] = []
    for shop in SHOPIFY_SHOPS:
        for page in range(1, 6):
            url = f"{shop}/products.json?limit=250&page={page}"
            try:
                data = fetch_json(url, timeout=25)
            except Exception:
                break
            products = data.get("products") or []
            if not products:
                break
            for p in products:
                catalog.append(
                    {
                        "shop": shop,
                        "title": p.get("title") or "",
                        "handle": p.get("handle") or "",
                        "vendor": p.get("vendor") or "",
                        "product_type": p.get("product_type") or "",
                        "tags": p.get("tags") or [],
                        "variants": p.get("variants") or [],
                        "raw": p,
                    }
                )
            if len(products) < 250:
                break
            time.sleep(0.15)
        print(f"  shopify {shop} running total={len(catalog)}", flush=True)
    return catalog


def brand_ok(our_brand: str, item: dict) -> bool:
    b = norm(our_brand)
    aliases = BRAND_ALIASES.get(b, [b])
    vendor = norm(item.get("vendor") or "")
    shop = norm(item.get("shop") or "")
    hay = f"{vendor} {shop}"
    return any(alias in hay for alias in aliases)


def score_match(our: dict, item: dict) -> tuple[float, dict | None]:
    if not brand_ok(our["brand"], item):
        return 0.0, None
    our_toks = tokens(f"{our['name']} {our['id'].replace('-', ' ')}")
    title_toks = tokens(item["title"])
    if not our_toks or not title_toks:
        return 0.0, None
    overlap = our_toks & title_toks
    # require a meaningful overlap beyond brand crumbs
    if len(overlap) < 2:
        # allow iconic one-token names if they are distinctive
        distinctive = our_toks - tokens(our["brand"]) - {"lipstick", "blush", "serum", "foundation", "mascara", "perfume"}
        if not (distinctive & title_toks):
            return 0.0, None
    score = len(overlap) / max(len(our_toks), 1)
    # prefer variant whose title matches a shade-like token from our name/id
    shade_hints = tokens(our["id"].replace("-", " ") + " " + our["name"])
    best_var = None
    best_var_score = -1
    for var in item["variants"]:
        vt = tokens(str(var.get("title") or ""))
        if not vt or vt == {"default", "title"}:
            continue
        vs = len(vt & shade_hints)
        if vs > best_var_score:
            best_var_score = vs
            best_var = var
    if best_var_score >= 1:
        score += 0.15 * best_var_score
    else:
        best_var = None
    # id handle bonus
    handle_toks = tokens(item["handle"].replace("-", " "))
    score += 0.08 * len(our_toks & handle_toks)
    return score, best_var


def match_shopify(products: list[dict], shopify: list[dict]) -> dict[str, dict]:
    resolved: dict[str, dict] = {}
    for our in products:
        best = None
        best_score = 0.0
        best_var = None
        for item in shopify:
            s, var = score_match(our, item)
            if s > best_score:
                best_score = s
                best = item
                best_var = var
        if best and best_score >= 0.38:
            url = shopify_image(best["raw"], best_var)
            if url:
                handle = best.get("handle") or ""
                product_url = f"{best['shop']}/products/{handle}" if handle else None
                resolved[our["id"]] = {
                    "url": url,
                    "productUrl": product_url,
                    "source": f"shopify:{best['shop']}",
                    "match": best["title"],
                    "score": round(best_score, 3),
                    "verified": False,
                    "placeholder": False,
                }
    return resolved


# Confirmed MAC / ELC pack-shot SKUs (sdcdn.io path pattern).
MAC_SKU = {
    "mac-ruby-woo": "M2LP01",
    "mac-velvet-teddy": "M2LC17",
    "mac-whirl": "M2LP08",
    "mac-diva": "M2LP03",
    "mac-chili": "M21N08",
    "mac-russian-red": "M0NHR1",
    "mac-lady-danger": "M0NHY1",
    "mac-twig": "M0NHR8",
    "mac-soar": "M0NHY4",
    "mac-rebel": "M0NHR6",
    "mac-mehr": "M2LC24",
    "mac-mocha": "M0NHY2",
    "mac-morange": "M0NHR4",
    "mac-cyber": "M2LP25",
    "mac-lipglass-clear": "S3F620",
    "mac-studio-fix-nc15": "M6JC15",
    "mac-studio-fix-nc20": "M6JC20",
    "mac-studio-fix-nw45": "M6JC45",
}


def mac_url(sku: str) -> str:
    return f"https://sdcdn.io/mac/us/mac_sku_{sku}_1x1_0.png"


# Known-good Sephora product image SKUs (path pattern, no query string).
SEPHORA_SKU = {
    "laneige-lip-mask": "1966258",
    "laneige-gummy-bear": "2382261",
    "ordinary-niacinamide": "2031369",
    "ordinary-hyaluronic": "2031393",
    "sol-de-janeiro-bum-bum": "1785176",
    "rare-beauty-soft-pinch": "2362163",
    "fenty-gloss-bomb": "1925905",
    "charlotte-pillow-talk": "1898582",
    "drunk-elephant-protini": "2172631",
    "tatcha-dewy-skin": "2012211",
    "nars-orgasm": "853416",
    "dior-sauvage": "2249686",
    "gisou-honey-oil": "2266765",
    "summer-fridays-butter": "2495538",
    "tower28-sos": "2421664",
    "saie-slip-tint": "2351225",
    "byredo-gypsy-water": "1765245",
    "la-mer-cream": "1939131",
    "glossier-cloud-paint": "2742008",
    "rhode-peptide-tint": "2748486",
}

ULTA_ID = {
    "mac-ruby-woo": "2621407",
    "maybelline-sky-high": "2568430",
    "clinique-black-honey": "2517128",
}


def sephora_url(sku: str) -> str:
    return f"https://www.sephora.com/productimages/sku/s{sku}-main-zoom.jpg"


def ulta_url(pid: str) -> str:
    return f"https://images.ulta.com/is/image/Ulta/{pid}"


WIKI_FILES = {
    "chanel-no5-edp": "CHANEL_N°5.jpg",
    "chanel-coco-mademoiselle": "Coco_Mademoiselle.jpg",
    "dior-sauvage": "Dior_Sauvage.jpg",
    "dior-jadore-edp": "J'adore_(Dior).jpg",
    "miss-dior": "Miss_Dior.jpg",
    "bleu-de-chanel-edp": "Bleu_de_Chanel.jpg",
    "ysl-black-opium": "Black_Opium.jpg",
    "ysl-libre": "Yves_Saint_Laurent_Libre.jpg",
    "creed-aventus": "Creed_Aventus.jpg",
    "le-labo-santal-33": "Le_Labo_Santal_33.jpg",
    "mfk-br540": "Baccarat_Rouge_540.jpg",
    "tom-ford-black-orchid": "Tom_Ford_Black_Orchid.jpg",
    "mugler-angel-edp": "Thierry_Mugler_Angel.jpg",
    "mugler-alien-edp": "Thierry_Mugler_Alien.jpg",
    "viktor-rolf-flowerbomb": "Flowerbomb.jpg",
    "lancome-la-vie-est-belle": "La_vie_est_belle.jpg",
    "chanel-chance-eau-tendre": "Chanel_Chance.jpg",
    "jpg-le-male": "Jean_Paul_Gaultier_Le_Male.jpg",
    "paco-1-million": "Paco_Rabanne_1_Million.jpg",
    "paco-invictus": "Invictus_(Paco_Rabanne).jpg",
    "terre-dhermes-edt": "Terre_d'Hermès.jpg",
    "acqua-di-parma-colonia": "Acqua_di_Parma_Colonia.jpg",
    "marc-jacobs-daisy": "Marc_Jacobs_Daisy.jpg",
    "dg-light-blue": "Light_Blue_(Dolce_&_Gabbana).jpg",
}


def wiki_file_url(title: str) -> str | None:
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": f"File:{title}",
            "prop": "imageinfo",
            "iiprop": "url|mime",
            "iiurlwidth": "1200",
            "format": "json",
        }
    )
    try:
        data = fetch_json(f"https://commons.wikimedia.org/w/api.php?{q}")
    except Exception:
        return None
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        thumb = info.get("thumburl") or info.get("url")
        if thumb:
            return strip_query(thumb)
    return None


def wiki_search(brand: str, name: str) -> str | None:
    query = f"{brand} {name} perfume bottle"
    q = urllib.parse.urlencode(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": query,
            "gsrnamespace": "6",
            "gsrlimit": "8",
            "prop": "imageinfo",
            "iiprop": "url|mime|size",
            "iiurlwidth": "1200",
            "format": "json",
        }
    )
    try:
        data = fetch_json(f"https://commons.wikimedia.org/w/api.php?{q}")
    except Exception:
        return None
    pages = data.get("query", {}).get("pages", {})
    brand_toks = tokens(brand)
    name_toks = tokens(name) - {"eau", "parfum", "toilette", "cologne"}
    for page in pages.values():
        title = page.get("title") or ""
        if not title.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
        tnorm = norm(title)
        if not any(b in tnorm for b in brand_toks):
            continue
        if name_toks and not any(n in tnorm for n in name_toks if len(n) > 3):
            continue
        info = (page.get("imageinfo") or [None])[0]
        if not info:
            continue
        mime = info.get("mime") or ""
        if not mime.startswith("image/"):
            continue
        thumb = info.get("thumburl") or info.get("url")
        if thumb:
            return strip_query(thumb)
    return None


def head_ok(url: str) -> bool:
    if "?" in url:
        return False
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ct = (resp.headers.get("content-type") or "").lower()
            length = int(resp.headers.get("content-length") or "0")
            if resp.status != 200:
                return False
            if not ct.startswith("image/"):
                return False
            # Ulta placeholder-ish tiny assets
            if length and length < 50000:
                return False
            return True
    except urllib.error.HTTPError as e:
        if e.code in {403, 405}:
            # some CDNs reject HEAD; try a tiny GET
            try:
                req2 = urllib.request.Request(url, headers={"User-Agent": UA, "Range": "bytes=0-64"})
                with urllib.request.urlopen(req2, timeout=15) as resp:
                    ct = (resp.headers.get("content-type") or "").lower()
                    return resp.status in {200, 206} and ct.startswith("image/")
            except Exception:
                return False
        return False
    except Exception:
        return False


CURATED_LINKS = {
    "rare-beauty-soft-pinch": "https://www.sephora.com/product/soft-pinch-liquid-blush-P97989780",
    "ordinary-niacinamide": "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html",
    "sol-de-janeiro-bum-bum": "https://www.sephora.com/product/brazilian-bum-bum-cream-P406140",
    "laneige-lip-mask": "https://www.sephora.com/product/lip-sleeping-mask-P420652",
    "fenty-gloss-bomb": "https://fentybeauty.com/products/gloss-bomb-universal-lip-luminizer",
    "charlotte-pillow-talk": "https://www.charlottetilbury.com/us/product/matte-revolution-lipstick-pillow-talk",
    "gisou-honey-oil": "https://gisou.com/products/honey-infused-hair-oil",
    "summer-fridays-butter": "https://www.sephora.com/product/lip-butter-balm-P45590063",
    "tatcha-dewy-skin": "https://www.tatcha.com/product/dewy-skin-cream.html",
    "byredo-gypsy-water": "https://www.byredo.com/us_en/gypsy-water-eau-de-parfum",
    "drunk-elephant-protini": "https://www.sephora.com/product/protini-tm-polypeptide-cream-P427419",
    "glossier-cloud-paint": "https://www.glossier.com/products/cloud-paint",
    "dior-sauvage": "https://www.dior.com/en_us/beauty/products/sauvage-eau-de-parfum",
    "la-mer-cream": "https://www.cremedelamer.com/product/17766/80880/moisturizers/creme-de-la-mer",
    "nars-orgasm": "https://www.narscosmetics.com/USA/orgasm-blush/999NAC0000063.html",
    "mac-ruby-woo": "https://www.maccosmetics.com/product/13854/310/products/makeup/lips/lipstick/macximal-silky-matte-lipstick",
}


def apply_curated(products: list[dict], resolved: dict[str, dict]) -> None:
    for pid, sku in MAC_SKU.items():
        resolved.setdefault(pid, {
            "url": mac_url(sku),
            "source": f"mac-sdcdn:{sku}",
            "match": sku,
            "score": 1.0,
            "verified": False,
            "placeholder": False,
        })
    for pid, sku in SEPHORA_SKU.items():
        resolved.setdefault(pid, {
            "url": sephora_url(sku),
            "source": f"sephora-cdn:{sku}",
            "match": sku,
            "score": 0.9,
            "verified": False,
            "placeholder": False,
        })
    for pid, uid in ULTA_ID.items():
        resolved.setdefault(pid, {
            "url": ulta_url(uid),
            "source": f"ulta-cdn:{uid}",
            "match": uid,
            "score": 0.85,
            "verified": False,
            "placeholder": False,
        })
    for pid, fname in WIKI_FILES.items():
        if pid in resolved:
            continue
        url = wiki_file_url(fname)
        if url:
            resolved[pid] = {
                "url": url,
                "source": f"wikimedia:{fname}",
                "match": fname,
                "score": 0.8,
                "verified": False,
                "placeholder": False,
            }
    for pid, link in CURATED_LINKS.items():
        resolved.setdefault(pid, {})
        resolved[pid].setdefault("productUrl", link)


def fill_wiki_perfumes(products: list[dict], resolved: dict[str, dict]) -> None:
    perfumeish = [
        p
        for p in products
        if p["id"] not in resolved
        and any(
            k in norm(p["name"] + " " + p["id"])
            for k in ("eau", "parfum", "cologne", "elixir", "perfume", "mist", "fragrance")
        )
    ]
    print(f"  wikimedia candidates={len(perfumeish)}", flush=True)
    for p in perfumeish:
        url = wiki_search(p["brand"], p["name"])
        if url:
            resolved[p["id"]] = {
                "url": url,
                "source": "wikimedia-search",
                "match": f"{p['brand']} {p['name']}",
                "score": 0.7,
                "verified": False,
                "placeholder": False,
            }
            print(f"    wiki {p['id']} -> {url}", flush=True)
        time.sleep(0.2)


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def sephora_search_url(brand: str, name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", f"{brand} {name}".lower())
    slug = slug.strip("-")[:80] or "beauty"
    return f"https://www.sephora.com/search/{slug}"


def write_outputs(products: list[dict], resolved: dict[str, dict]) -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated": True,
        "products": {
            p["id"]: {
                **resolved.get(
                    p["id"],
                    {
                        "url": None,
                        "source": None,
                        "placeholder": True,
                        "verified": False,
                    },
                ),
                "name": p["name"],
                "brand": p["brand"],
                "productUrl": resolved.get(p["id"], {}).get("productUrl")
                or sephora_search_url(p["brand"], p["name"]),
            }
            for p in products
        },
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")

    verified = [
        p
        for p in products
        if resolved.get(p["id"], {}).get("verified") and not resolved[p["id"]].get("placeholder")
    ]

    lines = [
        "-- Official pack shots + retailer/search product_url updates.",
        "-- No URL query strings (D1 db.exec treats `?` as bind placeholders).",
        "-- Apply with wrangler — do NOT db.exec this file from ensureCatalog:",
        "--   npm run db:migrate:local",
        "--   npm run db:migrate:remote",
        "--",
        f"-- Verified official product images: {len(verified)}",
        f"-- Left as pack-like placeholders (tagged image-placeholder): {len(products) - len(verified)}",
        "",
    ]

    # One UPDATE per SKU so image + link stay paired. Batched in comment groups of 40.
    for i, p in enumerate(products):
        info = resolved.get(p["id"], {})
        image = info.get("url") if info.get("verified") else None
        link = info.get("productUrl") if info.get("productUrl") and "?" not in str(info.get("productUrl")) else sephora_search_url(p["brand"], p["name"])
        if "?" in link:
            link = sephora_search_url(p["brand"], p["name"])
        sets = [f"product_url = '{sql_escape(link)}'", "updated_at = datetime('now')"]
        if image and "?" not in image:
            sets.insert(0, f"image_url = '{sql_escape(image)}'")
        lines.append(f"UPDATE products SET {', '.join(sets)} WHERE id = '{sql_escape(p['id'])}';")
        if (i + 1) % 40 == 0:
            lines.append("")

    placeholder_ids = [p["id"] for p in products if p["id"] not in {x["id"] for x in verified}]
    if placeholder_ids:
        lines.append("")
        lines.append("-- Flag SKUs that still use the best pack-like / category photo.")
        for i in range(0, len(placeholder_ids), 40):
            part = placeholder_ids[i : i + 40]
            id_list = ", ".join(f"'{sql_escape(x)}'" for x in part)
            lines.append(
                "UPDATE products SET "
                "tags = CASE "
                "WHEN instr(tags, '\"image-placeholder\"') > 0 THEN tags "
                "WHEN tags = '[]' THEN '[\"image-placeholder\"]' "
                "ELSE substr(tags, 1, length(tags) - 1) || ',\"image-placeholder\"]' "
                "END, "
                "updated_at = datetime('now') "
                f"WHERE id IN ({id_list});"
            )
            lines.append("")

    OUT_SQL.write_text("\n".join(lines).rstrip() + "\n")
    print(f"Wrote {OUT_JSON} and {OUT_SQL}")
    print(f"verified={len(verified)} placeholder={len(placeholder_ids)} total={len(products)}")


def main() -> None:
    products = extract_catalog()
    print(f"catalog products={len(products)}", flush=True)

    print("loading shopify catalogs…", flush=True)
    shopify = load_shopify_catalogs()
    print(f"shopify products={len(shopify)}", flush=True)
    resolved = match_shopify(products, shopify)
    print(f"shopify matches={len(resolved)}", flush=True)

    apply_curated(products, resolved)
    print(f"after curated={len(resolved)}", flush=True)

    fill_wiki_perfumes(products, resolved)
    print(f"after wiki={len(resolved)}", flush=True)

    print("verifying URLs…", flush=True)
    ok = 0
    for pid, info in list(resolved.items()):
        url = info.get("url")
        if not url or "?" in url:
            info["verified"] = False
            info.pop("url", None)
            continue
        if head_ok(url):
            info["verified"] = True
            ok += 1
        else:
            print(f"  fail {pid} {info.get('source')} {url}", flush=True)
            info["verified"] = False
            info.pop("url", None)
    print(f"verified live={ok}", flush=True)

    write_outputs(products, resolved)


if __name__ == "__main__":
    main()
