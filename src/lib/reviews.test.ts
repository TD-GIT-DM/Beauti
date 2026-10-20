import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanCount,
  displayAuthor,
  hasCardRating,
  pickReviewSides,
  reviewPageKind,
  toPublicReviews,
  trimQuote,
  type StoredReview,
} from "./reviews.ts";

test("review pages are real product URLs, not search or brand indexes", () => {
  assert.equal(reviewPageKind("https://www.sephora.com/product/brow-wiz-P202633"), "sephora");
  assert.equal(reviewPageKind("https://www.sephora.com/search/dior-dior-vernis-999"), "none");
  assert.equal(reviewPageKind("https://www.ulta.com/brand/colourpop"), "none");
  assert.equal(reviewPageKind("https://www.rarebeauty.com/products/soft-pinch-liquid-blush"), "page");
  assert.equal(reviewPageKind("https://www.google.com/search?q=blush"), "none");
});

test("names stay handles, and full names keep a first name and initial", () => {
  assert.equal(displayAuthor("lizzybee823"), "lizzybee823");
  assert.equal(displayAuthor("Lindsay B."), "Lindsay B.");
  assert.equal(displayAuthor("Jennifer Smith"), "Jennifer S.");
  assert.equal(displayAuthor("shopper@example.com"), null);
  assert.equal(displayAuthor("  "), null);
});

test("long comments are cut with an ellipsis and stay verbatim up to the cut", () => {
  const words = "soft and easy to blend ".repeat(20);
  const trimmed = trimQuote(`  ${words}  `);
  assert.ok(trimmed);
  assert.ok(trimmed.endsWith("..."));
  assert.ok(trimmed.length > 280);
  assert.equal(trimmed.slice(0, 24), "soft and easy to blend s");
  assert.equal(trimQuote("<p>Love the&amp; smell</p>"), "Love the& smell");
});

test("positive quotes are 4 to 5 stars and 3 stars are used only when nothing lower exists", () => {
  const mixed = pickReviewSides([
    { rating: 5, text: "Love it", date: "2026-01-02", author: "A" },
    { rating: 4, text: "Pretty good", date: "2026-01-03", author: "B" },
    { rating: 3, text: "It is fine", date: "2026-01-04", author: "C" },
    { rating: 1, text: "Broke on day two", date: "2026-01-05", author: "Dee Jones" },
  ]);
  assert.deepEqual(mixed.positive.map((quote) => quote.rating), [5, 4]);
  assert.deepEqual(mixed.negative.map((quote) => quote.text), ["Broke on day two"]);
  assert.equal(mixed.negative[0]?.author, "Dee J.");
  assert.equal(mixed.negativeLabel, "negative");

  const onlyMid = pickReviewSides([
    { rating: 5, text: "Nice color", date: null, author: "sam" },
    { rating: 3, text: "Average wear", date: null, author: "sam" },
  ]);
  assert.equal(onlyMid.negativeLabel, "mixed");
  assert.equal(onlyMid.negative[0]?.text, "Average wear");
});

test("empty and ratings-only comments are dropped, and text is not rewritten", () => {
  const picked = pickReviewSides([
    { rating: 5, text: "   ", date: null, author: "A" },
    { rating: 2, text: "It pilled by noon.", date: null, author: "Pat Lee" },
  ]);
  assert.deepEqual(picked.positive, []);
  assert.equal(picked.negative[0]?.text, "It pilled by noon.");
});

test("a public review payload has no tag field", () => {
  const row: StoredReview = {
    rating: 4.3787,
    count: 16457,
    source: "Sephora",
    sourceUrl: "https://www.sephora.com/product/brow-wiz-P202633",
    fetchedAt: "2026-10-20T05:00:00.000Z",
    status: "ok",
    positive: [{ rating: 5, text: "Great pencil", date: "2026-10-18", author: "lizzybee823" }],
    negative: [],
    negativeLabel: null,
  };
  const summary = toPublicReviews(row, false);
  const detail = toPublicReviews(row, true);
  assert.equal(summary && "tags" in summary, false);
  assert.equal(detail && "positive" in detail, true);
  assert.equal(JSON.stringify(detail).includes("zz-private"), false);
  assert.equal(hasCardRating(summary), true);
  assert.equal(toPublicReviews({ ...row, status: "error" }, true), null);
  assert.equal(toPublicReviews({ ...row, status: "none", rating: null, count: null }, false)?.status, "none");
  assert.equal(cleanCount("31,"), null);
  assert.equal(cleanCount("1,049"), 1049);
});
