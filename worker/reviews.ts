import { toPublicReviews, type ReviewStatus, type StoredReview } from "../src/lib/reviews";
import type { ProductReviews, ReviewQuote } from "../src/types";
import type { ProductRecord } from "./db";

interface SummaryRow {
  product_id: string;
  rating: number | null;
  review_count: number | null;
  source: string | null;
  source_url: string | null;
  fetched_at: string | null;
  status: ReviewStatus;
  positive_json?: string | null;
  negative_json?: string | null;
  negative_label?: "negative" | "mixed" | null;
}

function parseQuotes(raw: string | null | undefined): ReviewQuote[] {
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    const quotes: ReviewQuote[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const row = item as { rating?: unknown; text?: unknown; date?: unknown; author?: unknown };
      if (typeof row.text !== "string" || typeof row.rating !== "number") continue;
      quotes.push({
        rating: row.rating,
        text: row.text,
        date: typeof row.date === "string" ? row.date : null,
        author: typeof row.author === "string" ? row.author : null,
      });
    }
    return quotes;
  } catch {
    return [];
  }
}

function storedFrom(row: SummaryRow, detail: boolean): StoredReview {
  return {
    rating: row.rating,
    count: row.review_count,
    source: row.source,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    status: row.status,
    positive: detail ? parseQuotes(row.positive_json) : [],
    negative: detail ? parseQuotes(row.negative_json) : [],
    negativeLabel: row.negative_label ?? null,
  };
}

export async function readReviewSummaryMap(db: D1Database): Promise<Map<string, ProductReviews>> {
  const map = new Map<string, ProductReviews>();
  try {
    const { results } = await db
      .prepare(
        `SELECT product_id, rating, review_count, source, source_url, fetched_at, status
         FROM product_reviews`,
      )
      .all<SummaryRow>();
    for (const row of results ?? []) {
      const publicReview = toPublicReviews(storedFrom(row, false), false);
      if (publicReview) map.set(row.product_id, publicReview);
    }
  } catch (err) {
    console.log(JSON.stringify({ event: "review_read_fail", err: String(err) }));
  }
  return map;
}

export async function readReviewDetail(db: D1Database, productId: string): Promise<ProductReviews | null> {
  try {
    const row = await db
      .prepare(
        `SELECT product_id, rating, review_count, source, source_url, fetched_at, status,
                positive_json, negative_json, negative_label
         FROM product_reviews WHERE product_id = ?`,
      )
      .bind(productId)
      .first<SummaryRow>();
    if (!row) return null;
    return toPublicReviews(storedFrom(row, true), true);
  } catch (err) {
    console.log(JSON.stringify({ event: "review_read_fail", err: String(err) }));
    return null;
  }
}

export async function attachReviewSummaries(db: D1Database, products: ProductRecord[]): Promise<void> {
  if (!products.length) return;
  const summaries = await readReviewSummaryMap(db);
  for (const product of products) {
    product.reviews = summaries.get(product.id) ?? null;
  }
}
