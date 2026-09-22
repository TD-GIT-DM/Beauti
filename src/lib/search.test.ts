import assert from "node:assert/strict";
import { test } from "node:test";
import { tagSelectionQuery } from "./search.ts";

test("tag selection replaces the query so chip counts match the result set", () => {
  const qs = tagSelectionQuery("vanilla perfume");
  const params = new URLSearchParams(qs);
  assert.equal(params.get("tag"), "vanilla perfume");
  assert.equal(params.get("q"), null);
  assert.equal(params.get("minPrice"), null);
  assert.equal(params.get("maxPrice"), null);
  assert.equal(params.get("minDiscount"), null);
});

test("blank tag selection does not keep a filter", () => {
  assert.equal(tagSelectionQuery("   "), "");
});
