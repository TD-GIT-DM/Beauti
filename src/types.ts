export type Availability = "in_stock" | "out_of_stock" | "limited";

export interface PromoCode {
  code: string;
  label: string;
  discountPercent?: number;
  /** True only for a confirmed retailer/brand promo — never invented seed codes. */
  verified?: boolean;
}

export interface PricePoint {
  price: number;
  recordedAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  imageUrl: string;
  price: number;
  /** Retailer list / compare-at when known; equals price when there is no markdown. */
  listPrice?: number | null;
  currency: string;
  productUrl: string;
  tags: string[];
  promoCodes: PromoCode[];
  dealScore: number;
  /** Real list-vs-sale (or verified promo); 0 if the linked page is full price. */
  discountPercent: number;
  availability: Availability;
  restockEstimate: string | null;
  priceHistory: PricePoint[];
  wishlisted?: boolean;
}

export interface AppNotification {
  id: string;
  product_id: string;
  type: "restock" | "price_drop";
  title: string;
  body: string;
  read: number;
  created_at: string;
  product_name: string;
  image_url: string;
  brand: string;
}

export interface TagCount {
  name: string;
  count: number;
}

export type ProductSort = "deal" | "price_asc" | "price_desc" | "discount_desc";

export interface ProductQuery {
  q?: string;
  tag?: string;
  deals?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minDiscount?: number;
  sort?: ProductSort;
  limit?: number;
}

export interface ScanSummary {
  scannedAt: string;
  updated: number;
  restocks: string[];
  priceDrops: string[];
  notificationsCreated: number;
}
