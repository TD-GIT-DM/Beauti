import { reviewHost, reviewPageKind, type ReviewStatus } from "../../lib/reviews.ts";
import { spreadByHost } from "../deals/fetch-budget.ts";

/** A checked product is fetched again after a week. Reviews move slowly. */
export const REVIEW_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
/** A failed read waits 12 hours, unless the widget is one we do not parse yet. */
export const REVIEW_RETRY_MS = 12 * 60 * 60 * 1000;
/** Products started in one reviews invocation. */
export const REVIEW_PRODUCT_CAP = 10;
/** Due rows considered, so a budget skip can still reach a cheaper product. */
export const REVIEW_LOOKAHEAD = 30;

export interface ReviewCandidate {
  id: string;
  url: string;
  status: ReviewStatus | null;
  fetchedAt: string | null;
  checkedAt: string | null;
  lastError: string | null;
}

function ageMs(iso: string | null, nowMs: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return Number.POSITIVE_INFINITY;
  return nowMs - ms;
}

export function reviewIsDue(row: ReviewCandidate, nowMs: number): boolean {
  if (row.status == null) return true;
  const checkedAge = ageMs(row.checkedAt, nowMs);
  if (row.status === "error") {
    const wait = row.lastError?.startsWith("unsupported:") ? REVIEW_REFRESH_MS : REVIEW_RETRY_MS;
    return checkedAge >= wait;
  }
  if (row.status === "ok" || row.status === "none") {
    return ageMs(row.fetchedAt, nowMs) >= REVIEW_REFRESH_MS && checkedAge >= REVIEW_RETRY_MS;
  }
  return false;
}

export function planReviewBatch(
  rows: readonly ReviewCandidate[],
  nowMs: number,
): { fetchIds: string[]; noSourceIds: string[] } {
  const noSourceIds: string[] = [];
  const due: ReviewCandidate[] = [];
  for (const row of rows) {
    const kind = reviewPageKind(row.url);
    if (kind === "none") {
      if (row.status !== "no_source") noSourceIds.push(row.id);
      continue;
    }
    if (row.status === "no_source" || reviewIsDue(row, nowMs)) due.push(row);
  }
  due.sort((a, b) => {
    const af = a.fetchedAt ? Date.parse(a.fetchedAt) : 0;
    const bf = b.fetchedAt ? Date.parse(b.fetchedAt) : 0;
    const aKey = Number.isFinite(af) && af > 0 ? af : 0;
    const bKey = Number.isFinite(bf) && bf > 0 ? bf : 0;
    if (aKey !== bKey) return aKey - bKey;
    return a.id.localeCompare(b.id);
  });
  const spread = spreadByHost(due, (row) => reviewHost(row.url));
  return {
    fetchIds: spread.slice(0, REVIEW_LOOKAHEAD).map((row) => row.id),
    noSourceIds,
  };
}
