/** Write migrations/0012_confirm_prices.sql from scripts/data/confirmed-prices.json */
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/confirmed-prices.json", import.meta.url), "utf8"));
const products = Object.values(data.products).filter((row) => row.changed);
const stats = data.stats || {};

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function money(n) {
  return Number(n).toFixed(2);
}

const lines = [
  "-- Confirm sellable prices against linked retailer JSON.",
  "-- Sources: Sephora catalog search JSON, Shopify product .js (USD), brand products.json",
  "-- when the linked .js URL is gone. No invented markdowns.",
  "-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:",
  "--   npm run catalog:confirm-prices && npm run catalog:generate:0012",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "--",
  `-- Verified SKUs: ${stats.verified ?? "?"}  (Sephora ${stats.verifiedSephora ?? "?"}, Shopify ${stats.verifiedShopify ?? "?"})`,
  `-- Unverified (left unchanged): ${stats.unverified ?? "?"}`,
  `-- Price rows updated: ${products.length}`,
  `-- Prices flipped: ${stats.priceFlips ?? "?"}`,
  `-- Fake discounts removed: ${stats.fakeDiscountsRemoved ?? "?"}`,
  `-- Understated discounts raised: ${stats.understatedRaised ?? "?"}`,
  "",
];

const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id));
const BATCH = 40;
for (let i = 0; i < sorted.length; i += BATCH) {
  const chunk = sorted.slice(i, i + BATCH);
  for (const item of chunk) {
    const score = Number.isFinite(item.dealScore) ? Math.round(item.dealScore) : 40;
    lines.push(
      `UPDATE products SET price = ${money(item.price)}, list_price = ${money(item.listPrice)}, deal_score = ${score}, updated_at = datetime('now') WHERE id = ${sqlStr(item.id)};`,
    );
  }
  lines.push("");
}

if (!sorted.length) {
  lines.push("-- No verified price changes.");
  lines.push("");
}

writeFileSync(new URL("../migrations/0012_confirm_prices.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(
  `0012: verified=${stats.verified ?? "?"} updated=${sorted.length} flips=${stats.priceFlips ?? "?"} fakeRemoved=${stats.fakeDiscountsRemoved ?? "?"} raised=${stats.understatedRaised ?? "?"}`,
);
