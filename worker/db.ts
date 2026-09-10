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
    productUrl: row.product_url,
    tags: parseJson<string[]>(row.tags, []),
    promoCodes: parseJson<PromoCode[]>(row.promo_codes, []),
    dealScore: row.deal_score,
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
