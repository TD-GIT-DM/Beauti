import type { PricePoint, PromoCode } from "../types";

export function promoDiscountPercent(promoCodes: PromoCode[]): number {
  return promoCodes.reduce((max, promo) => Math.max(max, promo.discountPercent ?? 0), 0);
}

export function historyDiscountPercent(price: number, history: PricePoint[], peakPrice?: number): number {
  const peak = Math.max(price, peakPrice ?? 0, ...history.map((point) => point.price));
  if (peak <= 0 || price >= peak) return 0;
  return Math.round(((peak - price) / peak) * 100);
}

/** Best available deal percent from promo codes and/or a higher historical price. */
export function productDiscountPercent(
  promoCodes: PromoCode[],
  price: number,
  history: PricePoint[] = [],
  peakPrice?: number,
): number {
  return Math.max(promoDiscountPercent(promoCodes), historyDiscountPercent(price, history, peakPrice));
}
