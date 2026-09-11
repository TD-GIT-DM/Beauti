/** Write migrations/0010_sync_availability.sql from scripts/data/availability.json */
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("./data/availability.json", import.meta.url), "utf8"));
const products = Object.entries(data.products).map(([id, row]) => ({ id, ...row }));

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const stats = data.stats || {};
const verified = products.filter((p) => p.explicit);
const oos = verified.filter((p) => p.availability === "out_of_stock");
const limited = verified.filter((p) => p.availability === "limited");
const inStock = verified.filter((p) => p.availability === "in_stock");
const flippedIn = verified.filter((p) => p.flipped && p.priorAvailability === "out_of_stock");
const flippedOut = verified.filter(
  (p) => p.flipped && p.priorAvailability !== "out_of_stock" && p.availability === "out_of_stock",
);

const lines = [
  "-- Sync availability + restock_estimate from verified catalog JSON.",
  "-- Sources: Sephora catalog JSON, Shopify product JSON. Do not invent stock.",
  "-- Batched UPDATEs. Do NOT db.exec this file from ensureCatalog:",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "--   npm run catalog:resolve-availability && npm run catalog:generate:0010",
  "--",
  `-- Verified stock: ${stats.verified ?? verified.length}  (Sephora ${stats.verifiedSephora ?? "?"}, Shopify ${stats.verifiedShopify ?? "?"})`,
  `-- Unverified (left unchanged): ${stats.unverified ?? products.length - verified.length}`,
  `-- in_stock ${stats.inStock ?? inStock.length}  out_of_stock ${stats.outOfStock ?? oos.length}  limited ${stats.limited ?? limited.length}`,
  `-- Flipped to in stock (was OOS): ${stats.flippedToInStock ?? flippedIn.length}`,
  `-- Flipped to out of stock: ${stats.flippedToOutOfStock ?? flippedOut.length}`,
  `-- Total SKUs: ${products.length}`,
  "",
];

const BATCH = 40;
const sorted = verified
  .filter((p) => p.explicit && ["in_stock", "out_of_stock", "limited"].includes(p.availability))
  .sort((a, b) => a.id.localeCompare(b.id));

for (let i = 0; i < sorted.length; i += BATCH) {
  const chunk = sorted.slice(i, i + BATCH);
  for (const item of chunk) {
    const restock =
      item.availability === "out_of_stock" && item.restockEstimate
        ? sqlStr(item.restockEstimate)
        : "NULL";
    const score = Number.isFinite(item.dealScore) ? Math.round(item.dealScore) : 40;
    lines.push(
      `UPDATE products SET availability = ${sqlStr(item.availability)}, restock_estimate = ${restock}, deal_score = ${score}, updated_at = datetime('now') WHERE id = ${sqlStr(item.id)};`,
    );
  }
  lines.push("");
}

writeFileSync(new URL("../migrations/0010_sync_availability.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(
  `0010: verified=${sorted.length} sephora=${stats.verifiedSephora ?? "?"} shopify=${stats.verifiedShopify ?? "?"} oos=${stats.outOfStock ?? oos.length} limited=${stats.limited ?? limited.length} flippedIn=${stats.flippedToInStock ?? flippedIn.length} flippedOut=${stats.flippedToOutOfStock ?? flippedOut.length} unverified=${stats.unverified ?? "?"}`,
);
