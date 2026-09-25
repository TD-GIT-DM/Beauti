/**
 * Re-check pre-order rows from Shopify product JSON, plus the product page
 * when a coming-soon tag is paired with stock or a ship month might be posted.
 * A failed fetch does not refresh last_verified_at. Rows older than 36 hours
 * drop off the API until a later check succeeds.
 */

import { honestDealScore } from "../../lib/discount";
import {
  applyReading,
  entryFromReading,
  entryFromRow,
  httpsProductUrl,
  interpretShopifyProduct,
  shopifyInStock,
  shopifyPreorderId,
  shopifySignal,
  tagList,
  type PreorderEntry,
  type PreorderRow,
  type ShopifyReadInput,
  type SourceReading,
} from "../../lib/preorder";
import { BRAND_SHOPS, CATALOG_UA } from "./catalog-sources";

interface Bindings {
  DB: D1Database;
  DEALS_CACHE: KVNamespace;
}

export interface PreorderScanStats {
  checked: number;
  added: number;
  live: number;
  removed: number;
  notificationsCreated: number;
}

const SHOPS = [...new Set([...Object.values(BRAND_SHOPS), "https://www.makeupbymario.com"])];
const SHOPS_PER_TICK = 3;
const REVERIFY_LIMIT = 24;

async function fetchText(url: string, referer: string): Promise<{ status: number; text: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": CATALOG_UA,
        Accept: "application/json,text/html;q=0.9",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: referer,
      },
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, text };
  } catch {
    return { status: 0, text: null };
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function jsUrl(productUrl: string): string | null {
  const clean = httpsProductUrl(productUrl);
  if (!clean) return null;
  if (!/\/products\/[^/]+$/i.test(new URL(clean).pathname)) return null;
  return `${clean}.js`;
}

async function readProduct(productUrl: string, now: Date, wantPage: boolean): Promise<SourceReading> {
  const source = jsUrl(productUrl);
  if (!source) return { ok: false };
  const productRes = await fetchText(source, productUrl);
  if (productRes.status === 404 || productRes.status === 410) {
    return { ok: true, found: false, stillPending: false, nowLive: false };
  }
  if (!productRes.text || productRes.status < 200 || productRes.status >= 300) return { ok: false };
  let product: ShopifyReadInput | null = null;
  try {
    product = JSON.parse(productRes.text) as ShopifyReadInput;
  } catch {
    return { ok: false };
  }
  const tags = tagList(product.tags);
  const signal = shopifySignal(tags, shopifyInStock(product));
  const loadPage = wantPage || signal === "preorder" || signal === "coming_ambiguous";
  let pageHtml: string | null = null;
  let pageLoaded = false;
  if (loadPage) {
    const page = await fetchText(productUrl, productUrl);
    if (page.status >= 200 && page.status < 300 && page.text) {
      pageHtml = page.text;
      pageLoaded = true;
    }
  }
  return interpretShopifyProduct(product, {
    host: hostOf(productUrl),
    productUrl,
    sourceUrl: productUrl,
    unit: "cents",
    pageHtml,
    pageLoaded,
    now,
  });
}

async function loadRows(db: D1Database): Promise<PreorderEntry[]> {
  const { results } = await db.prepare(`SELECT * FROM preorders`).all<PreorderRow>();
  const entries: PreorderEntry[] = [];
  for (const row of results ?? []) {
    const entry = entryFromRow(row);
    if (entry) entries.push(entry);
  }
  return entries;
}

async function saveEntry(db: D1Database, entry: PreorderEntry): Promise<void> {
  await db
    .prepare(
      `UPDATE preorders
       SET kind = ?, name = ?, brand = ?, description = ?, image_url = ?, product_url = ?, source_url = ?,
           price = ?, list_price = ?, announced_percent = ?, discount_confirmed = ?, currency = ?,
           starts_at = ?, ends_at = ?, date_precision = ?, date_label = ?, status = ?,
           linked_product_id = ?, last_verified_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      entry.kind,
      entry.name,
      entry.brand,
      entry.description,
      entry.imageUrl,
      entry.productUrl,
      entry.sourceUrl,
      entry.price,
      entry.listPrice,
      entry.announcedPercent,
      entry.discountConfirmed ? 1 : 0,
      entry.currency,
      entry.startsAt,
      entry.endsAt,
      entry.datePrecision,
      entry.dateLabel,
      entry.status,
      entry.linkedProductId,
      entry.lastVerifiedAt,
      entry.updatedAt,
      entry.id,
    )
    .run();
}

async function insertEntry(db: D1Database, entry: PreorderEntry): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO preorders (
         id, kind, name, brand, description, image_url, product_url, source_url,
         price, list_price, announced_percent, discount_confirmed, currency,
         starts_at, ends_at, date_precision, date_label, status, linked_product_id,
         last_verified_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      entry.id,
      entry.kind,
      entry.name,
      entry.brand,
      entry.description,
      entry.imageUrl,
      entry.productUrl,
      entry.sourceUrl,
      entry.price,
      entry.listPrice,
      entry.announcedPercent,
      entry.discountConfirmed ? 1 : 0,
      entry.currency,
      entry.startsAt,
      entry.endsAt,
      entry.datePrecision,
      entry.dateLabel,
      entry.status,
      entry.linkedProductId,
      entry.lastVerifiedAt,
      entry.createdAt,
      entry.updatedAt,
    )
    .run();
}

async function publishLive(db: D1Database, entry: PreorderEntry, nowIso: string): Promise<string | null> {
  if (entry.price == null || entry.price <= 0) return null;
  const list = entry.listPrice != null && entry.listPrice > entry.price ? entry.listPrice : entry.price;
  const score = honestDealScore(entry.price, entry.discountConfirmed ? list : entry.price, "in_stock");
  const image = entry.imageUrl ?? "";
  const existing = await db
    .prepare(`SELECT id FROM products WHERE product_url = ? LIMIT 1`)
    .bind(entry.productUrl)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare(
        `UPDATE products
         SET price = ?, list_price = ?, availability = 'in_stock', restock_estimate = NULL, deal_score = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(entry.price, list, score, nowIso, existing.id)
      .run();
    return existing.id;
  }
  await db
    .prepare(
      `INSERT OR IGNORE INTO products (
         id, name, brand, description, image_url, price, list_price, currency, product_url,
         tags, promo_codes, deal_score, availability, restock_estimate, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, 'in_stock', NULL, ?, ?)`,
    )
    .bind(
      entry.id,
      entry.name,
      entry.brand,
      entry.description,
      image,
      entry.price,
      list,
      entry.currency || "USD",
      entry.productUrl,
      score,
      nowIso,
      nowIso,
    )
    .run();
  const row = await db
    .prepare(`SELECT id FROM products WHERE id = ? OR product_url = ? LIMIT 1`)
    .bind(entry.id, entry.productUrl)
    .first<{ id: string }>();
  if (!row) return null;
  await db
    .prepare(
      `UPDATE products
       SET price = ?, list_price = ?, availability = 'in_stock', restock_estimate = NULL, deal_score = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(entry.price, list, score, nowIso, row.id)
    .run();
  return row.id;
}

async function transferWishes(db: D1Database, entry: PreorderEntry, productId: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO wishlist (device_id, product_id, user_id, created_at)
       SELECT device_id, ?, user_id, ?
       FROM preorder_wishlist
       WHERE preorder_id = ?`,
    )
    .bind(productId, nowIso, entry.id)
    .run();
}

async function notifyLive(db: D1Database, entry: PreorderEntry, productId: string, nowIso: string): Promise<number> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT device_id FROM preorder_wishlist
       WHERE preorder_id = ? AND device_id NOT LIKE 'acct:%'`,
    )
    .bind(entry.id)
    .all<{ device_id: string }>();
  const devices = results ?? [];
  if (!devices.length) return 0;
  const stmts = devices.map((row) =>
    db
      .prepare(
        `INSERT INTO notifications (id, device_id, product_id, type, title, body, read, created_at)
         VALUES (?, ?, ?, 'restock', ?, ?, 0, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        row.device_id,
        productId,
        `${entry.name} is available`,
        `${entry.brand} can be purchased now.`,
        nowIso,
      ),
  );
  await db.batch(stmts);
  return stmts.length;
}

async function rotateShops(env: Bindings): Promise<string[]> {
  const raw = await env.DEALS_CACHE.get("preorders:shop-cursor");
  const cursor = Number(raw ?? "0") || 0;
  const picked: string[] = [];
  for (let i = 0; i < SHOPS_PER_TICK && i < SHOPS.length; i++) {
    picked.push(SHOPS[(cursor + i) % SHOPS.length]);
  }
  await env.DEALS_CACHE.put("preorders:shop-cursor", String((cursor + picked.length) % SHOPS.length));
  return picked;
}

export async function refreshPreorders(env: Bindings, now = new Date()): Promise<PreorderScanStats> {
  const stats: PreorderScanStats = { checked: 0, added: 0, live: 0, removed: 0, notificationsCreated: 0 };
  let rows: PreorderEntry[] = [];
  try {
    rows = await loadRows(env.DB);
  } catch {
    return stats;
  }
  const nowIso = now.toISOString();
  const byId = new Map(rows.map((row) => [row.id, row]));
  const checked = new Set<string>();

  const pending = rows
    .filter((row) => row.status === "upcoming")
    .sort((a, b) => (a.lastVerifiedAt ?? "").localeCompare(b.lastVerifiedAt ?? ""))
    .slice(0, REVERIFY_LIMIT);

  for (const current of pending) {
    stats.checked += 1;
    checked.add(current.id);
    let reading: SourceReading;
    try {
      reading = await readProduct(current.productUrl, now, current.datePrecision === "month");
    } catch {
      reading = { ok: false };
    }
    const next = applyReading(current, reading, nowIso);
    if (next.status === "live" && current.status !== "live") {
      try {
        const productId = await publishLive(env.DB, next, nowIso);
        if (productId) {
          next.linkedProductId = productId;
          await transferWishes(env.DB, next, productId, nowIso);
          stats.notificationsCreated += await notifyLive(env.DB, next, productId, nowIso);
        }
      } catch (err) {
        console.log(JSON.stringify({ event: "preorder_publish_fail", id: current.id, err: String(err) }));
      }
      stats.live += 1;
    } else if (next.status === "removed" && current.status !== "removed") {
      stats.removed += 1;
    }
    if (
      next.status !== current.status ||
      next.lastVerifiedAt !== current.lastVerifiedAt ||
      next.price !== current.price ||
      next.dateLabel !== current.dateLabel ||
      next.startsAt !== current.startsAt
    ) {
      await saveEntry(env.DB, next);
      byId.set(next.id, next);
    }
  }

  let shops: string[] = [];
  try {
    shops = await rotateShops(env);
  } catch {
    shops = SHOPS.slice(0, SHOPS_PER_TICK);
  }

  for (const origin of shops) {
    let host = "";
    try {
      host = new URL(origin).hostname;
    } catch {
      continue;
    }
    const list = await fetchText(`${origin}/products.json?limit=250`, `${origin}/`);
    if (list.status < 200 || list.status >= 300 || !list.text) continue;
    let products: ShopifyReadInput[] = [];
    try {
      const parsed = JSON.parse(list.text) as { products?: ShopifyReadInput[] };
      products = Array.isArray(parsed.products) ? parsed.products : [];
    } catch {
      continue;
    }
    let added = 0;
    for (const product of products) {
      if (added >= 8) break;
      const handle = typeof product.handle === "string" ? product.handle : "";
      if (!handle) continue;
      const id = shopifyPreorderId(host, handle);
      if (checked.has(id)) continue;
      const signal = shopifySignal(tagList(product.tags), shopifyInStock(product));
      const productUrl = `https://${host}/products/${handle}`;
      const sourceUrl = productUrl;
      let pageHtml: string | null = null;
      let pageLoaded = false;
      if (signal === "preorder" || signal === "coming_ambiguous") {
        const page = await fetchText(productUrl, productUrl);
        if (page.status >= 200 && page.status < 300 && page.text) {
          pageHtml = page.text;
          pageLoaded = true;
        }
      }
      const reading = interpretShopifyProduct(product, {
        host,
        productUrl,
        sourceUrl,
        unit: "dollars",
        pageHtml,
        pageLoaded,
        now,
      });
      const fresh = entryFromReading(id, reading, nowIso);
      if (!fresh) continue;
      const existing = byId.get(id);
      if (!existing) {
        await insertEntry(env.DB, fresh);
        byId.set(id, fresh);
        stats.added += 1;
        added += 1;
        continue;
      }
      if (existing.status === "upcoming") continue;
      const revived = { ...fresh, createdAt: existing.createdAt, linkedProductId: existing.linkedProductId };
      await saveEntry(env.DB, revived);
      byId.set(id, revived);
      stats.added += 1;
      added += 1;
    }
  }

  return stats;
}
