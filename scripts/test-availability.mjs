/** Sanity checks for availability JSON — no invented stock, OOS clears on restock. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/availability.json", import.meta.url), "utf8"));
const products = Object.values(data.products);
assert.ok(products.length >= 18, "expected a catalog");

let explicit = 0;
let oos = 0;
for (const row of products) {
  assert.ok(["in_stock", "out_of_stock", "limited"].includes(row.availability), `${row.id} bad availability`);
  if (row.explicit) {
    explicit += 1;
    if (row.availability === "out_of_stock") {
      oos += 1;
      assert.ok(row.restockEstimate == null || typeof row.restockEstimate === "string", `${row.id} restock type`);
    } else {
      assert.equal(row.restockEstimate, null, `${row.id} in-stock must clear restock_estimate`);
    }
    assert.ok(
      String(row.source || "").includes("sephora") || String(row.source || "").includes("shopify"),
      `${row.id} explicit stock must cite sephora/shopify JSON`,
    );
  } else {
    assert.equal(row.kind, "unverified");
    assert.equal(row.flipped, false, `${row.id} unverified must not invent a flip`);
  }
}

const stats = data.stats;
assert.equal(stats.total, products.length);
assert.ok(stats.verified > 0, "expected verified availability");
assert.equal(stats.verified, explicit);
console.log(
  `ok ${products.length} SKUs verified=${stats.verified} oos=${oos} flippedToInStock=${stats.flippedToInStock} flippedToOutOfStock=${stats.flippedToOutOfStock} unverified=${stats.unverified}`,
);
