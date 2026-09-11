import { honestDealScore } from "../../lib/discount";
import type { Availability, CatalogProduct, DealProvider, DealSnapshot, PromoCode } from "./types";

const RESTOCK_COPY = [
  "this week",
  "late September",
  "early October",
  "mid-October to early November",
  "unknown / may not return",
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: number): number {
  return (seed % 10_000) / 10_000;
}

function pick<T>(seed: number, items: T[]): T {
  return items[seed % items.length];
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function identitySnapshot(product: CatalogProduct): DealSnapshot {
  return {
    productId: product.id,
    price: product.price,
    currency: product.currency,
    promoCodes: product.promoCodes,
    dealScore: product.dealScore,
    availability: product.availability,
    restockEstimate: product.restockEstimate,
  };
}

/**
 * Demo retailer feed.
 *
 * Production cron must not invent prices or promo codes — snapshots match the
 * honest catalog. Availability can jitter slightly for local demos; price and
 * promo_codes stay exactly as stored. Swap this class for a licensed affiliate
 * feed later. Never scrape storefront HTML.
 */
export class MockRetailerFeed implements DealProvider {
  private readonly scanIndex: number;
  private readonly mutateAvailability: boolean;

  constructor(scanIndex: number, mutateAvailability = false) {
    this.scanIndex = scanIndex;
    this.mutateAvailability = mutateAvailability;
  }

  async fetchDeals(catalog: CatalogProduct[]): Promise<DealSnapshot[]> {
    return catalog.map((product) => this.snapshotFor(product));
  }

  private snapshotFor(product: CatalogProduct): DealSnapshot {
    const snap = identitySnapshot(product);
    if (!this.mutateAvailability) return snap;

    const seed = hash(`${product.id}:avail:${this.scanIndex}`);
    const roll2 = unit(seed);
    let availability: Availability = product.availability;
    let restockEstimate = product.restockEstimate;

    if (product.availability === "out_of_stock") {
      if (roll2 < 0.42) {
        availability = "in_stock";
        restockEstimate = null;
      } else {
        restockEstimate = pick(seed, RESTOCK_COPY);
      }
    } else if (product.availability === "limited") {
      if (roll2 < 0.25) availability = "in_stock";
      else if (roll2 > 0.92) {
        availability = "out_of_stock";
        restockEstimate = pick(seed + 3, RESTOCK_COPY);
      }
    } else if (roll2 > 0.94) {
      availability = "limited";
    } else if (roll2 > 0.985) {
      availability = "out_of_stock";
      restockEstimate = pick(seed + 7, RESTOCK_COPY);
    }

    return {
      ...snap,
      availability,
      restockEstimate,
      dealScore: honestDealScore(product.price, product.listPrice ?? product.price, availability),
    };
  }
}

/** Apply a guaranteed restock / drop on top of the catalog for demos only. */
export function applyForcedEvents(
  catalog: CatalogProduct[],
  snapshots: DealSnapshot[],
  force: "restock" | "drop" | "cycle",
): DealSnapshot[] {
  const byId = new Map(snapshots.map((s) => [s.productId, { ...s }]));

  if (force === "restock" || force === "cycle") {
    const oos = catalog.find((p) => p.availability === "out_of_stock") ?? catalog[0];
    const snap = byId.get(oos.id);
    if (snap) {
      snap.availability = "in_stock";
      snap.restockEstimate = null;
      snap.dealScore = honestDealScore(snap.price, oos.listPrice ?? oos.price, "in_stock");
    }
  }

  if (force === "drop" || force === "cycle") {
    const inStock =
      catalog.find((p) => p.availability === "in_stock" && p.price > 10) ?? catalog[0];
    const snap = byId.get(inStock.id);
    if (snap) {
      const list = inStock.listPrice && inStock.listPrice > inStock.price ? inStock.listPrice : inStock.price;
      snap.price = roundMoney(inStock.price * 0.82);
      snap.promoCodes = [] as PromoCode[];
      snap.dealScore = honestDealScore(snap.price, list, snap.availability);
    }
  }

  return [...byId.values()];
}
