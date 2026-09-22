/**
 * Verified sell price vs compare-at price from Sephora catalog JSON and
 * Shopify product JSON. No invented markdowns.
 *
 * Keep in sync with scripts/resolve-honest-prices.py.
 */

export interface VerifiedPrice {
  price: number;
  listPrice: number;
  /** Linked page (Sephora PDP or the product URL's own Shopify JSON). */
  linked?: boolean;
}

export function roundMoney(n: number): number {
  return Math.round((n + 1e-9) * 100) / 100;
}

export function markdownPercent(price: number, listPrice?: number | null): number {
  if (listPrice == null || listPrice <= 0 || price <= 0 || price >= listPrice) return 0;
  return Math.round(((listPrice - price) / listPrice) * 100);
}

export function isMiniName(name: string): boolean {
  const n = (name || "").toLowerCase();
  return n.includes("mini") || n.includes("travel size") || n.includes("travel-size");
}

/** Gift sets, samples, and flankers are a different SKU unless the catalog name asks for them. */
export function titleFitsCatalog(catalogName: string, title: string): boolean {
  const name = (catalogName || "").toLowerCase();
  const label = (title || "").toLowerCase();
  const setRe =
    /\b(gift|set|duo|trio|kit|coffret|sampler|discovery|vault|bundle|ritual|collection|sample|refill|jumbo|exclusif|exclusive|candles?)\b/;
  const miniRe = /\b(mini|miniature|travel)\b/;
  if (setRe.test(label) && !setRe.test(name)) return false;
  if (miniRe.test(label) && !isMiniName(name) && !name.includes("travel")) return false;
  if (label.includes(" + ") && !name.includes(" + ")) return false;
  return true;
}

const NAME_STOP = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "in", "on", "to", "de",
  "eau", "parfum", "toilette", "cologne",
]);
/** Product-type words. Shade and line names stay required. */
const NAME_GENERIC = new Set([
  "lipstick", "lip", "colour", "color", "serum", "cream", "primer", "palette",
  "spray", "powder", "gloss", "balm", "mascara", "foundation", "concealer",
  "makeup", "beauty", "shade", "shades", "liquid",
]);
/** A title that adds or drops one of these is a different product (powder vs foundation, mist vs spray). */
const FORM_WORDS = new Set([
  "powder", "mist", "oil", "cream", "serum", "primer", "palette", "lipstick", "mascara",
  "concealer", "foundation", "spray", "shampoo", "conditioner", "gloss", "balm", "blush",
  "liner", "lotion", "wash", "gel", "soap", "scrub", "mask", "toner", "essence",
  "sunscreen", "bronzer", "highlighter", "perfume", "parfum", "toilette", "cologne",
]);

const SIZE_WORDS = new Set([
  "ml", "oz", "fl", "pack", "single", "full", "regular", "default", "title",
  "size", "portable", "pcs", "pc",
]);
const SIZE_TOKEN = /^\d+(?:\.\d+)?(?:ml|oz|g|fl|l|pack)?$/;

function nameWords(text: string): Set<string> {
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[®™’‘]/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !NAME_STOP.has(t)),
  );
}

export interface CatalogTitleRank {
  coverage: number;
  extra: number;
}

/**
 * The source title has to carry the catalog name.
 * One extra descriptor is allowed ("Hair & Body Mist", "Snail Mucin").
 * A different product that only shares a price or a couple of words is not.
 */
export function catalogTitleRank(
  catalogName: string,
  title: string,
  variantTitles: string[] = [],
): CatalogTitleRank | null {
  if (!titleFitsCatalog(catalogName, title)) return null;
  if (/\b(starter|beginners?)\b/i.test(title) && !/\b(starter|beginners?)\b/i.test(catalogName)) return null;
  const ours = nameWords(catalogName);
  const titleToks = nameWords(title);
  const catalogForms = new Set([...ours].filter((t) => FORM_WORDS.has(t)));
  const titleForms = new Set([...titleToks].filter((t) => FORM_WORDS.has(t)));
  if ([...titleForms].some((t) => !catalogForms.has(t))) return null;
  const formSynonym: Record<string, string[]> = { lipstick: ["lip"] };
  for (const word of catalogForms) {
    if (titleForms.has(word)) continue;
    const synonyms = formSynonym[word] ?? [];
    if (!synonyms.some((token) => titleToks.has(token))) return null;
  }
  if (!ours.size) return null;
  const hay = new Set(titleToks);
  for (const variant of variantTitles) {
    for (const token of nameWords(variant)) hay.add(token);
  }
  const distinctive = [...ours].filter((t) => !NAME_GENERIC.has(t));
  const required = distinctive.length ? distinctive : [...ours];
  if (!required.every((t) => hay.has(t))) return null;
  const coverage = [...ours].filter((t) => hay.has(t)).length / ours.size;
  if (coverage + 1e-9 < 2 / 3) return null;
  let extra = 0;
  for (const token of titleToks) {
    if (ours.has(token) || NAME_GENERIC.has(token) || SIZE_WORDS.has(token) || SIZE_TOKEN.test(token)) continue;
    extra += 1;
  }
  if (extra > 1) return null;
  return { coverage, extra };
}

/** Skip sample listings and titles that are a different SKU than the catalog name. */
export function shopifyListingFits(catalogName: string, data: Record<string, unknown>): boolean {
  const title = String(data.title ?? "");
  if (title && !titleFitsCatalog(catalogName, title)) return false;
  const type = String(data.type ?? data.product_type ?? "");
  const tagsRaw = data.tags;
  const tags = Array.isArray(tagsRaw) ? tagsRaw.map((tag) => String(tag)).join(" ") : String(tagsRaw ?? "");
  if (/\bsample\b/i.test(`${type} ${tags}`) && !/\bsample\b/i.test(catalogName)) return false;
  return true;
}

/** Reject sample-sized prices that are not the SKU we already show. */
export function priceIsPlausible(next: number, prior: number | null | undefined): boolean {
  if (prior == null || !(prior > 0) || !(next > 0)) return next > 0;
  return next >= prior * 0.45 && next <= prior * 1.5;
}

function uniqMoney(values: number[]): number[] {
  return [...new Set(values.map((v) => roundMoney(v)))].sort((a, b) => a - b);
}

/**
 * Pick the size that matches the catalog SKU.
 * A published range ("$90 - $330") is not a license to advertise the travel
 * spray. If the current catalog price sits inside the range, keep that size.
 */
export function pickFromRange(values: number[], catalogName: string, prior: number | null): number | null {
  const uniq = uniqMoney(values.filter((v) => v > 0 && v < 20_000));
  if (!uniq.length) return null;
  const lo = uniq[0];
  const hi = uniq[uniq.length - 1];
  if (isMiniName(catalogName)) return lo;
  if (prior == null || !(prior > 0)) return hi;
  if (prior < lo - 0.51) return lo;
  if (prior > hi + 0.51) return hi;
  const nearest = uniq.reduce((best, v) => (Math.abs(v - prior) < Math.abs(best - prior) ? v : best));
  if (Math.abs(nearest - prior) <= Math.max(3, nearest * 0.12)) return nearest;
  return roundMoney(prior);
}

function moneyValues(raw: unknown): number[] {
  if (raw == null) return [];
  if (typeof raw === "number" && raw > 0 && raw < 20_000) return [raw];
  const out: number[] = [];
  const re = /\$?\s*([0-9]+(?:\.[0-9]+)?)/g;
  const text = String(raw);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[1]);
    if (n > 0 && n < 20_000) out.push(n);
  }
  return out;
}

/**
 * Sephora search `currentSku`.
 * `salePrice` counts only when it is below every list price (a range floor is not a sale).
 * `valuePrice` is the compare-at when the sell price is a single list price.
 */
export function pricesFromSephoraProduct(
  product: Record<string, unknown>,
  catalogName: string,
  prior: number | null,
): { price: number; listPrice: number } | null {
  const cs = (product.currentSku as Record<string, unknown> | undefined) ?? {};
  const lists = uniqMoney(moneyValues(cs.listPrice));
  const sales = uniqMoney(moneyValues(cs.salePrice));
  const values = uniqMoney(moneyValues(cs.valuePrice));
  if (!lists.length && !sales.length) return null;

  const realSale = sales.length > 0 && lists.length > 0 && Math.min(...sales) + 0.009 < Math.min(...lists);
  let current: number;
  let listed: number;
  if (realSale) {
    if (lists.length === sales.length && lists.length > 1) {
      const anchor = pickFromRange(lists, catalogName, prior) ?? lists[lists.length - 1];
      let idx = 0;
      lists.forEach((v, i) => {
        if (Math.abs(v - anchor) < Math.abs(lists[idx] - anchor)) idx = i;
      });
      listed = lists[idx];
      current = sales[idx];
    } else {
      current = Math.min(...sales);
      listed = Math.min(...lists);
    }
    if (current > listed) current = listed;
  } else {
    current = pickFromRange(lists.length ? lists : sales, catalogName, prior) ?? Math.min(...(lists.length ? lists : sales));
    listed = current;
  }

  if (listed <= current + 0.009 && values.length && lists.length <= 1) {
    const higher = values.filter((v) => v > current + 0.009);
    if (higher.length === 1 || (higher.length > 1 && Math.max(...higher) - Math.min(...higher) < 0.02)) {
      listed = higher[0];
    }
  }

  if (!(current > 0)) return null;
  const price = roundMoney(current);
  const listPrice = roundMoney(listed >= price ? listed : price);
  return { price, listPrice };
}

/** `.js` prices are integer cents. `products.json` prices are dollar strings. A decimal string is always dollars. */
export function shopifyAmount(raw: unknown, unit: "cents" | "dollars"): number | null {
  if (raw == null || raw === "" || raw === 0 || raw === "0" || raw === "0.00") return null;
  const text = String(raw).trim();
  const n = typeof raw === "number" ? raw : Number.parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  const asDollars = unit === "dollars" || (typeof raw === "string" && text.includes("."));
  const value = asDollars ? n : n / 100;
  if (value <= 0 || value >= 20_000) return null;
  return roundMoney(value);
}

export function pricesFromShopify(
  data: Record<string, unknown>,
  catalogName: string,
  opts: { unit?: "cents" | "dollars"; prior?: number | null } = {},
): { price: number; listPrice: number } | null {
  const unit = opts.unit ?? "cents";
  const prior = opts.prior ?? null;
  const variants = (data.variants as Record<string, unknown>[] | undefined) ?? [];
  const sourceRows = variants.length ? variants : [data];
  const rows: Array<{ price: number; listPrice: number; title: string }> = [];
  for (const variant of sourceRows) {
    const price = shopifyAmount(variant.price, unit);
    if (price == null) continue;
    const compare = shopifyAmount(variant.compare_at_price, unit);
    const listed = compare != null && compare > price + 0.009 ? compare : price;
    rows.push({
      price,
      listPrice: listed,
      title: String(variant.title ?? variant.option1 ?? ""),
    });
  }
  if (!rows.length) return null;

  const fitting = rows.filter((row) => titleFitsCatalog(catalogName, row.title));
  const unnamed = rows.filter((row) => !row.title.trim() || /^default title$/i.test(row.title.trim()));
  if (!fitting.length && !unnamed.length) return null;
  let pool = fitting.length ? fitting : unnamed;
  if (prior != null && prior > 0) {
    const plausible = pool.filter((row) => priceIsPlausible(row.price, prior));
    if (!plausible.length) return null;
    pool = plausible;
  }
  const chosen =
    prior != null && prior > 0
      ? pool.reduce((best, row) => (Math.abs(row.price - prior) < Math.abs(best.price - prior) ? row : best))
      : pool.reduce((best, row) => (row.price < best.price ? row : best));

  const price = roundMoney(chosen.price);
  const listPrice = roundMoney(chosen.listPrice >= price ? chosen.listPrice : price);
  return { price, listPrice };
}

/**
 * Real compare-at wins, and the deepest verified markdown wins (raise an understated %).
 * With no real markdown, keep the linked page's price, otherwise the lowest verified price,
 * and do not invent a percent.
 */
export function chooseVerifiedPrice(quotes: VerifiedPrice[]): { price: number; listPrice: number } | null {
  const usable = quotes.filter((q) => q.price > 0 && q.listPrice > 0 && q.listPrice + 0.001 >= q.price - 0.001);
  if (!usable.length) return null;
  const real = usable.filter((q) => q.listPrice > q.price + 0.009);
  if (real.length) {
    real.sort(
      (a, b) => markdownPercent(b.price, b.listPrice) - markdownPercent(a.price, a.listPrice) || a.price - b.price,
    );
    return { price: roundMoney(real[0].price), listPrice: roundMoney(real[0].listPrice) };
  }
  const linked = usable.filter((q) => q.linked);
  const pool = linked.length ? linked : usable;
  const lowest = pool.reduce((a, b) => (a.price <= b.price ? a : b));
  const price = roundMoney(lowest.price);
  return { price, listPrice: price };
}
