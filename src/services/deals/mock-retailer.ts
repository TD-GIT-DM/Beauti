import type { Availability, CatalogProduct, DealProvider, DealSnapshot, PromoCode } from "./types";

const PROMO_POOL: PromoCode[][] = [
  [{ code: "BEAUTI15", label: "15% off with Beauti", discountPercent: 15 }],
  [{ code: "GLOW20", label: "20% off glow picks", discountPercent: 20 }],
  [{ code: "GOLD10", label: "10% off", discountPercent: 10 }],
  [{ code: "REST20", label: "Restock welcome 20%", discountPercent: 20 }],
  [],
];

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

function scoreDeal(price: number, previous: number, promos: PromoCode[], availability: Availability): number {
  const promo = Math.max(0, ...promos.map((p) => p.discountPercent ?? 0));
  const drop = previous > 0 ? Math.max(0, ((previous - price) / previous) * 100) : 0;
  let score = 40 + promo * 1.6 + drop * 2.2;
  if (availability === "limited") score -= 8;
  if (availability === "out_of_stock") score -= 22;
  if (price < 30) score += 6;
  return Math.max(12, Math.min(99, Math.round(score)));
}

/**
 * Mock retailer / affiliate feed.
 *
 * Swap this class for Impact, CJ, ShareASale, or a licensed product feed later.
 * It never fetches third-party HTML; updates are simulated against the seeded catalog.
 */
export class MockRetailerFeed implements DealProvider {
  private readonly scanIndex: number;

  constructor(scanIndex: number) {
    this.scanIndex = scanIndex;
  }

  async fetchDeals(catalog: CatalogProduct[]): Promise<DealSnapshot[]> {
    return catalog.map((product) => this.snapshotFor(product));
  }

  private snapshotFor(product: CatalogProduct): DealSnapshot {
    const seed = hash(`${product.id}:${this.scanIndex}`);
    const roll = unit(seed);
    const roll2 = unit(hash(`${product.id}:avail:${this.scanIndex}`));

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

    let price = product.price;
    if (roll < 0.22) {
      const dropPct = 0.06 + unit(seed + 11) * 0.14;
      price = roundMoney(product.price * (1 - dropPct));
    } else if (roll > 0.88) {
      price = roundMoney(product.price * (1 + 0.03 + unit(seed + 19) * 0.04));
    } else {
      const jitter = (unit(seed + 23) - 0.5) * 0.03;
      price = roundMoney(product.price * (1 + jitter));
    }
    price = Math.max(4, price);

    const promoRoll = unit(hash(`${product.id}:promo:${this.scanIndex}`));
    const promoCodes =
      promoRoll < 0.55
        ? pick(seed + 41, PROMO_POOL.filter((p) => p.length > 0))
        : product.promoCodes.length && promoRoll < 0.8
          ? product.promoCodes
          : [];

    return {
      productId: product.id,
      price,
      currency: product.currency,
      promoCodes,
      dealScore: scoreDeal(price, product.price, promoCodes, availability),
      availability,
      restockEstimate,
    };
  }
}

/** Apply a guaranteed restock / drop on top of the mock feed for demos. */
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
      snap.dealScore = Math.min(99, snap.dealScore + 12);
      if (!snap.promoCodes.length) {
        snap.promoCodes = [{ code: "REST20", label: "Restock welcome 20%", discountPercent: 20 }];
      }
    }
  }

  if (force === "drop" || force === "cycle") {
    const inStock =
      catalog.find((p) => p.availability === "in_stock" && p.price > 10) ?? catalog[0];
    const snap = byId.get(inStock.id);
    if (snap) {
      snap.price = roundMoney(inStock.price * 0.82);
      snap.dealScore = Math.min(99, Math.max(snap.dealScore, 90));
      snap.promoCodes = snap.promoCodes.length
        ? snap.promoCodes
        : [{ code: "DROP18", label: "18% price drop", discountPercent: 18 }];
    }
  }

  return [...byId.values()];
}
