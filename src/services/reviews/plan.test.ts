import assert from "node:assert/strict";
import { test } from "node:test";
import { REVIEW_LOOKAHEAD, planReviewBatch, type ReviewCandidate } from "./plan.ts";

const NOW = Date.parse("2026-10-20T12:00:00.000Z");
const WEEK = 7 * 24 * 60 * 60 * 1000;

function row(partial: Partial<ReviewCandidate> & Pick<ReviewCandidate, "id" | "url">): ReviewCandidate {
  return {
    status: null,
    fetchedAt: null,
    checkedAt: null,
    lastError: null,
    ...partial,
  };
}

test("search URLs are marked with no source and real pages are the ones fetched", () => {
  const plan = planReviewBatch(
    [
      row({ id: "search", url: "https://www.sephora.com/search/dior-vernis" }),
      row({ id: "ulta", url: "https://www.ulta.com/brand/colourpop" }),
      row({ id: "brow", url: "https://www.sephora.com/product/brow-wiz-P202633" }),
      row({
        id: "fresh",
        url: "https://www.sephora.com/product/cloud-P512494",
        status: "ok",
        fetchedAt: "2026-10-19T12:00:00.000Z",
        checkedAt: "2026-10-19T12:00:00.000Z",
      }),
      row({ id: "rare", url: "https://www.rarebeauty.com/products/soft-pinch" }),
    ],
    NOW,
  );
  assert.deepEqual(plan.noSourceIds.sort(), ["search", "ulta"]);
  assert.deepEqual(plan.fetchIds, ["brow", "rare"]);
});

test("a stale success is due again and a recent error is not", () => {
  const plan = planReviewBatch(
    [
      row({
        id: "old",
        url: "https://www.sephora.com/product/brow-wiz-P202633",
        status: "ok",
        fetchedAt: new Date(NOW - WEEK - 1000).toISOString(),
        checkedAt: new Date(NOW - WEEK - 1000).toISOString(),
      }),
      row({
        id: "err",
        url: "https://www.sephora.com/product/cloud-P512494",
        status: "error",
        checkedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        lastError: "http_429 retry_after=15",
      }),
      row({
        id: "widget",
        url: "https://snif.co/products/crumb",
        status: "error",
        checkedAt: new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(),
        lastError: "unsupported:junip",
      }),
    ],
    NOW,
  );
  assert.deepEqual(plan.fetchIds, ["old"]);
});

test("the lookahead spreads hosts and stays bounded", () => {
  const rows: ReviewCandidate[] = [];
  for (let i = 0; i < 20; i += 1) {
    rows.push(row({ id: `s${i}`, url: `https://www.sephora.com/product/item-P${1000 + i}` }));
    rows.push(row({ id: `b${i}`, url: `https://brand.example/products/item-${i}` }));
  }
  const plan = planReviewBatch(rows, NOW);
  assert.equal(plan.fetchIds.length, REVIEW_LOOKAHEAD);
  const hosts = plan.fetchIds.map((id) => id[0]);
  assert.notEqual(hosts[0], hosts[1]);
  assert.notEqual(hosts[1], hosts[2]);
});
