import { applyForcedEvents, MockRetailerFeed } from "./mock-retailer";
import type { Availability, CatalogProduct, PromoCode, ScanOptions, ScanSummary } from "./types";

export type { Availability, AffiliateClient, CatalogProduct, DealProvider, DealSnapshot, PromoCode, ScanOptions, ScanSummary } from "./types";
export { MockRetailerFeed } from "./mock-retailer";

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

/**
 * Periodic deal scan.
 *
 * Cron (no `force`) is a heartbeat only — it must not overwrite honest catalog
 * prices / promo_codes with mock inventions. Manual Notifications → Run deal scan
 * still applies a demo restock / drop.
 */
export async function scanDeals(env: Bindings, options: ScanOptions = {}): Promise<ScanSummary> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const counterRaw = await env.DEALS_CACHE.get("deals:scan-index");
  const scanIndex = Number(counterRaw ?? "0") + 1;

  if (!options.force) {
    const summary: ScanSummary = {
      scannedAt: nowIso,
      updated: 0,
      restocks: [],
      priceDrops: [],
      notificationsCreated: 0,
    };
    await env.DEALS_CACHE.put("deals:scan-index", String(scanIndex));
    await env.DEALS_CACHE.put("deals:last-scan", JSON.stringify(summary), { expirationTtl: 60 * 60 * 24 * 7 });
    return summary;
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, brand, price, currency, promo_codes, deal_score, availability, restock_estimate
     FROM products`,
  ).all<ProductRow>();

  const catalog = (results ?? []).map(toCatalog);
  const provider = new MockRetailerFeed(scanIndex);
  let snapshots = await provider.fetchDeals(catalog);
  snapshots = applyForcedEvents(catalog, snapshots, options.force);

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const restocks: string[] = [];
  const priceDrops: string[] = [];
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

    stmts.push(
      env.DB.prepare(
        `UPDATE products
         SET price = ?, promo_codes = ?, deal_score = ?, availability = ?, restock_estimate = ?, updated_at = ?
         WHERE id = ?`,
      ).bind(
        snap.price,
        JSON.stringify(snap.promoCodes),
        snap.dealScore,
        snap.availability,
        snap.restockEstimate,
        nowIso,
        snap.productId,
      ),
    );

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

  if (stmts.length) await env.DB.batch(stmts);

  const notificationsCreated = await createNotifications(env.DB, events, nowIso);

  const summary: ScanSummary = {
    scannedAt: nowIso,
    updated: snapshots.length,
    restocks,
    priceDrops,
    notificationsCreated,
  };

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
