/**
 * Re-check pre-order rows from Shopify product JSON, plus the product page
 * when a coming-soon tag is paired with stock or a ship month might be posted.
 * A failed fetch does not refresh last_verified_at. It does record
 * last_checked_at and last_check_error, including the thrown message.
 * A 429 cools that host and does not remove the row. Rows older than 36
 * hours drop off the API until a later check succeeds.
 *
 * Calls go through the shared subrequest budget. Existing upcoming rows are
 * checked before shop discovery, and requests to one host are spaced.
 */

import { honestDealScore } from "../../lib/discount";
import {
  applyReading,
  entryFromReading,
  entryFromRow,
  httpsProductUrl,
  interpretShopifyProduct,
  classifyProductFetch,
  keepImage,
  shopifyInStock,
  shopifyPreorderId,
  shopifySignal,
  SHOPIFY_HTML_ACCEPT,
  SHOPIFY_JSON_ACCEPT,
  stableBrand,
  storefrontHtml,
  tagList,
  type PreorderEntry,
  type PreorderRow,
  type ShopifyReadInput,
  type SourceReading,
} from "../../lib/preorder";
import { BRAND_SHOPS, CATALOG_UA } from "./catalog-sources";
import {
  budgetedFetch,
  fetchFailedError,
  HostScheduler,
  kvHostCooldown,
  spreadByHost,
  SubrequestBudget,
  type BudgetedResponse,
  type OutboundFetch,
} from "./fetch-budget";

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

async function fetchText(
  outbound: OutboundFetch,
  url: string,
  referer: string,
  accept: string,
): Promise<BudgetedResponse> {
  return budgetedFetch({
    url,
    budget: outbound.budget,
    hosts: outbound.hosts,
    timeoutMs: 8_000,
    init: {
      method: "GET",
      headers: {
        "User-Agent": CATALOG_UA,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: referer,
      },
    },
  });
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

function pageFailure(page: BudgetedResponse): string {
  if (page.error) return page.error;
  if (page.status === 0) return "page_fetch_failed";
  if (page.status < 200 || page.status >= 300) return `page_http_${page.status}`;
  if (page.text && !storefrontHtml(page.text, page.contentType)) return "page_not_html";
  return "page_not_loaded";
}

function stopsForBudget(error: string | null | undefined): boolean {
  return error === "subrequest_budget_exhausted";
}

async function readProduct(
  outbound: OutboundFetch,
  productUrl: string,
  now: Date,
  wantPage: boolean,
): Promise<SourceReading> {
  const source = jsUrl(productUrl);
  if (!source) return { ok: false, error: "bad_product_url" };
  const productRes = await fetchText(outbound, source, productUrl, SHOPIFY_JSON_ACCEPT);
  const failed = classifyProductFetch(productRes);
  if (failed) return failed;
  const body = productRes.text;
  if (!body) return { ok: false, error: "product_json_parse" };
  let product: ShopifyReadInput | null = null;
  try {
    product = JSON.parse(body) as ShopifyReadInput;
  } catch {
    return { ok: false, error: "product_json_parse" };
  }
  const tags = tagList(product.tags);
  const signal = shopifySignal(tags, shopifyInStock(product));
  const loadPage = wantPage || signal === "preorder" || signal === "coming_ambiguous";
  let pageHtml: string | null = null;
  let pageLoaded = false;
  let pageError: string | null = null;
  if (loadPage) {
    const page = await fetchText(outbound, productUrl, productUrl, SHOPIFY_HTML_ACCEPT);
    const html = page.text ? storefrontHtml(page.text, page.contentType) : null;
    if (html && page.status >= 200 && page.status < 300) {
      pageHtml = html;
      pageLoaded = true;
    } else {
      pageError = pageFailure(page);
    }
  }
  const reading = interpretShopifyProduct(product, {
    host: hostOf(productUrl),
    productUrl,
    sourceUrl: productUrl,
    unit: "cents",
    pageHtml,
    pageLoaded,
    now,
  });
  if (!reading.ok && reading.error === "page_not_loaded" && pageError) {
    return { ok: false, error: pageError };
  }
  return reading;
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
       SET kind = ?, name = ?, brand = ?, description = ?, image_url = COALESCE(?, image_url), product_url = ?, source_url = ?,
           price = ?, list_price = ?, announced_percent = ?, discount_confirmed = ?, currency = ?,
           starts_at = ?, ends_at = ?, date_precision = ?, date_label = ?, status = ?,
           linked_product_id = ?, last_verified_at = ?, last_checked_at = ?, last_check_error = ?, updated_at = ?
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
      entry.lastCheckedAt,
      entry.lastCheckError,
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
         last_verified_at, last_checked_at, last_check_error, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      entry.lastCheckedAt,
      entry.lastCheckError,
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

export async function refreshPreorders(
  env: Bindings,
  now = new Date(),
  outbound?: OutboundFetch,
): Promise<PreorderScanStats> {
  const run =
    outbound ??
    {
      budget: new SubrequestBudget(),
      hosts: new HostScheduler({ store: kvHostCooldown(env.DEALS_CACHE) }),
    };
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

  const pending = spreadByHost(
    rows
      .filter((row) => row.status === "upcoming")
      .sort((a, b) => (a.lastVerifiedAt ?? "").localeCompare(b.lastVerifiedAt ?? ""))
      .slice(0, REVERIFY_LIMIT),
    (row) => hostOf(row.productUrl),
  );

  let budgetStop = false;
  for (const current of pending) {
    if (budgetStop || run.budget.remaining() < 1) {
      console.log(
        JSON.stringify({ event: "preorder_budget_stop", checked: stats.checked, subrequests: run.budget.used }),
      );
      break;
    }
    stats.checked += 1;
    checked.add(current.id);
    let reading: SourceReading;
    try {
      reading = await readProduct(run, current.productUrl, now, current.datePrecision === "month");
    } catch (err) {
      reading = { ok: false, error: fetchFailedError(err) };
    }
    if (!reading.ok) {
      console.log(JSON.stringify({ event: "preorder_check_fail", id: current.id, error: reading.error ?? "unverified" }));
      if (stopsForBudget(reading.error)) budgetStop = true;
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
      next.lastCheckedAt !== current.lastCheckedAt ||
      next.lastCheckError !== current.lastCheckError ||
      next.price !== current.price ||
      next.dateLabel !== current.dateLabel ||
      next.startsAt !== current.startsAt ||
      next.brand !== current.brand ||
      next.imageUrl !== current.imageUrl
    ) {
      await saveEntry(env.DB, next);
      byId.set(next.id, next);
    }
  }

  if (budgetStop || run.budget.remaining() < 2) return stats;

  let shops: string[] = [];
  try {
    shops = await rotateShops(env);
  } catch {
    shops = SHOPS.slice(0, SHOPS_PER_TICK);
  }

  for (const origin of shops) {
    if (run.budget.remaining() < 2) break;
    let host = "";
    try {
      host = new URL(origin).hostname;
    } catch {
      continue;
    }
    const list = await fetchText(run, `${origin}/products.json?limit=250`, `${origin}/`, SHOPIFY_JSON_ACCEPT);
    if (stopsForBudget(list.error)) break;
    if (list.status === 429 || list.status < 200 || list.status >= 300 || !list.text) continue;
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
        if (run.budget.remaining() < 1) break;
        const page = await fetchText(run, productUrl, productUrl, SHOPIFY_HTML_ACCEPT);
        if (stopsForBudget(page.error)) break;
        const html = page.status >= 200 && page.status < 300 && page.text ? storefrontHtml(page.text, page.contentType) : null;
        if (html) {
          pageHtml = html;
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
      const revived = {
        ...fresh,
        createdAt: existing.createdAt,
        linkedProductId: existing.linkedProductId,
        brand: stableBrand(existing.id, existing.brand, fresh.brand),
        imageUrl: keepImage(existing.imageUrl, fresh.imageUrl),
      };
      await saveEntry(env.DB, revived);
      byId.set(id, revived);
      stats.added += 1;
      added += 1;
    }
  }

  return stats;
}
