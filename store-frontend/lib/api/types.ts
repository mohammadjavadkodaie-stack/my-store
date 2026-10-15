/**
 * Domain types for the public backend API (NestJS on localhost:3000, reached
 * through the rewrite defined in next.config.ts).
 *
 * Only fields that the public endpoints actually return are declared here:
 * stock, description-in-list, isActive and the other admin-only fields never
 * appear in these payloads. The one exception is `AdminSlide`, the admin-only
 * row shared by the /admin/slides table and its row actions.
 */

/** Values of the backend `Platform` enum (prisma/schema.prisma). */
export type Platform =
  | "PS5"
  | "PS4"
  | "PS3"
  | "PS2"
  | "XBOX_SERIES"
  | "XBOX_ONE"
  | "SWITCH"
  | "SWITCH_LITE"
  | "PC"
  | "STEAM_DECK"
  | "PS_VR"
  | "XBOX"
  | "ACCESSORY"
  | "GIFT_CARD";

/** Allowed values of the `sort` query param of GET /products. */
export type ProductSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "best_selling"
  | "discount";

/** Envelope returned by every public list endpoint (products and categories). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Trimmed category object embedded in product responses. */
export interface ProductCategoryRef {
  name: string;
  slug: string;
  platform: Platform;
}

/** Item shape returned by GET /products. */
export interface Product {
  id: number;
  name: string;
  slug: string;
  /** Integer price in Toman (no currency formatting). */
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  region: string | null;
  images: string[];
  brand: string | null;
  category: ProductCategoryRef;
  /** Derived from stock on the backend; the raw stock number is never exposed. */
  inStock: boolean;
  /** Stock count only when it is between 1 and 3, otherwise null. */
  lowStock: number | null;
}

/** Shape returned by GET /products/:slug — the list fields plus these. */
export interface ProductDetail extends Product {
  description: string;
  portsCount: number | null;
  weight: number | null;
  /** ISO-8601 timestamp. */
  createdAt: string;
  sku: string | null;
  genres: string[];
  /** Key/value specs (backend validates plain string values), may be null. */
  specs: Record<string, string> | null;
}

/**
 * Shape returned by GET /categories and GET /categories/:slug.
 * Both endpoints return the same public view, so one type covers them.
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  platform: Platform;
  image: string | null;
  /** Number of active products inside the category. */
  productCount: number;
}

/**
 * Admin view of one home-page slide (GET /admin/slides): the fields the admin
 * table renders plus the admin-only `isActive` and `sortOrder`. The endpoint
 * returns the rows already ordered by `sortOrder`, so the table renders them in
 * the order it receives them.
 *
 * Every optional text field is `string | null` (an absent value is never an
 * empty string on the wire) and stays runtime-guarded before rendering.
 */
export interface AdminSlide {
  id: number;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  linkPath: string | null;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Public view of one home-page slide (GET /slides): the same row as
 * `AdminSlide` minus the admin-only fields (`isActive`, `sortOrder`), because
 * the endpoint already returns only the active slides in `sortOrder`.
 *
 * `imageUrl` is required (a slide without an image cannot be rendered) while
 * every text field is nullable *and* optional — an absent value is never an
 * empty string on the wire. Rendering code must therefore treat them as
 * possibly `null`/`undefined` and guard the URLs before putting them in
 * `src`/`href`.
 */
export interface HeroSlide {
  id: number;
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  buttonLabel?: string | null;
  linkPath?: string | null;
}

/**
 * Shape returned by GET /settings/discount-band — the home discount band.
 *
 * `timerEndsAt` is an ISO-8601 timestamp (or null when unset) and `serverNow` is
 * the server clock at response time. The client combines the two to render a
 * countdown that is immune to the visitor's clock skew.
 */
export interface DiscountBandSettings {
  /** false hides the whole band on the home page. */
  bandEnabled: boolean;
  timerEnabled: boolean;
  timerEndsAt: string | null;
  serverNow: string;
}

/**
 * Query params of GET /products.
 * Search uses `q` (the backend rejects an unknown `search` param with 400).
 */
export type ProductQuery = {
  platform?: Platform;
  categorySlug?: string;
  /** Repeated key or comma separated list on the wire. */
  brand?: string[];
  genre?: string[];
  region?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: "true" | "false";
  onSale?: "true";
  featured?: "true";
  sort?: ProductSort;
  page?: number;
  limit?: number;
};

/** Query params of GET /categories. */
export type CategoryQuery = {
  platform?: Platform;
  page?: number;
  limit?: number;
};
