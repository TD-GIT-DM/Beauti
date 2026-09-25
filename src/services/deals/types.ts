export type Availability = "in_stock" | "out_of_stock" | "limited";

export interface PromoCode {
  code: string;
  label: string;
  discountPercent?: number;
  verified?: boolean;
}

/** Normalized deal snapshot returned by any retailer / affiliate feed. */
export interface DealSnapshot {
  productId: string;
  price: number;
  currency: string;
  promoCodes: PromoCode[];
  dealScore: number;
  availability: Availability;
  restockEstimate: string | null;
  listPrice?: number | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  listPrice?: number | null;
  currency: string;
  promoCodes: PromoCode[];
  dealScore: number;
  availability: Availability;
  restockEstimate: string | null;
  productUrl?: string | null;
}

export interface DealProvider {
  /**
   * Fetch latest deal data for known catalog IDs.
   * Implementations should talk to affiliate APIs (Impact, CJ, ShareASale, retailer feeds)
   * — never scrape retailer storefronts in a way that violates ToS.
   */
  fetchDeals(catalog: CatalogProduct[]): Promise<DealSnapshot[]>;
}

export interface AffiliateClient {
  /** Placeholder for a real affiliate network product feed. */
  getProductFeed(): Promise<DealSnapshot[]>;
}

export interface ScanOptions {
  /** Force a restock, price drop, or mixed cycle — useful for demos. Cron leaves this unset. */
  force?: "restock" | "drop" | "cycle";
  now?: Date;
}

export interface ScanSummary {
  scannedAt: string;
  updated: number;
  restocks: string[];
  priceDrops: string[];
  notificationsCreated: number;
  /** `catalog` = production JSON sync; `demo` = mock force events. */
  mode?: "catalog" | "demo";
  becameOutOfStock?: string[];
  fetched?: number;
  unverified?: number;
  preordersChecked?: number;
  preordersAdded?: number;
  preordersLive?: number;
  preordersRemoved?: number;
}
