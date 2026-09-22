/**
 * Verified catalog JSON — same family as honest prices / URLs.
 * Sephora `/api/v2/catalog/search` and Shopify `/products/{handle}.js` (or
 * `products.json`). Never scrape storefront HTML; never invent stock.
 */

import { honestDealScore } from "../../lib/discount.ts";
import type { Availability, CatalogProduct, DealSnapshot } from "./types";

export const CATALOG_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const SEPHORA_SEARCH =
  "https://www.sephora.com/api/v2/catalog/search?type=keyword&q={q}&content=true";

const P_ID_RE = /[-/]P(\d+)/i;
const SHOPIFY_HANDLE_RE = /\/products\/([^/?#]+)/i;
const MONEY_RE = /\$?\s*([0-9]+(?:\.[0-9]+)?)/g;

/** Brand → public Shopify origin (documented products.json / .js). */
export const BRAND_SHOPS: Record<string, string> = {
  "rare beauty": "https://www.rarebeauty.com",
  "sol de janeiro": "https://www.soldejaneiro.com",
  "summer fridays": "https://www.summerfridays.com",
  gisou: "https://gisou.com",
  glossier: "https://www.glossier.com",
  "tower 28": "https://tower28beauty.com",
  saie: "https://saiehello.com",
  rhode: "https://www.rhodeskin.com",
  "fenty beauty": "https://fentybeauty.com",
  merit: "https://www.meritbeauty.com",
  ilia: "https://iliabeauty.com",
  "milk makeup": "https://www.milkmakeup.com",
  ouai: "https://theouai.com",
  kayali: "https://www.kayali.com",
  "huda beauty": "https://hudabeauty.com",
  "patrick ta": "https://patrickta.com",
  kosas: "https://kosas.com",
  "haus labs": "https://www.hauslabs.com",
  "e.l.f.": "https://elfcosmetics.com",
  colourpop: "https://colourpop.com",
  "glow recipe": "https://glowrecipe.com",
  olaplex: "https://olaplex.com",
  "the inkey list": "https://theinkeylist.com",
  "beauty of joseon": "https://beautyofjoseon.com",
  tatcha: "https://www.tatcha.com",
  "paula's choice": "https://www.paulaschoice.com",
  "youth to the people": "https://www.youthtothepeople.com",
  "one/size": "https://onesizebeauty.com",
  "olive & june": "https://oliveandjune.com",
};

export interface StockRead {
  availability: Availability;
  restockEstimate: string | null;
  source: string;
  /** Explicit isOutOfStock / Shopify.available — not a listing heuristic. */
  explicit: boolean;
}

export interface CatalogQuote extends StockRead {
  price?: number;
  listPrice?: number;
}

export function sephoraProductId(url: string): string | null {
  const m = P_ID_RE.exec(url || "");
  return m ? `P${m[1]}` : null;
}

export function shopifyJsUrl(productUrl: string): string | null {
  const url = (productUrl || "").split("#")[0].split("?")[0];
  if (!url.startsWith("https://")) return null;
  if (/sephora\.com|ulta\.com|google\./i.test(url)) return null;
  const m = SHOPIFY_HANDLE_RE.exec(url);
  if (!m) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/products/${m[1]}.js?currency=USD`;
  } catch {
    return null;
  }
}

export function brandShop(brand: string): string | null {
  const key = brand
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return BRAND_SHOPS[key] ?? null;
}

function jsonHeaders(referer: string): HeadersInit {
  return {
    "User-Agent": CATALOG_UA,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
  };
}

export async function fetchJson(
  url: string,
  opts: { timeoutMs?: number; referer?: string } = {},
): Promise<unknown | null> {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: jsonHeaders(opts.referer ?? "https://www.sephora.com/"),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function moneyValues(raw: unknown): number[] {
  if (raw == null) return [];
  if (typeof raw === "number" && raw > 0 && raw < 20_000) return [raw];
  const out: number[] = [];
  const text = String(raw);
  MONEY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MONEY_RE.exec(text))) {
    const n = Number(m[1]);
    if (n > 0 && n < 20_000) out.push(n);
  }
  return out;
}

/** `.js` prices are integer cents. `products.json` prices are dollar strings. */
function shopifyMoney(raw: unknown, unit: "cents" | "dollars"): number | null {
  if (raw == null || raw === "" || raw === 0 || raw === "0") return null;
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  const value = unit === "cents" ? n / 100 : n;
  if (value <= 0 || value >= 20_000) return null;
  return Math.round(value * 100) / 100;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function isMiniName(name: string): boolean {
  const n = (name || "").toLowerCase();
  return n.includes("mini") || n.includes("travel size") || n.includes("travel-size");
}

function boolish(raw: unknown): boolean | undefined {
  if (raw === true || raw === "true" || raw === 1) return true;
  if (raw === false || raw === "false" || raw === 0) return false;
  return undefined;
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function formatRestockDate(raw: string): string {
  const iso = Date.parse(raw);
  if (!Number.isFinite(iso)) return raw.slice(0, 80);
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function restockFromUnknownRecord(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  const nested = (record.actionFlags as Record<string, unknown> | undefined) ?? {};
  const raw = firstString(
    record.replenishmentDate,
    record.replenishmentStatus,
    record.availableDate,
    record.expectedDeliveryDate,
    record.backInStockDate,
    nested.backInStockDate,
    nested.replenishmentDate,
  );
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "out of stock" || lower === "none" || lower === "null") return null;
  if (/^\d{4}-\d{2}/.test(raw)) return formatRestockDate(raw);
  return raw.slice(0, 80);
}

/**
 * Stock from a Sephora catalog product object (search card or PDP JSON).
 * Search cards currently omit `isOutOfStock`; absence is unknown, not in-stock.
 * Fulfillment flags (shipToHomeEligible etc.) are geo-empty here — ignored.
 */
export function stockFromSephoraProduct(product: Record<string, unknown> | null | undefined): StockRead | null {
  if (!product) return null;
  const cs = (product.currentSku as Record<string, unknown> | undefined) ?? {};
  const oos = boolish(cs.isOutOfStock) ?? boolish(product.isOutOfStock);
  const few =
    boolish(cs.isOnlyFewLeft) === true ||
    boolish(product.isOnlyFewLeft) === true ||
    boolish(cs.isGoingFast) === true ||
    boolish(product.isGoingFast) === true;
  const coming = boolish(cs.isComingSoon) === true || boolish(product.isComingSoon) === true;
  const restock =
    coming && oos !== false
      ? restockFromUnknownRecord(cs) ?? restockFromUnknownRecord(product) ?? "coming soon"
      : oos === true
        ? restockFromUnknownRecord(cs) ?? restockFromUnknownRecord(product)
        : null;

  if (oos === true || (coming && oos !== false)) {
    return {
      availability: "out_of_stock",
      restockEstimate: restock,
      source: "sephora-api",
      explicit: true,
    };
  }
  if (few) {
    return {
      availability: "limited",
      restockEstimate: null,
      source: "sephora-api",
      explicit: true,
    };
  }
  if (oos === false) {
    return {
      availability: "in_stock",
      restockEstimate: null,
      source: "sephora-api",
      explicit: true,
    };
  }

  const children = [
    ...(((product.regularChildSkus as unknown[]) ?? []) as Record<string, unknown>[]),
    ...(((product.childSkus as unknown[]) ?? []) as Record<string, unknown>[]),
  ];
  if (children.length) {
    let yes = 0;
    let no = 0;
    for (const sku of children) {
      const flag = boolish(sku.isOutOfStock);
      if (flag === true) no += 1;
      else if (flag === false) yes += 1;
    }
    if (yes + no > 0) {
      if (yes === 0) {
        return {
          availability: "out_of_stock",
          restockEstimate: restockFromUnknownRecord(cs),
          source: "sephora-api",
          explicit: true,
        };
      }
      if (no > 0) {
        return { availability: "limited", restockEstimate: null, source: "sephora-api", explicit: true };
      }
      return { availability: "in_stock", restockEstimate: null, source: "sephora-api", explicit: true };
    }
  }
  return null;
}

export function stockFromShopify(
  data: Record<string, unknown> | null | undefined,
  catalogName = "",
): StockRead | null {
  if (!data) return null;
  const variants = (data.variants as Record<string, unknown>[] | undefined) ?? [];
  const nameL = catalogName.toLowerCase();
  const mini = isMiniName(catalogName);

  if (variants.length) {
    const rows = variants.filter((v) => typeof v.available === "boolean");
    if (!rows.length) {
      const top = boolish(data.available);
      if (top == null) return null;
      return {
        availability: top ? "in_stock" : "out_of_stock",
        restockEstimate: null,
        source: "shopify-js",
        explicit: true,
      };
    }
    const shadeHints = new Set(nameL.split(/[^a-z0-9]+/).filter((t) => t.length > 2));
    let matched = rows;
    if (mini) {
      const miniVars = rows.filter((v) => /mini|travel/i.test(String(v.title ?? v.option1 ?? "")));
      if (miniVars.length) matched = miniVars;
    } else if (shadeHints.size) {
      const shadeVars = rows.filter((v) => {
        const title = String(v.title ?? v.option1 ?? "").toLowerCase();
        return [...shadeHints].some((h) => title.includes(h) && !["lipstick", "blush", "perfume"].includes(h));
      });
      if (shadeVars.length === 1) matched = shadeVars;
    }
    const yes = matched.filter((v) => v.available === true).length;
    if (yes === 0) {
      return { availability: "out_of_stock", restockEstimate: null, source: "shopify-js", explicit: true };
    }
    if (yes < matched.length) {
      return { availability: "limited", restockEstimate: null, source: "shopify-js", explicit: true };
    }
    return { availability: "in_stock", restockEstimate: null, source: "shopify-js", explicit: true };
  }

  const top = boolish(data.available);
  if (top == null) return null;
  return {
    availability: top ? "in_stock" : "out_of_stock",
    restockEstimate: null,
    source: "shopify-js",
    explicit: true,
  };
}

const SIZE_PENALTY = new Set(["mini", "sample", "deluxe", "travel", "gift", "set", "points", "sachet", "refill", "jumbo"]);

interface PriceOffer {
  price: number;
  listPrice: number;
  title?: string;
}

function offerTokens(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

/**
 * Sale figure that only repeats the bottom of a multi-price list (onSale NONE).
 * That is the range low end, not a markdown.
 */
function isPhantomRangeSale(lists: number[], sales: number[], onSale: boolean): boolean {
  if (onSale || !lists.length || !sales.length) return false;
  const minList = Math.min(...lists);
  const maxList = Math.max(...lists);
  const maxSale = Math.max(...sales);
  return maxList > minList + 0.009 && maxSale <= minList + 0.009;
}

/** Same size as the catalog row. Prefer a real compare-at when it is the closer offer. */
function pickOffer(offers: PriceOffer[], catalogName: string, prior: number | null): PriceOffer {
  const tokens = offerTokens(catalogName);
  const wantPenalty = new Set([...tokens].filter((t) => SIZE_PENALTY.has(t)));
  let pool = offers.filter((offer) => {
    const extra = [...offerTokens(offer.title ?? "")].filter((t) => SIZE_PENALTY.has(t) && !wantPenalty.has(t));
    return extra.length === 0;
  });
  if (!pool.length) pool = offers;

  const shade = [...tokens].filter(
    (t) => !SIZE_PENALTY.has(t) && !["the", "and", "for", "with", "eau", "parfum", "perfume"].includes(t),
  );
  if (shade.length) {
    const hits = pool.filter((offer) => {
      const titleTokens = offerTokens(offer.title ?? "");
      if (!titleTokens.size) return false;
      return shade.some((t) => titleTokens.has(t));
    });
    if (hits.length && hits.length < pool.length) pool = hits;
  }

  if (isMiniName(catalogName)) return pool.reduce((a, b) => (a.price < b.price ? a : b));
  if (prior == null || prior <= 0) return pool[0];
  return pool.reduce((best, offer) => {
    const dist = Math.min(Math.abs(offer.price - prior), Math.abs(offer.listPrice - prior));
    const bestDist = Math.min(Math.abs(best.price - prior), Math.abs(best.listPrice - prior));
    if (dist < bestDist - 0.009) return offer;
    if (Math.abs(dist - bestDist) <= 0.009 && Math.abs(offer.listPrice - prior) <= 0.02) {
      const cut = offer.listPrice - offer.price;
      const bestCut = best.listPrice - best.price;
      if (cut > bestCut + 0.009) return offer;
    }
    return best;
  });
}

function sameSize(prior: number, candidate: number): boolean {
  return Math.abs(prior - candidate) <= Math.max(3, candidate * 0.12);
}

/**
 * Sephora search cards publish size endpoints ("$50 - $450"), not every ml.
 * Keep a mid-size catalog price that sits inside the range. Snap only when
 * the stored price is the same size as an endpoint, or the card has one price.
 */
function chooseSephoraOffer(offers: PriceOffer[], catalogName: string, prior: number | null): PriceOffer {
  if (isMiniName(catalogName)) return offers.reduce((a, b) => (a.price < b.price ? a : b));
  if (offers.length === 1) return offers[0];
  if (prior == null || prior <= 0) return offers[offers.length - 1];
  const lists = offers.map((offer) => offer.listPrice);
  const lo = Math.min(...lists);
  const hi = Math.max(...lists);
  if (prior < lo - 0.51) return offers.reduce((a, b) => (a.price < b.price ? a : b));
  if (prior > hi + 0.51) return offers.reduce((a, b) => (a.listPrice > b.listPrice ? a : b));
  const near = offers.filter((offer) => sameSize(prior, offer.price) || sameSize(prior, offer.listPrice));
  if (near.length) {
    return near.reduce((best, offer) => {
      const dist = Math.min(Math.abs(offer.price - prior), Math.abs(offer.listPrice - prior));
      const bestDist = Math.min(Math.abs(best.price - prior), Math.abs(best.listPrice - prior));
      if (dist < bestDist - 0.009) return offer;
      if (offer.listPrice - offer.price > best.listPrice - best.price + 0.009 && sameSize(prior, offer.listPrice)) {
        return offer;
      }
      return best;
    });
  }
  const discs = new Set(offers.map((offer) => Math.round(((offer.listPrice - offer.price) / offer.listPrice) * 100)));
  if (discs.size === 1 && prior > lo && prior < hi) {
    const disc = [...discs][0];
    if (disc > 0) return { price: roundMoney(prior * (1 - disc / 100)), listPrice: roundMoney(prior) };
  }
  return { price: roundMoney(prior), listPrice: roundMoney(prior) };
}

export function pricesFromSephoraProduct(
  product: Record<string, unknown>,
  catalogName: string,
  prior: number | null,
): { price: number; listPrice: number } | null {
  const cs = (product.currentSku as Record<string, unknown> | undefined) ?? {};
  const lists = moneyValues(cs.listPrice);
  const sales = moneyValues(cs.salePrice);
  const onSale = String(product.onSaleData ?? "NONE").toUpperCase() !== "NONE";
  if (!lists.length && !sales.length) return null;

  const phantom = isPhantomRangeSale(lists, sales, onSale);
  const realSale =
    !phantom &&
    sales.length > 0 &&
    (onSale || (lists.length > 0 && Math.min(...sales) + 0.009 < Math.max(...lists)));
  if (realSale) {
    const ls = [...new Set((lists.length ? lists : sales).map(roundMoney))].sort((a, b) => a - b);
    const ss = [...new Set(sales.map(roundMoney))].sort((a, b) => a - b);
    let offers: PriceOffer[];
    if (ls.length === ss.length) {
      offers = ls.map((listed, i) => ({ price: Math.min(ss[i], listed), listPrice: listed }));
    } else if (ls.length >= 2 && ss.length >= 2 && Math.max(...ls) > Math.min(...ls)) {
      const loL = Math.min(...ls);
      const hiL = Math.max(...ls);
      const loS = Math.min(...ss);
      const hiS = Math.max(...ss);
      offers = ls.map((listed) => {
        const t = (listed - loL) / (hiL - loL);
        const current = loS + t * (hiS - loS);
        return { price: roundMoney(Math.min(current, listed)), listPrice: roundMoney(listed) };
      });
    } else {
      const listed = ls[ls.length - 1];
      offers = [{ price: roundMoney(Math.min(Math.min(...ss), listed)), listPrice: roundMoney(listed) }];
    }
    const chosen = chooseSephoraOffer(offers, catalogName, prior);
    if (chosen.price + 0.009 >= chosen.listPrice) {
      return { price: roundMoney(chosen.listPrice), listPrice: roundMoney(chosen.listPrice) };
    }
    return { price: roundMoney(chosen.price), listPrice: roundMoney(chosen.listPrice) };
  }
  const currentVals = [...new Set((lists.length ? lists : sales).map(roundMoney))].sort((a, b) => a - b);
  const chosen = chooseSephoraOffer(
    currentVals.map((n) => ({ price: n, listPrice: n })),
    catalogName,
    prior,
  );
  return { price: roundMoney(chosen.price), listPrice: roundMoney(chosen.price) };
}

export function pricesFromShopify(
  data: Record<string, unknown>,
  catalogName: string,
  prior: number | null = null,
  unit: "cents" | "dollars" = "cents",
): { price: number; listPrice: number } | null {
  const variants = (data.variants as Record<string, unknown>[] | undefined) ?? [];
  const rows: PriceOffer[] = [];
  for (const v of variants.length ? variants : [data]) {
    const price = shopifyMoney(v.price, unit);
    if (price == null) continue;
    const compare = shopifyMoney(v.compare_at_price, unit);
    const listed = compare && compare > price ? compare : price;
    rows.push({
      price,
      listPrice: listed,
      title: String(v.title ?? v.option1 ?? ""),
    });
  }
  if (!rows.length) return null;
  const chosen = pickOffer(rows, catalogName, prior);
  return { price: roundMoney(chosen.price), listPrice: roundMoney(chosen.listPrice) };
}

/** Fuzzy brand-shop matches must stay on the same size. Exact PDPs may move further. */
export function priceNearCatalog(price: number, listPrice: number, prior: number | null): boolean {
  if (prior == null || prior <= 0) return true;
  const near = (n: number) => Math.abs(n - prior) / prior <= 0.45;
  return near(price) || near(listPrice);
}

export function snapshotFromQuote(product: CatalogProduct, quote: CatalogQuote): DealSnapshot {
  const price = quote.price ?? product.price;
  const listPrice = quote.listPrice ?? product.listPrice ?? price;
  const availability = quote.availability;
  const restockEstimate = availability === "out_of_stock" ? quote.restockEstimate : null;
  return {
    productId: product.id,
    price,
    currency: product.currency,
    promoCodes: product.promoCodes,
    dealScore: honestDealScore(price, listPrice, availability),
    availability,
    restockEstimate,
    listPrice,
  };
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !["the", "and", "for", "with"].includes(t)),
  );
}

const SHOPIFY_PENALTY = new Set(["mini", "sample", "deluxe", "travel", "gift", "set", "points", "candle"]);

export function matchShopifyProducts(
  name: string,
  brand: string,
  products: Array<Record<string, unknown>>,
): Record<string, unknown>[] {
  const q = tokens(`${brand} ${name}`);
  const nameToks = tokens(name);
  const wantPenalty = new Set([...nameToks].filter((t) => SHOPIFY_PENALTY.has(t)));
  const ranked: Array<{ score: number; product: Record<string, unknown> }> = [];
  for (const p of products) {
    const title = String(p.title ?? p.handle ?? "");
    const vendor = String(p.vendor ?? "");
    const t = tokens(`${vendor} ${title}`);
    const overlap = [...q].filter((x) => t.has(x)).length;
    if (overlap < 2) continue;
    let score = overlap / Math.max(q.size, 1);
    const extraPen = [...tokens(title)].filter((x) => SHOPIFY_PENALTY.has(x) && !wantPenalty.has(x));
    if (extraPen.length) score *= 0.25;
    if (score >= 0.5) ranked.push({ score, product: p });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, 12).map((row) => row.product);
}

/** Share of URL-handle tokens that also appear on the Shopify product handle. */
export function handleOverlap(productUrl: string, product: Record<string, unknown>): number {
  const handle = SHOPIFY_HANDLE_RE.exec(productUrl || "")?.[1] ?? "";
  const other = String(product.handle ?? "");
  const a = offerTokens(handle.replace(/[-_]/g, " "));
  const b = offerTokens(other.replace(/[-_]/g, " "));
  if (!a.size || !b.size) return 0;
  return [...a].filter((token) => b.has(token)).length / a.size;
}

export function matchShopifyProduct(
  name: string,
  brand: string,
  products: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  return matchShopifyProducts(name, brand, products)[0] ?? null;
}

export async function sephoraSearch(brand: string, name: string, cache: Map<string, unknown[]>): Promise<unknown[]> {
  const q = `${brand} ${name}`.trim();
  if (cache.has(q)) return cache.get(q) ?? [];
  const url = SEPHORA_SEARCH.replace("{q}", encodeURIComponent(q));
  const data = (await fetchJson(url)) as { products?: unknown[] } | null;
  const products = Array.isArray(data?.products) ? data.products : [];
  cache.set(q, products);
  return products;
}

export function findSephoraById(products: unknown[], productId: string): Record<string, unknown> | null {
  for (const row of products) {
    if (row && typeof row === "object" && String((row as Record<string, unknown>).productId ?? "") === productId) {
      return row as Record<string, unknown>;
    }
  }
  return null;
}

export async function sephoraProductJson(productId: string, skuId?: string | null): Promise<Record<string, unknown> | null> {
  const qs = new URLSearchParams({ countryCode: "US", loc: "en-US" });
  if (skuId) qs.set("preferedSku", skuId);
  const url = `https://www.sephora.com/api/v2/catalog/products/${productId}?${qs.toString()}`;
  const data = await fetchJson(url, { timeoutMs: 4_000 });
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (rec.currentSku || rec.productId || rec.regularChildSkus) return rec;
    if (rec.product && typeof rec.product === "object") return rec.product as Record<string, unknown>;
  }
  return null;
}

export async function loadShopifyShopProducts(
  origin: string,
  cache: Map<string, Record<string, unknown>[]>,
): Promise<Record<string, unknown>[]> {
  if (cache.has(origin)) return cache.get(origin) ?? [];
  const products: Record<string, unknown>[] = [];
  for (let page = 1; page <= 4; page++) {
    const data = (await fetchJson(`${origin}/products.json?limit=250&page=${page}&currency=USD`, {
      timeoutMs: 10_000,
      referer: `${origin}/`,
    })) as { products?: Record<string, unknown>[] } | null;
    const batch = Array.isArray(data?.products) ? data.products : [];
    products.push(...batch);
    if (batch.length < 250) break;
  }
  cache.set(origin, products);
  return products;
}

export async function quoteCatalogProduct(
  product: CatalogProduct,
  caches: {
    sephoraSearch: Map<string, unknown[]>;
    shopifyJs: Map<string, Record<string, unknown> | null>;
    shopifyShops: Map<string, Record<string, unknown>[]>;
    sephoraProductJsonFails?: number;
    skipSephoraProductJson?: boolean;
  },
): Promise<CatalogQuote | null> {
  const url = product.productUrl ?? "";
  const jsUrl = shopifyJsUrl(url);
  if (jsUrl) {
    let data = caches.shopifyJs.get(jsUrl);
    if (data === undefined) {
      data = ((await fetchJson(jsUrl, { referer: url, timeoutMs: 8_000 })) as Record<string, unknown> | null) ?? null;
      caches.shopifyJs.set(jsUrl, data);
    }
    const stock = stockFromShopify(data, product.name);
    if (stock?.explicit) {
      const prices = data ? pricesFromShopify(data, product.name, product.price, "cents") : null;
      const priced =
        prices && priceNearCatalog(prices.price, prices.listPrice, product.price) ? prices : undefined;
      return { ...stock, source: `shopify-js:${jsUrl}`, ...(priced ?? {}) };
    }
  }

  const pid = sephoraProductId(url);
  if (pid || /sephora\.com/i.test(url)) {
    const hits = await sephoraSearch(product.brand, product.name, caches.sephoraSearch);
    let prod = pid ? findSephoraById(hits, pid) : null;
    if (!prod && pid) {
      const hits2 = await sephoraSearch("Sephora", pid, caches.sephoraSearch);
      prod = findSephoraById(hits2, pid);
    }
    const skuId = prod ? String(((prod.currentSku as Record<string, unknown> | undefined)?.skuId as string) ?? "") : "";
    let detailed: Record<string, unknown> | null = null;
    if (pid && !caches.skipSephoraProductJson) {
      detailed = await sephoraProductJson(pid, skuId || null);
      if (!detailed) {
        caches.sephoraProductJsonFails = (caches.sephoraProductJsonFails ?? 0) + 1;
        if ((caches.sephoraProductJsonFails ?? 0) >= 3) caches.skipSephoraProductJson = true;
      } else {
        caches.sephoraProductJsonFails = 0;
      }
    }
    const stock = stockFromSephoraProduct(detailed) ?? stockFromSephoraProduct(prod) ?? null;
    const priceSrc = detailed ?? prod;
    const prices = priceSrc ? pricesFromSephoraProduct(priceSrc, product.name, product.price) : null;
    if (stock?.explicit) {
      return { ...stock, source: `sephora-api:${pid ?? "search"}`, ...(prices ?? {}) };
    }
  }

  const origin = brandShop(product.brand);
  if (origin) {
    const shopProducts = await loadShopifyShopProducts(origin, caches.shopifyShops);
    const matches = matchShopifyProducts(product.name, product.brand, shopProducts);
    const flags = matches
      .map((row) => stockFromShopify(row, product.name))
      .filter((row): row is StockRead => Boolean(row?.explicit));
    if (flags.length) {
      const avail = flags.some((row) => row.availability !== "out_of_stock") ? "in_stock" : "out_of_stock";
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = "";
      }
      const linkedHere = originHost && url.includes(originHost);
      const priced = linkedHere
        ? matches
            .filter((row) => handleOverlap(url, row) >= 0.45)
            .map((row) => pricesFromShopify(row, product.name, product.price, "dollars"))
            .find((row) => row && priceNearCatalog(row.price, row.listPrice, product.price))
        : undefined;
      return {
        availability: avail,
        restockEstimate: null,
        source: `shopify-products:${origin}`,
        explicit: true,
        ...(priced ?? {}),
      };
    }
  }

  return null;
}

export async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
