import { isSephoraPdp, isUltaPdp } from "./product-url.ts";
import type { ProductReviews, ReviewQuote } from "../types.ts";

/** Positive and negative columns each keep this many comments. */
export const REVIEW_QUOTE_LIMIT = 5;
/** Stored comment length. Longer text is cut and marked with an ellipsis. */
export const REVIEW_QUOTE_MAX = 280;

export interface RawQuote {
  rating: number;
  text: string;
  date: string | null;
  author: string | null;
}

export type ReviewStatus = "ok" | "none" | "no_source" | "error";

export interface StoredReview {
  rating: number | null;
  count: number | null;
  source: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  status: ReviewStatus;
  positive: ReviewQuote[];
  negative: ReviewQuote[];
  negativeLabel: "negative" | "mixed" | null;
}

/** Sephora PDP, a brand or Ulta product page, or a URL we will not treat as a product. */
export function reviewPageKind(url: string): "sephora" | "page" | "none" {
  if (isSephoraPdp(url)) return "sephora";
  if (isUltaPdp(url)) return "page";
  if (!/^https:\/\//i.test(url || "")) return "none";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "none";
  }
  if (
    host === "sephora.com" ||
    host.endsWith(".sephora.com") ||
    host === "ulta.com" ||
    host.endsWith(".ulta.com") ||
    host === "google.com" ||
    host.endsWith(".google.com")
  ) {
    return "none";
  }
  if (/\/products\/[^/?#]+/i.test(url)) return "page";
  return "none";
}

export function reviewHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function cleanAverage(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 5) return null;
  return n;
}

/** Accepts 12, 1,049, or "1,049". Rejects a trailing comma from a cut-off number. */
export function cleanCount(raw: unknown): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.round(raw);
  }
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!/^\d{1,3}(,\d{3})+$/.test(text) && !/^\d+$/.test(text)) return null;
  const n = Number(text.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function reviewDate(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Turn review HTML into the words the shopper wrote. */
export function plainReviewText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function trimQuote(raw: string): string | null {
  const text = plainReviewText(raw);
  if (!text) return null;
  if (text.length <= REVIEW_QUOTE_MAX) return text;
  return `${text.slice(0, REVIEW_QUOTE_MAX).trimEnd()}...`;
}

/**
 * First name plus last initial when the source sent a full name.
 * A single display handle is kept as written.
 */
export function displayAuthor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || name.includes("@") || /^https?:\/\//i.test(name)) return null;
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].slice(0, 40);
  const first = parts[0];
  const last = parts[parts.length - 1].replace(/\./g, "");
  if (!last) return first.slice(0, 40);
  if (last.length <= 1) return `${first} ${last}.`.slice(0, 40);
  return `${first} ${last[0]}.`;
}

export function pickReviewSides(quotes: RawQuote[]): {
  positive: ReviewQuote[];
  negative: ReviewQuote[];
  negativeLabel: "negative" | "mixed" | null;
} {
  const cleaned: ReviewQuote[] = [];
  const seen = new Set<string>();
  for (const quote of quotes) {
    if (!Number.isInteger(quote.rating) || quote.rating < 1 || quote.rating > 5) continue;
    const text = trimQuote(quote.text);
    if (!text) continue;
    const author = displayAuthor(quote.author);
    const key = `${quote.rating}|${author ?? ""}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push({
      rating: quote.rating,
      text,
      date: quote.date,
      author,
    });
  }

  const positive = cleaned.filter((quote) => quote.rating >= 4).slice(0, REVIEW_QUOTE_LIMIT);
  const low = cleaned.filter((quote) => quote.rating <= 2).slice(0, REVIEW_QUOTE_LIMIT);
  if (low.length) {
    return { positive, negative: low, negativeLabel: "negative" };
  }
  const mixed = cleaned.filter((quote) => quote.rating === 3).slice(0, REVIEW_QUOTE_LIMIT);
  if (mixed.length) {
    return { positive, negative: mixed, negativeLabel: "mixed" };
  }
  return { positive, negative: [], negativeLabel: null };
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatReviewCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

export function formatReviewDay(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function hasCardRating(reviews: ProductReviews | null | undefined): reviews is ProductReviews & {
  rating: number;
  count: number;
} {
  return Boolean(reviews && reviews.status === "ok" && reviews.rating != null && reviews.count != null && reviews.count > 0);
}

export function toPublicReviews(row: StoredReview | null, detail: boolean): ProductReviews | null {
  if (!row || row.status === "error") return null;
  const quotes = detail
    ? { positive: row.positive, negative: row.negative, negativeLabel: row.negativeLabel }
    : {};
  if (row.status === "none" || row.status === "no_source") {
    return {
      status: "none",
      rating: null,
      count: null,
      source: null,
      sourceUrl: null,
      fetchedAt: row.fetchedAt,
      ...quotes,
      ...(detail ? { positive: [], negative: [], negativeLabel: null } : {}),
    };
  }
  const rated = row.rating != null && row.count != null && row.count > 0;
  const hasQuotes = row.positive.length > 0 || row.negative.length > 0;
  if (!rated && !hasQuotes) {
    return {
      status: "none",
      rating: null,
      count: null,
      source: null,
      sourceUrl: null,
      fetchedAt: row.fetchedAt,
      ...(detail ? { positive: [], negative: [], negativeLabel: null } : {}),
    };
  }
  return {
    status: "ok",
    rating: rated ? row.rating : null,
    count: rated ? row.count : null,
    source: row.source,
    sourceUrl: row.sourceUrl,
    fetchedAt: row.fetchedAt,
    ...(detail
      ? { positive: row.positive, negative: row.negative, negativeLabel: row.negativeLabel }
      : {}),
  };
}
