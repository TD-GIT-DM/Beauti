import assert from "node:assert/strict";
import { test } from "node:test";
import { handleOverlap, pricesFromSephoraProduct, pricesFromShopify, priceNearCatalog } from "./catalog-sources.ts";

test("sephora full markdown pairs list and sale", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "FULL",
      currentSku: { listPrice: "$29.00", salePrice: "$14.50" },
    },
    "Stunna Lip Paint Uncensored",
    26,
  );
  assert.deepEqual(quote, { price: 14.5, listPrice: 29 });
});

test("sephora range low echoed as sale is not a discount", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "NONE",
      currentSku: { listPrice: "$37.00 - $39.00", salePrice: "$37.00" },
    },
    "Matte Revolution Lipstick",
    37,
  );
  assert.deepEqual(quote, { price: 37, listPrice: 37 });
});

test("sephora ended sale snaps back to the same size list price", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "NONE",
      currentSku: { listPrice: "$25.00 - $46.00", salePrice: null },
    },
    "Honey Infused Hair Oil",
    41.4,
  );
  assert.deepEqual(quote, { price: 46, listPrice: 46 });
});

test("sephora does not pair the cheapest sale with a larger list", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "FULL",
      currentSku: { listPrice: "$20.00 - $40.00", salePrice: "$10.00 - $30.00" },
    },
    "Body Cream",
    40,
  );
  assert.ok(quote);
  assert.equal(quote.listPrice, 40);
  assert.equal(quote.price, 30);
});

test("shopify cents keep the size that is actually on sale", () => {
  const quote = pricesFromShopify(
    {
      variants: [
        { title: "30ml", price: 1360, compare_at_price: 1700, available: true },
        { title: "60ml", price: 2210, compare_at_price: 3400, available: true },
      ],
    },
    "Glow Serum",
    34,
    "cents",
  );
  assert.deepEqual(quote, { price: 22.1, listPrice: 34 });
});

test("shopify dollars are not divided by 100", () => {
  const quote = pricesFromShopify(
    {
      variants: [{ title: "Default Title", price: "14.00", compare_at_price: null }],
    },
    "Blue Moon Palette",
    12.95,
    "dollars",
  );
  assert.deepEqual(quote, { price: 14, listPrice: 14 });
});

test("shopify skips a jumbo set when the catalog price is the regular size", () => {
  const quote = pricesFromShopify(
    {
      variants: [
        { title: "Travel spray", price: 1700, compare_at_price: null },
        { title: "50ml", price: 13000, compare_at_price: null },
        { title: "Discovery set", price: 55900, compare_at_price: null },
      ],
    },
    "Invite Only Amber",
    130,
    "cents",
  );
  assert.deepEqual(quote, { price: 130, listPrice: 130 });
});

test("sephora keeps a mid-size price inside a wide range", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "NONE",
      currentSku: { listPrice: "$50.00 - $450.00" },
    },
    "Love Don't Be Shy",
    255,
  );
  assert.deepEqual(quote, { price: 255, listPrice: 255 });
});

test("sephora single-sku sale replaces a full price", () => {
  const quote = pricesFromSephoraProduct(
    {
      onSaleData: "FULL",
      currentSku: { listPrice: "$29.00", salePrice: "$14.50" },
    },
    "Stunna Lip Paint",
    29,
  );
  assert.deepEqual(quote, { price: 14.5, listPrice: 29 });
});

test("brand catalog handle must be the same product", () => {
  const url = "https://parfums-de-marly.com/products/delina-mini-candle";
  assert.ok(handleOverlap(url, { handle: "delina-mini-candle" }) >= 0.45);
  assert.ok(handleOverlap(url, { handle: "delina-coffret" }) < 0.45);
});

test("fuzzy shop matches reject a different size", () => {
  assert.equal(priceNearCatalog(8, 8, 7), true);
  assert.equal(priceNearCatalog(559, 559, 130), false);
});
