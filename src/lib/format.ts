import type { Product } from "../types";

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function stockLabel(product: Product) {
  if (product.availability === "out_of_stock") return "Out of stock";
  if (product.availability === "limited") return "Limited";
  return "In stock";
}
