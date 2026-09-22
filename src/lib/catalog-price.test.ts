import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogTitleRank,
  chooseVerifiedPrice,
  priceIsPlausible,
  pricesFromSephoraProduct,
  pricesFromShopify,
  shopifyAmount,
  shopifyListingFits,
  titleFitsCatalog,
} from "./catalog-price.ts";

test("valuePrice is the compare-at when list price is a single sell price", () => {
  const row = pricesFromSephoraProduct(
    { currentSku: { listPrice: "$34.00", valuePrice: "$48.00" }, onSaleData: "NONE" },
    "Violet Faves",
    34,
  );
  assert.deepEqual(row, { price: 34, listPrice: 48 });
});

test("salePrice below list wins over a higher set value", () => {
  const row = pricesFromSephoraProduct(
    {
      currentSku: { listPrice: "$26.00", salePrice: "$18.20", valuePrice: "$45.00" },
      onSaleData: "FULL",
    },
    "Extra Fussy",
    26,
  );
  assert.deepEqual(row, { price: 18.2, listPrice: 26 });
});

test("salePrice equal to the low end of a range is not a discount", () => {
  const row = pricesFromSephoraProduct(
    { currentSku: { listPrice: "$37.00 - $39.00", salePrice: "$37.00" }, onSaleData: "NONE" },
    "Pillow Talk",
    37,
  );
  assert.deepEqual(row, { price: 37, listPrice: 37 });
});

test("a full-size price inside a published range is not replaced by the travel size", () => {
  const row = pricesFromSephoraProduct(
    { currentSku: { listPrice: "$90.00 - $330.00" } },
    "Bal d'Afrique Eau de Parfum",
    196,
  );
  assert.deepEqual(row, { price: 196, listPrice: 196 });
});

test("a sale below every list price uses the low list as compare-at", () => {
  const row = pricesFromSephoraProduct(
    { currentSku: { listPrice: "$14.00 - $15.00", salePrice: "$7.00" }, onSaleData: "FULL" },
    "Colorful Blush",
    14,
  );
  assert.deepEqual(row, { price: 7, listPrice: 14 });
});

test("shopify .js cents and products.json dollars both read compare-at", () => {
  assert.equal(shopifyAmount(3400, "cents"), 34);
  assert.equal(shopifyAmount("34.00", "dollars"), 34);
  const js = pricesFromShopify(
    { variants: [{ title: "Default Title", price: 3400, compare_at_price: 4800 }] },
    "Soft Pinch",
    { unit: "cents", prior: 48 },
  );
  const json = pricesFromShopify(
    { variants: [{ title: "Default Title", price: "34.00", compare_at_price: "48.00" }] },
    "Soft Pinch",
    { unit: "dollars", prior: 48 },
  );
  assert.deepEqual(js, { price: 34, listPrice: 48 });
  assert.deepEqual(json, { price: 34, listPrice: 48 });
});

test("a miniature is not the sell price when the bottle is a different size", () => {
  const bottle = pricesFromShopify(
    {
      variants: [
        { title: "100ml", price: "140.00", compare_at_price: null },
        { title: "10ml Miniature", price: "88.00", compare_at_price: null },
      ],
    },
    "Vanilla | 28",
    { unit: "dollars", prior: 130 },
  );
  assert.deepEqual(bottle, { price: 140, listPrice: 140 });
  const skipped = pricesFromShopify(
    {
      variants: [
        { title: "100ml", price: "559.00", compare_at_price: null },
        { title: "10ml Miniature", price: "125.00", compare_at_price: null },
      ],
    },
    "Vanilla | 28",
    { unit: "dollars", prior: 88 },
  );
  assert.equal(skipped, null);
});

test("no real discount keeps the linked price instead of a lower unrelated quote", () => {
  const row = chooseVerifiedPrice([
    { price: 40, listPrice: 40, linked: true },
    { price: 18, listPrice: 18, linked: false },
  ]);
  assert.deepEqual(row, { price: 40, listPrice: 40 });
});

test("a real compare-at raises an understated full price", () => {
  const row = chooseVerifiedPrice([
    { price: 25, listPrice: 25, linked: true },
    { price: 20, listPrice: 28, linked: false },
  ]);
  assert.deepEqual(row, { price: 20, listPrice: 28 });
});

test("samples, coffrets, and jumbo sizes do not match a regular product", () => {
  assert.equal(titleFitsCatalog("Naxos Eau de Parfum", "Naxos Sample"), false);
  assert.equal(titleFitsCatalog("Delina Eau de Parfum", "DELINA COFFRET"), false);
  assert.equal(titleFitsCatalog("Vitamin C Complex Serum", "Vitamin C Complex Serum - Jumbo"), false);
  assert.equal(titleFitsCatalog("Naxos Eau de Parfum", "Naxos"), true);
  assert.equal(titleFitsCatalog("Molecule 01", "Molecule 01 + Clary Sage"), false);
});

test("a sample price is not a plausible sell price for the full bottle", () => {
  assert.equal(priceIsPlausible(6.25, 305), false);
  assert.equal(priceIsPlausible(12.75, 17), true);
  assert.equal(priceIsPlausible(8, 7), true);
});

test("a tag-like title match requires the catalog name, not a nearby price", () => {
  assert.ok(catalogTitleRank("Stay All Night Micro-Fine Setting Mist", "Stay All Night Micro-Fine Setting Mist"));
  assert.equal(
    catalogTitleRank("Stay All Night Micro-Fine Setting Mist", "O FACE Satin Lipstick - All Night"),
    null,
  );
  assert.equal(catalogTitleRank("Molecule 01", "Escentric 01"), null);
  assert.ok(catalogTitleRank("Molecule 01", "Molecule 01"));
  assert.equal(catalogTitleRank("Molecule 01", "Molecule 01 + Clary Sage"), null);
  const revive = catalogTitleRank("Revive Serum Ginseng + Snail", "Revive Serum : Ginseng + Snail Mucin");
  assert.equal(revive?.extra, 1);
  assert.equal(catalogTitleRank("Revive Serum Ginseng + Snail", "Relief Sun"), null);
  assert.ok(catalogTitleRank("Delina Eau de Parfum", "DELINA"));
  assert.equal(catalogTitleRank("Delina Eau de Parfum", "DELINA EXCLUSIF"), null);
  assert.equal(catalogTitleRank("Delina Eau de Parfum", "DELINA LA ROSEE"), null);
  assert.equal(catalogTitleRank("Slant Tweezer", "Navy Blue Slant Tweezer"), null);
  assert.ok(catalogTitleRank("Vanilla Sky Body Mist", "Vanilla Sky Hair & Body Mist"));
  assert.equal(catalogTitleRank("Naxos Eau de Parfum", "Naxos Sample"), null);
  assert.equal(
    catalogTitleRank("Pro Filt'r Soft Matte Foundation 370", "Pro Filt'r Soft Matte Powder Foundation"),
    null,
  );
  assert.equal(catalogTitleRank("Not Another Cherry Eau de Parfum", "Not Another Cherry - Candles"), null);
  assert.equal(catalogTitleRank("Retinol Serum", "Starter Retinol Serum"), null);
  assert.equal(catalogTitleRank("Vanilla | 28 Travel Spray", "Vanilla | 28"), null);
  assert.ok(catalogTitleRank("The Vitamin C 23 Serum", "Advanced The Vitamin C 23 Serum"));
  assert.ok(catalogTitleRank("Velvet Ribbon Lipstick", "Velvet Ribbon (True Velvet Lip Colour)"));
  assert.equal(
    shopifyListingFits("Molecule 01", { title: "Molecule 01", type: "10ml Sample", tags: ["Sample"] }),
    false,
  );
});

test("with no linked quote and no compare-at, use the lowest verified price", () => {
  const row = chooseVerifiedPrice([
    { price: 22, listPrice: 22 },
    { price: 18, listPrice: 18 },
  ]);
  assert.deepEqual(row, { price: 18, listPrice: 18 });
});
