import { HostScheduler, kvHostCooldown, SubrequestBudget, type OutboundFetch } from "../deals/fetch-budget.ts";
import { reviewPageKind, type ReviewStatus } from "../../lib/reviews.ts";
import { fetchReviewSnapshot, type ReviewFetchCaches, type ReviewSnapshot } from "./load.ts";
import { planReviewBatch, REVIEW_PRODUCT_CAP, type ReviewCandidate } from "./plan.ts";

interface ReviewBindings {
  DB: D1Database;
  DEALS_CACHE: KVNamespace;
}

interface ReviewJoinRow {
  id: string;
  brand: string;
  product_url: string;
  status: ReviewStatus | null;
  fetched_at: string | null;
  checked_at: string | null;
  last_error: string | null;
}

export interface ReviewScanSummary {
  scannedAt: string;
  fetched: number;
  updated: number;
  none: number;
  noSource: number;
  errors: number;
  skipped: number;
  subrequests: number;
  withRating: number;
  withQuotes: number;
}

function emptySummary(nowIso: string): ReviewScanSummary {
  return {
    scannedAt: nowIso,
    fetched: 0,
    updated: 0,
    none: 0,
    noSource: 0,
    errors: 0,
    skipped: 0,
    subrequests: 0,
    withRating: 0,
    withQuotes: 0,
  };
}

async function markNoSource(db: D1Database, ids: string[], nowIso: string): Promise<void> {
  const chunk = 40;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    await db.batch(
      slice.map((id) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO product_reviews (
               product_id, status, fetched_at, checked_at, positive_json, negative_json
             ) VALUES (?, 'no_source', ?, ?, '[]', '[]')`,
          )
          .bind(id, nowIso, nowIso),
      ),
    );
  }
}

async function saveOk(db: D1Database, productId: string, snapshot: ReviewSnapshot, nowIso: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO product_reviews (
         product_id, rating, review_count, source, source_url, fetched_at, checked_at,
         status, last_error, positive_json, negative_json, negative_label
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', NULL, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET
         rating = excluded.rating,
         review_count = excluded.review_count,
         source = excluded.source,
         source_url = excluded.source_url,
         fetched_at = excluded.fetched_at,
         checked_at = excluded.checked_at,
         status = 'ok',
         last_error = NULL,
         positive_json = excluded.positive_json,
         negative_json = excluded.negative_json,
         negative_label = excluded.negative_label`,
    )
    .bind(
      productId,
      snapshot.rating,
      snapshot.count,
      snapshot.source,
      snapshot.sourceUrl,
      nowIso,
      nowIso,
      JSON.stringify(snapshot.positive),
      JSON.stringify(snapshot.negative),
      snapshot.negativeLabel,
    )
    .run();
}

async function saveNone(db: D1Database, productId: string, sourceUrl: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO product_reviews (
         product_id, rating, review_count, source, source_url, fetched_at, checked_at,
         status, last_error, positive_json, negative_json, negative_label
       ) VALUES (?, NULL, NULL, NULL, ?, ?, ?, 'none', NULL, '[]', '[]', NULL)
       ON CONFLICT(product_id) DO UPDATE SET
         rating = NULL,
         review_count = NULL,
         source = NULL,
         source_url = excluded.source_url,
         fetched_at = excluded.fetched_at,
         checked_at = excluded.checked_at,
         status = 'none',
         last_error = NULL,
         positive_json = '[]',
         negative_json = '[]',
         negative_label = NULL`,
    )
    .bind(productId, sourceUrl, nowIso, nowIso)
    .run();
}

async function saveError(db: D1Database, productId: string, error: string, nowIso: string): Promise<void> {
  const text = error.slice(0, 180);
  await db
    .prepare(
      `INSERT INTO product_reviews (
         product_id, status, checked_at, last_error, positive_json, negative_json
       ) VALUES (?, 'error', ?, ?, '[]', '[]')
       ON CONFLICT(product_id) DO UPDATE SET
         checked_at = excluded.checked_at,
         last_error = excluded.last_error,
         status = CASE WHEN product_reviews.status = 'ok' THEN 'ok' ELSE 'error' END`,
    )
    .bind(productId, nowIso, text)
    .run();
}

function reserveFor(kind: "sephora" | "page", passkeyReady: boolean): number {
  if (kind === "sephora") return passkeyReady ? 1 : 2;
  return 4;
}

/**
 * Refresh a small batch of review snapshots.
 * Search and brand-index URLs are marked no_source without an outbound call.
 * Each product page keeps its own subrequest budget, separate from catalog and pre-orders.
 */
export async function scanReviews(env: ReviewBindings, now = new Date()): Promise<ReviewScanSummary> {
  const nowIso = now.toISOString();
  const summary = emptySummary(nowIso);
  let rows: ReviewJoinRow[] = [];
  try {
    const queried = await env.DB.prepare(
      `SELECT p.id, p.brand, p.product_url, r.status, r.fetched_at, r.checked_at, r.last_error
       FROM products p
       LEFT JOIN product_reviews r ON r.product_id = p.id`,
    ).all<ReviewJoinRow>();
    rows = queried.results ?? [];
  } catch (err) {
    console.log(JSON.stringify({ event: "review_scan_fail", err: String(err) }));
    return summary;
  }

  const candidates: ReviewCandidate[] = rows.map((row) => ({
    id: row.id,
    url: row.product_url,
    status: row.status,
    fetchedAt: row.fetched_at,
    checkedAt: row.checked_at,
    lastError: row.last_error,
  }));
  const plan = planReviewBatch(candidates, now.getTime());
  if (plan.noSourceIds.length) {
    await markNoSource(env.DB, plan.noSourceIds, nowIso);
    summary.noSource = plan.noSourceIds.length;
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const outbound: OutboundFetch = {
    budget: new SubrequestBudget(),
    hosts: new HostScheduler({ store: kvHostCooldown(env.DEALS_CACHE) }),
  };
  const caches: ReviewFetchCaches = { bv: new Map(), kv: env.DEALS_CACHE };

  for (const id of plan.fetchIds) {
    if (summary.fetched >= REVIEW_PRODUCT_CAP) break;
    const row = byId.get(id);
    if (!row) continue;
    const kind = reviewPageKind(row.product_url);
    if (kind === "none") continue;
    const need = reserveFor(kind, caches.bv.has("Sephora/main_site"));
    if (outbound.budget.remaining() < need) {
      summary.skipped += 1;
      continue;
    }
    summary.fetched += 1;
    try {
      const result = await fetchReviewSnapshot({
        productUrl: row.product_url,
        brand: row.brand,
        kind,
        caches,
        outbound,
      });
      if (result.kind === "budget") {
        summary.fetched -= 1;
        summary.skipped += 1;
        break;
      }
      if (result.kind === "error") {
        await saveError(env.DB, row.id, result.error, nowIso);
        summary.errors += 1;
        console.log(JSON.stringify({ event: "review_fetch_fail", id: row.id, error: result.error }));
        continue;
      }
      if (result.kind === "none") {
        await saveNone(env.DB, row.id, result.sourceUrl, nowIso);
        summary.none += 1;
        continue;
      }
      await saveOk(env.DB, row.id, result.snapshot, nowIso);
      summary.updated += 1;
      if (result.snapshot.rating != null && result.snapshot.count != null) summary.withRating += 1;
      if (result.snapshot.positive.length || result.snapshot.negative.length) summary.withQuotes += 1;
    } catch (err) {
      summary.errors += 1;
      console.log(JSON.stringify({ event: "review_fetch_fail", id: row.id, err: String(err) }));
      try {
        await saveError(env.DB, row.id, err instanceof Error ? err.message : String(err), nowIso);
      } catch {
        // Leave the row unchecked so a later run can try again.
      }
    }
  }

  summary.subrequests = outbound.budget.used;
  return summary;
}
