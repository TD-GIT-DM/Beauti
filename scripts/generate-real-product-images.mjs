/** Write migrations/0007_real_product_images.sql from scripts/data/real-product-images.json */
import { readFileSync, writeFileSync } from "node:fs";
import { productUrlFor, sephoraSearchUrl } from "./lib/catalog-media.mjs";

const data = JSON.parse(readFileSync(new URL("./data/real-product-images.json", import.meta.url), "utf8"));
const products = Object.entries(data.products).map(([id, row]) => ({ id, ...row }));

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const verified = products.filter((p) => p.verified && p.url && !String(p.url).includes("?"));
const placeholder = products.filter((p) => !verified.some((v) => v.id === p.id));

const lines = [
  "-- Official pack shots + retailer/search product_url updates.",
  "-- No URL query strings (D1 db.exec treats `?` as bind placeholders).",
  "-- Apply with wrangler — do NOT db.exec this file from ensureCatalog:",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "--",
  `-- Verified official product images: ${verified.length}`,
  `-- Left as pack-like placeholders (tagged image-placeholder): ${placeholder.length}`,
  "",
];

products
  .sort((a, b) => a.id.localeCompare(b.id))
  .forEach((item, index) => {
    const link = productUrlFor(item);
    const sets = [`product_url = ${sqlStr(link)}`, "updated_at = datetime('now')"];
    if (item.verified && item.url && !String(item.url).includes("?")) {
      sets.unshift(`image_url = ${sqlStr(item.url)}`);
    }
    lines.push(`UPDATE products SET ${sets.join(", ")} WHERE id = ${sqlStr(item.id)};`);
    if ((index + 1) % 40 === 0) lines.push("");
  });

if (placeholder.length) {
  lines.push("");
  lines.push("-- Flag SKUs that still use the best pack-like / category photo.");
  for (let i = 0; i < placeholder.length; i += 40) {
    const part = placeholder.slice(i, i + 40);
    const idList = part.map((p) => sqlStr(p.id)).join(", ");
    lines.push(
      "UPDATE products SET tags = CASE " +
        "WHEN instr(tags, '\"image-placeholder\"') > 0 THEN tags " +
        "WHEN tags = '[]' THEN '[\"image-placeholder\"]' " +
        "ELSE substr(tags, 1, length(tags) - 1) || ',\"image-placeholder\"]' " +
        "END, updated_at = datetime('now') " +
        `WHERE id IN (${idList});`,
    );
    lines.push("");
  }
}

writeFileSync(new URL("../migrations/0007_real_product_images.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(`0007: verified=${verified.length} placeholder=${placeholder.length} total=${products.length}`);
console.log("sample search fallback", sephoraSearchUrl("MAC", "Ruby Woo Lipstick"));
