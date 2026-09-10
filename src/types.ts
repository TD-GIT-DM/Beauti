export type Availability = "in_stock" | "out_of_stock" | "limited";

export interface PromoCode {
  code: string;
  label: string;
  discountPercent?: number;
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
  currency: string;
  productUrl: string;
  tags: string[];
  promoCodes: PromoCode[];
  dealScore: number;
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

export interface ScanSummary {
  scannedAt: string;
  updated: number;
  restocks: string[];
  priceDrops: string[];
  notificationsCreated: number;
}
