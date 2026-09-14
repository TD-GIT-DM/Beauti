import type { Availability } from "../types";

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function stockLabel(product: { availability: Availability }) {
  if (product.availability === "out_of_stock") return "Out of stock";
  if (product.availability === "limited") return "Limited";
  return "In stock";
}

export function formatDiscount(percent: number) {
  return `${Math.round(percent)}% off`;
}
