import type { Availability, PricePoint, PromoCode } from "../types";

/** Retailer list vs current selling price. 0 when there is no real markdown. */
export function markdownPercent(price: number, listPrice?: number | null): number {
  if (listPrice == null || listPrice <= 0 || price <= 0 || price >= listPrice) return 0;
  return Math.round(((listPrice - price) / listPrice) * 100);
}

/** Only verified retailer / brand promos count — invented seed codes do not. */
export function promoDiscountPercent(promoCodes: PromoCode[]): number {
  return promoCodes.reduce((max, promo) => {
    if (!promo.verified) return max;
    return Math.max(max, promo.discountPercent ?? 0);
  }, 0);
}

/**
 * @deprecated Price-history peaks were used to invent "% off" from mock scanner jitter.
 * Kept for charts only — do not use for advertised discounts.
 */
export function historyDiscountPercent(price: number, history: PricePoint[], peakPrice?: number): number {
  const peak = Math.max(price, peakPrice ?? 0, ...history.map((point) => point.price));
  if (peak <= 0 || price >= peak) return 0;
  return Math.round(((peak - price) / peak) * 100);
}

/**
 * Advertised discount: real list-vs-sale markdown, or a verified promo.
 * Fake seed codes and price-history peaks do not create a badge.
 */
export function productDiscountPercent(
  promoCodes: PromoCode[],
  price: number,
  _history: PricePoint[] = [],
  _peakPrice?: number,
  listPrice?: number | null,
): number {
  return Math.max(markdownPercent(price, listPrice), promoDiscountPercent(promoCodes));
}

/** Rank real markdowns first; full-price SKUs get a modest best-price score. */
export function honestDealScore(
  price: number,
  listPrice?: number | null,
  availability: Availability = "in_stock",
): number {
  const discount = markdownPercent(price, listPrice);
  let score = 32 + discount * 1.8;
  if (discount <= 0) {
    if (price <= 15) score += 12;
    else if (price <= 28) score += 8;
    else if (price <= 45) score += 4;
  }
  if (availability === "limited") score -= 6;
  if (availability === "out_of_stock") score -= 22;
  return Math.max(8, Math.min(99, Math.round(score)));
}
