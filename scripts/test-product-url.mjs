/** Sanity checks for retailer product-link helpers (no Google). */
import {
  isSephoraPdp,
  isVerifiedStoredPdp,
  prefersUltaSearch,
  retailerKeywordSearchUrl,
  retailerSearchPathUrl,
  stripUrlQuery,
} from "./lib/product-url.mjs";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  }
}

assert(
  isSephoraPdp("https://www.sephora.com/product/soft-pinch-liquid-blush-P97989778"),
  "real Sephora -P id is a PDP",
);
assert(
  !isSephoraPdp("https://www.sephora.com/product/mac-ruby-woo"),
  "fake beauti-id slug is not a PDP",
);
assert(
  !isVerifiedStoredPdp("https://www.google.com/search?q=mac+ruby+woo"),
  "Google search is not a stored PDP",
);
assert(
  retailerKeywordSearchUrl("Rare Beauty", "Soft Pinch Liquid Blush") ===
    "https://www.sephora.com/search?keyword=Rare%20Beauty%20Soft%20Pinch%20Liquid%20Blush",
  "Sephora keyword search fallback",
);
assert(
  prefersUltaSearch("Maybelline") &&
    retailerKeywordSearchUrl("Maybelline", "Sky High Mascara") ===
      "https://www.ulta.com/search?search=Maybelline%20Sky%20High%20Mascara",
  "Ulta keyword search fallback for mass brands",
);
assert(
  !retailerSearchPathUrl("MAC", "Ruby Woo Lipstick").includes("?"),
  "SQL path URLs must not contain ?",
);
assert(
  !retailerSearchPathUrl("Maybelline", "Sky High").includes("?"),
  "Ulta brand path must not contain ?",
);
assert(stripUrlQuery("https://www.sephora.com/product/x-P1?skuId=2") === "https://www.sephora.com/product/x-P1", "strip sku query");

if (process.exitCode) {
  console.error("product-url tests failed");
} else {
  console.log("product-url tests ok");
}
