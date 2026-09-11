/** Brands typically sold at Ulta / mass retail, not Sephora US. */
const ULTA_SEARCH_BRANDS = new Set(
  [
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
  ].map((b) => b.toLowerCase()),
);

function brandKey(brand: string): string {
  return brand
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function prefersUltaSearch(brand: string): boolean {
  return ULTA_SEARCH_BRANDS.has(brandKey(brand));
}

/** Fake seeds used https://www.sephora.com/product/{beauti-id} (404, no -P id). */
export function isFakeSephoraProductUrl(url: string): boolean {
  return /^https:\/\/www\.sephora\.com\/product\/[^/?#]+$/i.test(url) && !/-P\d+/i.test(url);
}

export function isGoogleSearchUrl(url: string): boolean {
  return /(?:^https?:\/\/)?(?:www\.)?google\.[^/]+\/search/i.test(url);
}

/** Real Sephora PDP with a retailer product id (`-P12345`). */
export function isSephoraPdp(url: string): boolean {
  return /^https:\/\/www\.sephora\.com\/product\/[^?#]*-P\d+/i.test(url);
}

/** Ulta PDP path with a real product id (no query string required). */
export function isUltaPdp(url: string): boolean {
  return /^https:\/\/www\.ulta\.com\/p\/[^?#]+(?:pimprod|xlsImpprod|prod)\d+/i.test(url);
}

function isRetailerKeywordSearch(url: string): boolean {
  return (
    /^https:\/\/www\.sephora\.com\/search\?keyword=/i.test(url) ||
    /^https:\/\/www\.ulta\.com\/search\?search=/i.test(url)
  );
}

function isOfficialBrandPdp(url: string): boolean {
  if (!/^https:\/\//i.test(url)) return false;
  if (isGoogleSearchUrl(url)) return false;
  if (/sephora\.com/i.test(url) || /ulta\.com/i.test(url)) return false;
  return true;
}

/** URL we are willing to send the shopper to as-is. */
export function isVerifiedProductPage(url: string): boolean {
  const trimmed = (url || "").trim();
  if (!trimmed) return false;
  if (isGoogleSearchUrl(trimmed) || isFakeSephoraProductUrl(trimmed)) return false;
  if (isSephoraPdp(trimmed) || isUltaPdp(trimmed)) return true;
  if (isRetailerKeywordSearch(trimmed)) return true;
  return isOfficialBrandPdp(trimmed);
}

export function retailerSearchUrl(brand: string, name: string): string {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  if (prefersUltaSearch(brand)) {
    return `https://www.ulta.com/search?search=${q}`;
  }
  return `https://www.sephora.com/search?keyword=${q}`;
}

/**
 * Fake / missing / Google URLs become a Sephora or Ulta keyword search
 * (stays on the retailer). Verified PDPs and official brand pages pass through.
 */
export function resolveProductUrl(url: string, brand: string, name: string): string {
  const trimmed = (url || "").trim();
  if (isVerifiedProductPage(trimmed)) return trimmed;
  return retailerSearchUrl(brand, name);
}
