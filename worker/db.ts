import { productDiscountPercent } from "../src/lib/discount";
import type { Availability, PromoCode } from "../src/services/deals";

export interface ProductRecord {
  id: string;
  name: string;
  brand: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  productUrl: string;
  tags: string[];
  promoCodes: PromoCode[];
  dealScore: number;
  discountPercent: number;
  availability: Availability;
  restockEstimate: string | null;
  priceHistory: Array<{ price: number; recordedAt: string }>;
  wishlisted?: boolean;
}

export interface ProductRow {
  id: string;
  name: string;
  brand: string;
  description: string;
  image_url: string;
  price: number;
  currency: string;
  product_url: string;
  tags: string;
  promo_codes: string;
  deal_score: number;
  availability: Availability;
  restock_estimate: string | null;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Prefer real PDPs. Rewrite fake Sephora slugs / Google stopgaps to Sephora keyword search. */
function resolveProductUrl(url: string, brand: string, name: string): string {
  const trimmed = (url || "").trim();
  const query = encodeURIComponent(`${brand} ${name}`.trim());
  const sephoraSearch = `https://www.sephora.com/search?keyword=${query}`;
  const fakeSephora =
    /^https:\/\/www\.sephora\.com\/product\/[^/?#]+$/i.test(trimmed) &&
    !/-P\d+/i.test(trimmed);
  const googleStopgap = /^https:\/\/www\.google\.com\/search\?/i.test(trimmed);
  if (fakeSephora || googleStopgap || !trimmed) {
    return sephoraSearch;
  }
  return trimmed;
}

export function mapProduct(
  row: ProductRow,
  extras: { priceHistory?: ProductRecord["priceHistory"]; wishlisted?: boolean } = {},
): ProductRecord {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    description: row.description,
    imageUrl: row.image_url,
    price: row.price,
    currency: row.currency,
    productUrl: resolveProductUrl(row.product_url, row.brand, row.name),
    tags: parseJson<string[]>(row.tags, []),
    promoCodes: parseJson<PromoCode[]>(row.promo_codes, []),
    dealScore: row.deal_score,
    discountPercent: 0,
    availability: row.availability,
    restockEstimate: row.restock_estimate,
    priceHistory: extras.priceHistory ?? [],
    wishlisted: extras.wishlisted,
  };
}

export function deviceIdFrom(request: Request): string | null {
  const header = request.headers.get("X-Device-Id")?.trim();
  if (header) return header;
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)beauti_device=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function deviceCookie(id: string): string {
  return `beauti_device=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export async function wishlistedIds(db: D1Database, deviceId: string | null): Promise<Set<string>> {
  if (!deviceId) return new Set();
  const { results } = await db
    .prepare(`SELECT product_id FROM wishlist WHERE device_id = ?`)
    .bind(deviceId)
    .all<{ product_id: string }>();
  return new Set((results ?? []).map((r) => r.product_id));
}

export function withDiscount(
  product: ProductRecord,
  peakHistoryPrice?: number,
): ProductRecord {
  return {
    ...product,
    discountPercent: productDiscountPercent(
      product.promoCodes,
      product.price,
      product.priceHistory,
      peakHistoryPrice,
    ),
  };
}

export async function loadPeakPrices(db: D1Database): Promise<Map<string, number>> {
  const { results } = await db
    .prepare(`SELECT product_id, MAX(price) AS peak FROM price_history GROUP BY product_id`)
    .all<{ product_id: string; peak: number }>();
  return new Map((results ?? []).map((row) => [row.product_id, row.peak]));
}

export async function decorateProducts(
  db: D1Database,
  rows: ProductRow[],
  loved: Set<string>,
): Promise<ProductRecord[]> {
  const peaks = await loadPeakPrices(db);
  return rows.map((row) =>
    withDiscount(mapProduct(row, { wishlisted: loved.has(row.id) }), peaks.get(row.id)),
  );
}

export async function loadHistory(
  db: D1Database,
  productId: string,
): Promise<ProductRecord["priceHistory"]> {
  const { results } = await db
    .prepare(
      `SELECT price, recorded_at FROM price_history WHERE product_id = ? ORDER BY recorded_at ASC LIMIT 24`,
    )
    .bind(productId)
    .all<{ price: number; recorded_at: string }>();
  return (results ?? []).map((r) => ({ price: r.price, recordedAt: r.recorded_at }));
}
