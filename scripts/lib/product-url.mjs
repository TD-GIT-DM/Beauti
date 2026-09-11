/** Shared product-link helpers for catalog SQL generators (no `?` in stored URLs). */

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

export function brandKey(brand) {
  return String(brand || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function prefersUltaSearch(brand) {
  return ULTA_SEARCH_BRANDS.has(brandKey(brand));
}

/** Path-only search so D1 SQL migrations never embed `?` bind placeholders. */
export function retailerSearchPathUrl(brand, name) {
  const slug = `${brand} ${name}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "beauty";
  if (prefersUltaSearch(brand)) {
    return `https://www.ulta.com/brand/${brandKey(brand).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "beauty"}`;
  }
  return `https://www.sephora.com/search/${slug}`;
}

export function stripUrlQuery(url) {
  return String(url || "")
    .trim()
    .split("#")[0]
    .split("?")[0];
}

export function isSephoraPdp(url) {
  return /^https:\/\/www\.sephora\.com\/product\/[^?#]*-P\d+/i.test(url);
}

export function isUltaPdp(url) {
  return /^https:\/\/www\.ulta\.com\/p\/[^?#]+(?:pimprod|xlsImpprod|prod)\d+/i.test(url);
}

export function isVerifiedStoredPdp(url) {
  const trimmed = stripUrlQuery(url);
  if (!trimmed) return false;
  if (isSephoraPdp(trimmed) || isUltaPdp(trimmed)) return true;
  if (/sephora\.com/i.test(trimmed) || /ulta\.com/i.test(trimmed) || /google\./i.test(trimmed)) {
    return false;
  }
  return /^https:\/\//i.test(trimmed);
}

/** Runtime click URL (may include `?`). Never Google. */
export function retailerKeywordSearchUrl(brand, name) {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  if (prefersUltaSearch(brand)) {
    return `https://www.ulta.com/search?search=${q}`;
  }
  return `https://www.sephora.com/search?keyword=${q}`;
}

