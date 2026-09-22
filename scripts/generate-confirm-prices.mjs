/** Write migrations/0012_confirm_prices.sql from scripts/data/honest-prices.json */
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/honest-prices.json", import.meta.url), "utf8"));
const products = Object.entries(data.products).map(([id, row]) => ({ id, ...row }));
const changed = products.filter((row) => row.changed);

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function money(n) {
  return Number(n).toFixed(2);
}

const stats = data.stats || {};
const lines = [
  "-- Confirm price, list_price, and discount from Sephora catalog JSON,",
  "-- Shopify product JSON, and brand products.json.",
  "-- price is the current sell price. list_price is a real compare-at.",
  "-- Percent off is omitted when list_price equals price.",
  "-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:",
  "--   npm run catalog:resolve-prices",
  "--   npm run catalog:generate:0012",
  "--   npm run catalog:test-prices",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "--",
  `-- Verified: ${stats.verified ?? "?"}`,
  `-- Flipped (price or list changed vs 0009): ${stats.flipped ?? "?"}`,
  `-- Fake discounts removed: ${stats.fakeRemoved ?? "?"}`,
  `-- Understated discounts raised: ${stats.understatedRaised ?? "?"}`,
  `-- Real markdowns now: ${stats.realMarkdowns ?? "?"}`,
  `-- Rows updated: ${changed.length}`,
  "",
];

const BATCH = 40;
const sorted = [...changed].sort((a, b) => a.id.localeCompare(b.id));
if (!sorted.length) {
  lines.push("-- No price or list_price changes.");
  lines.push("");
}
for (let i = 0; i < sorted.length; i += BATCH) {
  const chunk = sorted.slice(i, i + BATCH);
  for (const item of chunk) {
    const price = money(item.price);
    const list = money(item.listPrice ?? item.price);
    const score = Number.isFinite(item.dealScore) ? Math.round(item.dealScore) : 40;
    lines.push(
      `UPDATE products SET price = ${price}, list_price = ${list}, promo_codes = '[]', deal_score = ${score}, updated_at = datetime('now') WHERE id = ${sqlStr(item.id)};`,
    );
  }
  lines.push("");
}

writeFileSync(new URL("../migrations/0012_confirm_prices.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(
  `0012: verified=${stats.verified ?? "?"} flipped=${stats.flipped ?? "?"} fakeRemoved=${stats.fakeRemoved ?? "?"} understatedRaised=${stats.understatedRaised ?? "?"} markdowns=${stats.realMarkdowns ?? "?"} updated=${changed.length}`,
);
