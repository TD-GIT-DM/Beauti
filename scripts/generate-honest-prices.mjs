/** Write migrations/0009_honest_prices.sql from scripts/data/honest-prices.json */
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/honest-prices.json", import.meta.url), "utf8"));
const products = Object.entries(data.products).map(([id, row]) => ({ id, ...row }));

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function money(n) {
  return Number(n).toFixed(2);
}

const stats = data.stats || {};
const verified = products.filter((p) => ["sephora-pdp", "sephora-search", "brand-pdp", "known-list"].includes(p.kind));
const cleared = products.filter((p) => p.kind === "cleared" || p.discountPercent === 0);
const markdowns = products.filter((p) => (p.discountPercent ?? 0) > 0);

const lines = [
  "-- Honest retailer / brand prices. No invented promo codes or fake % off.",
  "-- Sources: Sephora catalog JSON, Shopify product JSON, curated known list prices.",
  "-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "--   npm run catalog:resolve-prices && npm run catalog:generate:0009",
  "--",
  `-- Verified prices: ${stats.verified ?? verified.length}  (Sephora ${stats.verifiedSephora ?? "?"}, Shopify ${stats.verifiedShopify ?? "?"}, known ${stats.knownList ?? "?"})`,
  `-- Cleared fake discounts (full price / no markdown): ${stats.clearedDiscounts ?? cleared.length}`,
  `-- Real list-vs-sale markdowns: ${stats.realMarkdowns ?? markdowns.length}`,
  `-- Total SKUs: ${products.length}`,
  "",
  "-- Compare-at / list price from the linked retailer or brand page.",
  "ALTER TABLE products ADD COLUMN list_price REAL;",
  "",
];

const BATCH = 40;
const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id));
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

lines.push("-- Drop invented mock / seed price-history peaks so leftover clients cannot badge a fake % off.");
lines.push("DELETE FROM price_history;");
lines.push("");

for (let i = 0; i < sorted.length; i += BATCH) {
  const chunk = sorted.slice(i, i + BATCH);
  const values = chunk.map((item) => `  (${sqlStr(item.id)}, ${money(item.price)}, datetime('now'))`);
  lines.push("INSERT INTO price_history (product_id, price, recorded_at) VALUES");
  lines.push(`${values.join(",\n")};`);
  lines.push("");
}

writeFileSync(new URL("../migrations/0009_honest_prices.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(
  `0009: verified=${stats.verified ?? verified.length} sephora=${stats.verifiedSephora ?? "?"} shopify=${stats.verifiedShopify ?? "?"} known=${stats.knownList ?? "?"} clearedDiscounts=${stats.clearedDiscounts ?? cleared.length} markdowns=${stats.realMarkdowns ?? markdowns.length} total=${products.length}`,
);
