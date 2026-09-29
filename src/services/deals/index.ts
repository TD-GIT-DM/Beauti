import { refreshPreorders } from "./preorder-scan";
import { quoteCatalogProduct, snapshotFromQuote } from "./catalog-sources";
import {
  advanceCatalogCursor,
  HostScheduler,
  kvHostCooldown,
  MIN_CATALOG_REMAINING,
  planCatalogIds,
  SubrequestBudget,
  type OutboundFetch,
} from "./fetch-budget";
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
    .prepare(
      `SELECT device_id, product_id FROM wishlist
       WHERE product_id IN (${placeholders}) AND device_id NOT LIKE 'acct:%'`,
    )
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

async function priorityIds(env: Bindings): Promise<string[]> {
  const wishlistedOos = await env.DB.prepare(
    `SELECT DISTINCT p.id
     FROM wishlist w
     JOIN products p ON p.id = w.product_id
     WHERE p.availability = 'out_of_stock'`,
  ).all<{ id: string }>();
  return (wishlistedOos.results ?? []).map((row) => row.id);
}

async function scanCatalog(
  env: Bindings,
  catalog: CatalogProduct[],
  nowIso: string,
  outbound: OutboundFetch,
): Promise<ScanSummary> {
  const sorted = [...catalog].sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map(sorted.map((product) => [product.id, product]));
  const priority = await priorityIds(env);
  const rawCursor = await env.DEALS_CACHE.get("deals:avail-cursor");
  const cursor = Number(rawCursor ?? "0") || 0;
  const planned = planCatalogIds(
    sorted.map((product) => product.id),
    cursor,
    priority,
  );

  const caches = {
    sephoraSearch: new Map<string, unknown[]>(),
    shopifyJs: new Map<string, Record<string, unknown> | null>(),
    shopifyShops: new Map<string, Record<string, unknown>[]>(),
  };

  const attempted: CatalogProduct[] = [];
  const quotes: Array<Awaited<ReturnType<typeof quoteCatalogProduct>>> = [];
  for (const id of planned) {
    if (outbound.budget.remaining() < MIN_CATALOG_REMAINING) {
      console.log(
        JSON.stringify({
          event: "catalog_budget_stop",
          attempted: attempted.length,
          planned: planned.length,
          subrequests: outbound.budget.used,
        }),
      );
      break;
    }
    const product = byId.get(id);
    if (!product) continue;
    attempted.push(product);
    try {
      quotes.push(await quoteCatalogProduct(product, caches, outbound));
    } catch (err) {
      console.log(JSON.stringify({ event: "catalog_quote_fail", id: product.id, err: String(err) }));
      quotes.push(null);
    }
  }

  const nextCursor = advanceCatalogCursor(sorted.length, cursor, attempted.map((product) => product.id), new Set(priority));
  await env.DEALS_CACHE.put("deals:avail-cursor", String(nextCursor));

  const snapshots = [];
  let unverified = 0;
  for (let i = 0; i < attempted.length; i++) {
    const quote = quotes[i];
    const priceVerified = quote?.price != null && quote.price > 0 && quote.listPrice != null && quote.listPrice > 0;
    if (!quote || (!quote.explicit && !priceVerified)) {
      unverified += 1;
      continue;
    }
    snapshots.push(snapshotFromQuote(attempted[i], quote));
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
    fetched: attempted.length,
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

function emptySummary(nowIso: string, mode: ScanSummary["mode"]): ScanSummary {
  return {
    scannedAt: nowIso,
    updated: 0,
    restocks: [],
    priceDrops: [],
    notificationsCreated: 0,
    mode,
    fetched: 0,
    unverified: 0,
  };
}

async function rememberScan(env: Bindings, scanIndex: number, summary: ScanSummary): Promise<void> {
  await env.DEALS_CACHE.put("deals:scan-index", String(scanIndex));
  await env.DEALS_CACHE.put("deals:last-scan", JSON.stringify(summary), { expirationTtl: 60 * 60 * 24 * 7 });
}

/**
 * Periodic deal scan.
 *
 * Pre-order checks (`job: "preorders"`) and catalog quotes (`job: "catalog"`)
 * run on separate cron triggers. Each stays within the outbound subrequest
 * budget. `job: "both"` checks pre-orders first, then spends what remains on
 * the catalog. Compare-at prices raise the stored discount. A quote with no
 * compare-at stores the sell price and no percent off. Manual Run deal scan
 * still applies a demo restock / drop and does not call retailer APIs.
 */
export async function scanDeals(env: Bindings, options: ScanOptions = {}): Promise<ScanSummary> {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();

  const counterRaw = await env.DEALS_CACHE.get("deals:scan-index");
  const scanIndex = Number(counterRaw ?? "0") + 1;

  if (options.force) {
    const catalog = await loadCatalog(env.DB);
    const summary = await scanDemo(env, catalog, scanIndex, options.force, nowIso);
    await rememberScan(env, scanIndex, summary);
    return summary;
  }

  const job = options.job ?? "both";
  const outbound: OutboundFetch = {
    budget: new SubrequestBudget(),
    hosts: new HostScheduler({ store: kvHostCooldown(env.DEALS_CACHE) }),
  };

  let summary = emptySummary(nowIso, job === "preorders" ? "preorders" : "catalog");

  if (job === "preorders" || job === "both") {
    try {
      const preorders = await refreshPreorders(env, now, outbound);
      summary.preordersChecked = preorders.checked;
      summary.preordersAdded = preorders.added;
      summary.preordersLive = preorders.live;
      summary.preordersRemoved = preorders.removed;
      summary.notificationsCreated += preorders.notificationsCreated;
      if (job === "preorders") summary.mode = "preorders";
    } catch (err) {
      console.log(JSON.stringify({ event: "preorder_refresh_fail", err: String(err) }));
    }
  }

  if (job === "catalog" || job === "both") {
    const catalog = await loadCatalog(env.DB);
    const catalogSummary = await scanCatalog(env, catalog, nowIso, outbound);
    summary = {
      ...catalogSummary,
      preordersChecked: summary.preordersChecked,
      preordersAdded: summary.preordersAdded,
      preordersLive: summary.preordersLive,
      preordersRemoved: summary.preordersRemoved,
      notificationsCreated: summary.notificationsCreated + catalogSummary.notificationsCreated,
      mode: "catalog",
    };
  }

  summary.subrequests = outbound.budget.used;
  await rememberScan(env, scanIndex, summary);
  return summary;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
