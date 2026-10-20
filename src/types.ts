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

/** A shopper comment copied from the retailer or review app. Text is verbatim. */
export interface ReviewQuote {
  rating: number;
  text: string;
  date: string | null;
  author: string | null;
}

/**
 * Verified review snapshot.
 * `ok` has a rating, a count, or quoted comments from a real source.
 * `none` means the page was checked and nothing verifiable was there.
 * Cards only show stars when `rating` and `count` are both set.
 */
export interface ProductReviews {
  status: "ok" | "none";
  rating: number | null;
  count: number | null;
  source: string | null;
  sourceUrl: string | null;
  fetchedAt: string | null;
  positive?: ReviewQuote[];
  negative?: ReviewQuote[];
  /** `mixed` is 3-star comments, used only when the source had no 1- or 2-star text. */
  negativeLabel?: "negative" | "mixed" | null;
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
  promoCodes: PromoCode[];
  dealScore: number;
  /** Real list-vs-sale (or verified promo); 0 if the linked page is full price. */
  discountPercent: number;
  availability: Availability;
  restockEstimate: string | null;
  priceHistory: PricePoint[];
  wishlisted?: boolean;
  reviews: ProductReviews | null;
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

export type ProductSort = "deal" | "price_asc" | "price_desc" | "discount_desc";

export interface ProductQuery {
  q?: string;
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

export interface AccountUser {
  id: string;
  username: string;
  themeMain: string | null;
  themeSecondary: string | null;
  themeBackground: string | null;
  themeFont: string | null;
}

export interface AdvisorProduct {
  id: string;
  name: string;
  brand: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  availability: Availability;
  restockEstimate: string | null;
  reviews?: ProductReviews | null;
}

export interface AdvisorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorSearchHint {
  q?: string;
}

export type PreorderKind = "upcoming_deal" | "coming_soon";
export type DatePrecision = "datetime" | "date" | "month" | "unconfirmed";

export interface PublicPreorder {
  id: string;
  kind: PreorderKind;
  name: string;
  brand: string;
  description: string;
  imageUrl: string | null;
  productUrl: string;
  sourceUrl: string;
  price: number | null;
  listPrice: number | null;
  currency: string;
  discountPercent: number;
  startsAt: string | null;
  endsAt: string | null;
  datePrecision: DatePrecision;
  dateLabel: string | null;
  lastVerifiedAt: string;
  wishlisted: boolean;
}

export interface AdvisorResponse {
  reply: string;
  products: AdvisorProduct[];
  searchHint: AdvisorSearchHint | null;
  grounded: boolean;
  model: string | null;
}
