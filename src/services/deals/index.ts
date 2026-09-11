import { quoteCatalogProduct, mapPool, snapshotFromQuote } from "./catalog-sources";
import { applyForcedEvents, MockRetailerFeed } from "./mock-retailer";
import type { Availability, CatalogProduct, PromoCode, ScanOptions, ScanSummary } from "./types";

export type { Availability, AffiliateClient, CatalogProduct, DealProvider, DealSnapshot, PromoCode, ScanOptions, ScanSummary } from "./types";
export { MockRetailerFeed } from "./mock-retailer";

/** Products refreshed per cron tick (15 min). Full catalog rotates every few hours. */
const CATALOG_BATCH = 48;
const FETCH_CONCURRENCY = 6;

interface Bindings {
  DB: D1Database;
  DEALS_CACHE: KVNamespace;
}

interface ProductRow {
  id: string;
  name: string;
  brand: string;
  price: number;
  list_price?: number | null;
  currency: string;
  promo_codes: string;
  deal_score: number;
  availability: Availability;
  restock_estimate: string | null;
  product_url?: string | null;
}

function parsePromos(raw: string): PromoCode[] {
  try {
    const parsed = JSON.parse(raw) as PromoCode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toCatalog(row: ProductRow): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: row.price,
    listPrice: row.list_price != null && row.list_price > 0 ? row.list_price : null,
    currency: row.currency,
    promoCodes: parsePromos(row.promo_codes),
    dealScore: row.deal_score,
    availability: row.availability,
    restockEstimate: row.restock_estimate,
    productUrl: row.product_url ?? null,
  };
}

async function createNotifications(
  db: D1Database,
  events: Array<{ productId: string; type: "restock" | "price_drop"; title: string; body: string }>,
  now: string,
): Promise<number> {
  if (!events.length) return 0;

  const productIds = [...new Set(events.map((e) => e.productId))];
  const placeholders = productIds.map(() => "?").join(",");
  const wishlisted = await db
    .prepare(`SELECT device_id, product_id FROM wishlist WHERE product_id IN (${placeholders})`)
    .bind(...productIds)
    .all<{ device_id: string; product_id: string }>();

  const watchers = new Map<string, string[]>();
  for (const row of wishlisted.results ?? []) {
    const list = watchers.get(row.product_id) ?? [];
    list.push(row.device_id);
    watchers.set(row.product_id, list);
  }

  let created = 0;
  const stmts: D1PreparedStatement[] = [];
  for (const event of events) {
    const devices = watchers.get(event.productId) ?? [];
    for (const deviceId of devices) {
      stmts.push(
        db
          .prepare(
            `INSERT INTO notifications (id, device_id, product_id, type, title, body, read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
          )
          .bind(crypto.randomUUID(), deviceId, event.productId, event.type, event.title, event.body, now),
      );
      created += 1;
    }
  }

  if (stmts.length) await db.batch(stmts);
  return created;
}

async function loadCatalog(db: D1Database): Promise<CatalogProduct[]> {
  const { results } = await db.prepare(`SELECT * FROM products`).all<ProductRow>();
  return (results ?? []).map(toCatalog);
}

function persistSnapshots(
  env: Bindings,
  catalog: CatalogProduct[],
  snapshots: import("./types").DealSnapshot[],
  nowIso: string,
): {
  stmts: D1PreparedStatement[];
  restocks: string[];
  priceDrops: string[];
  becameOutOfStock: string[];
  events: Array<{ productId: string; type: "restock" | "price_drop"; title: string; body: string }>;
} {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const restocks: string[] = [];
  const priceDrops: string[] = [];
  const becameOutOfStock: string[] = [];
  const events: Array<{ productId: string; type: "restock" | "price_drop"; title: string; body: string }> = [];
  const stmts: D1PreparedStatement[] = [];

  for (const snap of snapshots) {
    const previous = byId.get(snap.productId);
    if (!previous) continue;

    const wasUnavailable = previous.availability === "out_of_stock";
    const nowAvailable = snap.availability === "in_stock" || snap.availability === "limited";
    const dropped = snap.price < previous.price * 0.97;

    if (wasUnavailable && nowAvailable) {
      restocks.push(snap.productId);
      events.push({
        productId: snap.productId,
        type: "restock",
        title: `${previous.name} is back`,
        body: `${previous.brand} is in stock again${snap.promoCodes[0] ? ` · code ${snap.promoCodes[0].code}` : ""}.`,
      });
    }

    if (!wasUnavailable && snap.availability === "out_of_stock") {
      becameOutOfStock.push(snap.productId);
    }

    if (dropped && nowAvailable) {
      priceDrops.push(snap.productId);
      const pct = Math.round((1 - snap.price / previous.price) * 100);
      events.push({
        productId: snap.productId,
        type: "price_drop",
        title: `${previous.name} dropped ${pct}%`,
        body: `Now ${formatMoney(snap.price, snap.currency)} (was ${formatMoney(previous.price, previous.currency)}).`,
      });
    }

    const restock = snap.availability === "out_of_stock" ? snap.restockEstimate : null;
    if (snap.listPrice != null && snap.listPrice > 0) {
      stmts.push(
        env.DB.prepare(
          `UPDATE products
           SET price = ?, list_price = ?, deal_score = ?, availability = ?, restock_estimate = ?, updated_at = ?
           WHERE id = ?`,
        ).bind(snap.price, snap.listPrice, snap.dealScore, snap.availability, restock, nowIso, snap.productId),
      );
    } else {
      stmts.push(
        env.DB.prepare(
          `UPDATE products
           SET price = ?, deal_score = ?, availability = ?, restock_estimate = ?, updated_at = ?
           WHERE id = ?`,
        ).bind(snap.price, snap.dealScore, snap.availability, restock, nowIso, snap.productId),
      );
    }

    if (Math.abs(snap.price - previous.price) >= 0.01) {
      stmts.push(
        env.DB.prepare(`INSERT INTO price_history (product_id, price, recorded_at) VALUES (?, ?, ?)`).bind(
          snap.productId,
          snap.price,
          nowIso,
        ),
      );
    }
  }

  return { stmts, restocks, priceDrops, becameOutOfStock, events };
}

async function pickCatalogBatch(env: Bindings, catalog: CatalogProduct[]): Promise<CatalogProduct[]> {
  if (catalog.length <= CATALOG_BATCH) return catalog;

  const wishlistedOos = await env.DB.prepare(
    `SELECT DISTINCT p.id
     FROM wishlist w
     JOIN products p ON p.id = w.product_id
     WHERE p.availability = 'out_of_stock'`,
  ).all<{ id: string }>();
  const priorityIds = new Set((wishlistedOos.results ?? []).map((r) => r.id));
  const priority = catalog.filter((p) => priorityIds.has(p.id));

  const sorted = [...catalog].sort((a, b) => a.id.localeCompare(b.id));
  const rawCursor = await env.DEALS_CACHE.get("deals:avail-cursor");
  const cursor = Number(rawCursor ?? "0") || 0;
  const rotated: CatalogProduct[] = [];
  for (let i = 0; i < sorted.length && rotated.length < CATALOG_BATCH; i++) {
    const item = sorted[(cursor + i) % sorted.length];
    if (!priorityIds.has(item.id)) rotated.push(item);
  }
  const nextCursor = (cursor + rotated.length) % Math.max(sorted.length, 1);
  await env.DEALS_CACHE.put("deals:avail-cursor", String(nextCursor));

  const combined: CatalogProduct[] = [];
  const seen = new Set<string>();
  for (const p of [...priority, ...rotated]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    combined.push(p);
    if (combined.length >= CATALOG_BATCH) break;
  }
  return combined;
}

async function scanCatalog(env: Bindings, catalog: CatalogProduct[], nowIso: string): Promise<ScanSummary> {
  const batch = await pickCatalogBatch(env, catalog);
  const caches = {
    sephoraSearch: new Map<string, unknown[]>(),
    shopifyJs: new Map<string, Record<string, unknown> | null>(),
    shopifyShops: new Map<string, Record<string, unknown>[]>(),
  };

  const quotes = await mapPool(batch, FETCH_CONCURRENCY, async (product) => {
    try {
      return await quoteCatalogProduct(product, caches);
    } catch (err) {
      console.log(JSON.stringify({ event: "catalog_quote_fail", id: product.id, err: String(err) }));
      return null;
    }
  });

  const snapshots = [];
  let unverified = 0;
  for (let i = 0; i < batch.length; i++) {
    const quote = quotes[i];
    if (!quote?.explicit) {
      unverified += 1;
      continue;
    }
    snapshots.push(snapshotFromQuote(batch[i], quote));
  }

  const { stmts, restocks, priceDrops, becameOutOfStock, events } = persistSnapshots(
    env,
    catalog,
    snapshots,
    nowIso,
  );
  if (stmts.length) await env.DB.batch(stmts);
  const notificationsCreated = await createNotifications(env.DB, events, nowIso);

  return {
    scannedAt: nowIso,
    updated: snapshots.length,
    restocks,
    priceDrops,
    notificationsCreated,
    mode: "catalog",
    becameOutOfStock,
    fetched: batch.length,
    unverified,
  };
}

async function scanDemo(
  env: Bindings,
  catalog: CatalogProduct[],
  scanIndex: number,
  force: NonNullable<ScanOptions["force"]>,
  nowIso: string,
): Promise<ScanSummary> {
  const provider = new MockRetailerFeed(scanIndex);
  let snapshots = await provider.fetchDeals(catalog);
  snapshots = applyForcedEvents(catalog, snapshots, force);
  const { stmts, restocks, priceDrops, events } = persistSnapshots(env, catalog, snapshots, nowIso);
  if (stmts.length) await env.DB.batch(stmts);
  const notificationsCreated = await createNotifications(env.DB, events, nowIso);
  return {
    scannedAt: nowIso,
    updated: snapshots.length,
    restocks,
    priceDrops,
    notificationsCreated,
    mode: "demo",
    fetched: catalog.length,
    unverified: 0,
  };
}

/**
 * Periodic deal scan.
 *
 * Cron (no `force`) refreshes availability + price from Sephora catalog JSON
 * and Shopify product JSON. Manual Notifications → Run deal scan still applies
 * a demo restock / drop and does not call retailer APIs.
 */
export async function scanDeals(env: Bindings, options: ScanOptions = {}): Promise<ScanSummary> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const counterRaw = await env.DEALS_CACHE.get("deals:scan-index");
  const scanIndex = Number(counterRaw ?? "0") + 1;

  const catalog = await loadCatalog(env.DB);
  const summary = options.force
    ? await scanDemo(env, catalog, scanIndex, options.force, nowIso)
    : await scanCatalog(env, catalog, nowIso);

  await env.DEALS_CACHE.put("deals:scan-index", String(scanIndex));
  await env.DEALS_CACHE.put("deals:last-scan", JSON.stringify(summary), { expirationTtl: 60 * 60 * 24 * 7 });

  return summary;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
