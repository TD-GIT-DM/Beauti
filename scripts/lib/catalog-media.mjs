/**
 * Official pack shots + retailer links for Beauti SKUs.
 *
 * Image URLs must be HTTPS with no `?` query string (D1 db.exec bind bug).
 * Overlay: scripts/data/real-product-images.json (written by resolve-real-product-images.py).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isVerifiedStoredPdp, retailerSearchPathUrl, stripUrlQuery } from "./product-url.mjs";

const overlayPath = fileURLToPath(new URL("../data/real-product-images.json", import.meta.url));
const urlOverlayPath = fileURLToPath(new URL("../data/real-product-urls.json", import.meta.url));

function loadOverlay() {
  try {
    return JSON.parse(readFileSync(overlayPath, "utf8"));
  } catch {
    return { products: {} };
  }
}

function loadUrlOverlay() {
  try {
    return JSON.parse(readFileSync(urlOverlayPath, "utf8"));
  } catch {
    return { products: {} };
  }
}

const overlay = loadOverlay();
const urlOverlay = loadUrlOverlay();

/** Sephora keyword search as a clean path (no `?`) so SQL migrations stay db.exec-safe. */
export function sephoraSearchUrl(brand, name) {
  const slug = `${brand} ${name}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `https://www.sephora.com/search/${slug || "beauty"}`;
}

/** Known official / retailer product pages (no query strings). */
export const CURATED_LINKS = {
  "rare-beauty-soft-pinch": "https://www.sephora.com/product/rare-beauty-by-selena-gomez-soft-pinch-liquid-blush-P97989778",
  "ordinary-niacinamide": "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html",
  "sol-de-janeiro-bum-bum": "https://www.sephora.com/product/brazilian-bum-bum-visibly-firming-refillable-body-cream-P406080",
  "laneige-lip-mask": "https://www.sephora.com/product/lip-sleeping-mask-P420652",
  "fenty-gloss-bomb": "https://fentybeauty.com/products/gloss-bomb-universal-lip-luminizer",
  "charlotte-pillow-talk": "https://www.charlottetilbury.com/us/product/matte-revolution-lipstick-pillow-talk",
  "gisou-honey-oil": "https://gisou.com/products/honey-infused-hair-oil",
  "rhode-peptide-tint": "https://www.rhodeskin.com/products/peptide-lip-treatment",
  "summer-fridays-butter": "https://www.sephora.com/product/summer-fridays-lip-butter-balm-P455936",
  "tatcha-dewy-skin": "https://www.tatcha.com/product/dewy-skin-cream.html",
  "byredo-gypsy-water": "https://www.byredo.com/us_en/gypsy-water-eau-de-parfum",
  "tower28-sos": "https://tower28beauty.com/products/sos-daily-rescue-facial-spray",
  "saie-slip-tint": "https://saiehello.com/products/slip-tint-tinted-moisturizer-spf-35",
  "drunk-elephant-protini": "https://www.sephora.com/product/protini-tm-polypeptide-cream-P427421",
  "glossier-cloud-paint": "https://www.glossier.com/products/cloud-paint",
  "dior-sauvage": "https://www.dior.com/en_us/beauty/products/sauvage-eau-de-parfum",
  "la-mer-cream": "https://www.cremedelamer.com/product/17766/80880/moisturizers/creme-de-la-mer",
  "nars-orgasm": "https://www.narscosmetics.com/USA/orgasm-blush/999NAC0000063.html",
  "mac-ruby-woo": "https://www.maccosmetics.com/product/13854/310/products/makeup/lips/lipstick/macximal-silky-matte-lipstick",
  "chanel-no5-edp": "https://www.chanel.com/us/fragrance/p/120530/n5-eau-de-parfum-spray",
  "chanel-coco-mademoiselle": "https://www.chanel.com/us/fragrance/p/123630/coco-mademoiselle-eau-de-parfum-spray",
  "ysl-libre": "https://www.yslbeautyus.com/fragrance/women-s-fragrance/libre/libre-eau-de-parfum/WW-50154YSL.html",
  "le-labo-santal-33": "https://www.lelabofragrances.com/santal-33-155.html",
};

/** Verified-style official pack shots (HTTPS, no `?`). Prefer brand/retailer CDNs. */
export const CURATED_IMAGES = {
  "mac-ruby-woo": "https://sdcdn.io/mac/us/mac_sku_M2LP01_1x1_0.png",
  "mac-velvet-teddy": "https://sdcdn.io/mac/us/mac_sku_M2LC17_1x1_0.png",
  "mac-whirl": "https://sdcdn.io/mac/us/mac_sku_M2LP08_1x1_0.png",
  "mac-diva": "https://sdcdn.io/mac/us/mac_sku_M2LP03_1x1_0.png",
  "laneige-lip-mask": "https://www.sephora.com/productimages/sku/s1966258-main-zoom.jpg",
  "rare-beauty-soft-pinch":
    "https://cdn.shopify.com/s/files/1/0314/1143/7703/files/ECOMM-SP-LIQUID-BLUSH-DEWY-HOPE.jpg",
  "sol-de-janeiro-bum-bum":
    "https://cdn.shopify.com/s/files/1/2826/2250/files/01_SDJ_PPage_DTC_BB_BC_240ML_OVERHEAD_RGB_1452X1452_cb5b3d96-578a-4163-8c34-8c815fc465eb.jpg",
  "summer-fridays-butter":
    "https://cdn.shopify.com/s/files/1/2382/2877/files/Square-Lip-Butter-Balm-Vanilla-Main.jpg",
  "gisou-honey-oil":
    "https://cdn.shopify.com/s/files/1/0361/1987/1619/files/02_HIHO_100ml_PG_PACKSHOT1_D_94c5ae27-3afb-4bb5-80b3-74736ecd6e1f.jpg",
  "glossier-cloud-paint":
    "https://cdn.shopify.com/s/files/1/0627/9164/7477/files/glossier-cloud-paint-beam-carousel-01.png",
};

export function overlayEntry(id) {
  return overlay.products?.[id] ?? null;
}

export function imageFor(id, fallback) {
  const fromOverlay = overlayEntry(id);
  if (fromOverlay?.url && fromOverlay.verified && !String(fromOverlay.url).includes("?")) {
    return fromOverlay.url;
  }
  if (CURATED_IMAGES[id] && !CURATED_IMAGES[id].includes("?")) return CURATED_IMAGES[id];
  if (fallback && !String(fallback).includes("?")) return fallback;
  return fallback ?? CURATED_IMAGES["mac-ruby-woo"];
}

export function productUrlFor(item) {
  const fromUrlOverlay = urlOverlay.products?.[item.id];
  if (fromUrlOverlay?.productUrl) {
    const link = stripUrlQuery(fromUrlOverlay.productUrl);
    if (link && !link.includes("?") && (isVerifiedStoredPdp(link) || /^https:\/\/www\.(sephora|ulta)\.com\//i.test(link))) {
      return link;
    }
  }
  const fromOverlay = overlayEntry(item.id);
  if (fromOverlay?.productUrl && !String(fromOverlay.productUrl).includes("?")) {
    const link = String(fromOverlay.productUrl);
    if (isVerifiedStoredPdp(link) || /^https:\/\/www\.sephora\.com\/search\//i.test(link)) {
      return link;
    }
  }
  if (CURATED_LINKS[item.id] && !CURATED_LINKS[item.id].includes("?")) {
    return CURATED_LINKS[item.id];
  }
  if (item.productUrl && !String(item.productUrl).includes("?") && !String(item.productUrl).includes(`/product/${item.id}`)) {
    return item.productUrl;
  }
  return retailerSearchPathUrl(item.brand, item.name);
}

export function isPlaceholderImage(id, url) {
  const fromOverlay = overlayEntry(id);
  if (fromOverlay?.placeholder) return true;
  if (fromOverlay?.verified && fromOverlay.url === url) return false;
  if (CURATED_IMAGES[id] === url) return false;
  return /unsplash\.com|pexels\.com/.test(String(url ?? ""));
}
