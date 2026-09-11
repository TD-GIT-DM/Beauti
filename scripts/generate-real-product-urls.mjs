/** Write migrations/0008_real_product_urls.sql from scripts/data/real-product-urls.json */
import { readFileSync, writeFileSync } from "node:fs";
import { isVerifiedStoredPdp, retailerSearchPathUrl, stripUrlQuery } from "./lib/product-url.mjs";

const data = JSON.parse(readFileSync(new URL("./data/real-product-urls.json", import.meta.url), "utf8"));
const products = Object.entries(data.products).map(([id, row]) => ({ id, ...row }));

function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function storedUrl(item) {
  const raw = stripUrlQuery(item.productUrl || "");
  if (raw && !raw.includes("?") && isVerifiedStoredPdp(raw)) return raw;
  if (raw && !raw.includes("?") && /^https:\/\/www\.(sephora|ulta)\.com\//i.test(raw)) {
    // path-only retailer search / brand listing (no query string)
    return raw;
  }
  return retailerSearchPathUrl(item.brand, item.name);
}

const verified = products.filter((p) => ["sephora-pdp", "ulta-pdp", "brand-pdp"].includes(p.kind));
const fallback = products.filter((p) => !verified.some((v) => v.id === p.id));
const sephora = products.filter((p) => p.kind === "sephora-pdp").length;
const ulta = products.filter((p) => p.kind === "ulta-pdp").length;
const brand = products.filter((p) => p.kind === "brand-pdp").length;

const lines = [
  "-- Real retailer / brand product URLs (no Google).",
  "-- Batched UPDATEs. No URL query strings (D1 db.exec treats question marks as binds).",
  "-- Apply with wrangler — do NOT db.exec this file from ensureCatalog:",
  "--   npm run db:migrate:local",
  "--   npm run db:migrate:remote",
  "-- Production D1 (Cloudflare MCP): d1_database_query on database_id",
  "--   f83c9aae-86c4-457a-882a-fd86d1fb85bb  (batched UPDATEs, or wrangler remote migrate).",
  "-- Worker fallback for any remaining fake/missing URL is Sephora keyword search",
  "--   or Ulta search (never Google). See src/lib/product-url.ts.",
  "--",
  `-- Verified PDPs: ${verified.length}  (Sephora ${sephora}, Ulta ${ulta}, brand ${brand})`,
  `-- Retailer-search fallback: ${fallback.length}`,
  `-- Total SKUs: ${products.length}`,
  "",
];

const BATCH = 40;
const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id));
for (let i = 0; i < sorted.length; i += BATCH) {
  const chunk = sorted.slice(i, i + BATCH);
  for (const item of chunk) {
    const link = storedUrl(item);
    if (link.includes("?")) {
      throw new Error(`Query string in product_url for ${item.id}: ${link}`);
    }
    lines.push(
      `UPDATE products SET product_url = ${sqlStr(link)}, updated_at = datetime('now') WHERE id = ${sqlStr(item.id)};`,
    );
  }
  lines.push("");
}

writeFileSync(new URL("../migrations/0008_real_product_urls.sql", import.meta.url), `${lines.join("\n").trim()}\n`);
console.log(
  `0008: verifiedPdp=${verified.length} sephora=${sephora} ulta=${ulta} brand=${brand} fallback=${fallback.length} total=${products.length}`,
);
