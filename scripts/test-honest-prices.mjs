/** Sanity checks for honest pricing JSON + discount math. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/honest-prices.json", import.meta.url), "utf8"));
const products = Object.values(data.products);
assert.ok(products.length >= 18, "expected a catalog");

const fakeCodes = /RARE10|SOL20|GLOW15|BEAUTI15|GLOW20|GOLD10|REST20|DROP18|RUBY40|HOPE33|SKY38/;
let markdowns = 0;
for (const row of products) {
  assert.ok(row.price > 0, `${row.id} missing price`);
  assert.ok(row.listPrice >= row.price, `${row.id} list < sale`);
  assert.equal(row.promoCodes.length, 0, `${row.id} still has promo codes`);
  assert.ok(!fakeCodes.test(JSON.stringify(row)), `${row.id} invented promo`);
  if (row.discountPercent > 0) {
    markdowns += 1;
    assert.ok(row.listPrice > row.price, `${row.id} badge without markdown`);
  } else {
    assert.equal(row.price, row.listPrice, `${row.id} full price must equal list`);
  }
}

const stats = data.stats;
assert.equal(stats.total, products.length);
assert.ok(stats.verified > 0, "expected verified prices");
for (const key of ["flipped", "fakeRemoved", "understatedRaised", "realMarkdowns"]) {
  assert.equal(typeof stats[key], "number", key);
  assert.ok(stats[key] >= 0, key);
}
console.log(
  `ok ${products.length} SKUs verified=${stats.verified} flipped=${stats.flipped} fakeRemoved=${stats.fakeRemoved} understatedRaised=${stats.understatedRaised} realMarkdowns=${markdowns}`,
);
