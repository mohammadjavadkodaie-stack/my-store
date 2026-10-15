import type { ProductQuery, ProductSort } from "@/lib/api/types";
import { isPlatform } from "@/lib/platforms";

/**
 * Parsing/building of the `/products` query string.
 *
 * Everything coming from `searchParams` is untrusted, so the parser is a strict
 * whitelist: unknown keys are ignored, enums are checked against the API types
 * and every number is clamped. Nothing else is ever forwarded to the backend.
 */

/** Page size used by the products list. */
export const PRODUCTS_PAGE_SIZE = 24;

const MAX_QUERY_LENGTH = 100;
const MAX_PRICE = 1_000_000_000;
const MAX_PAGE = 10_000;
const DEFAULT_PAGE = 1;
/** Brand/genre tokens: at most 10 values of at most 60 characters each. */
const MAX_FILTER_VALUES = 10;
const MAX_FILTER_VALUE_LENGTH = 60;

const SORT_VALUES = new Set<string>([
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
  "discount",
] satisfies ProductSort[]);

/** The subset of `ProductQuery` that {@link buildProductsHref} can serialize. */
export type ProductsHrefQuery = Pick<
  ProductQuery,
  | "platform"
  | "brand"
  | "genre"
  | "region"
  | "q"
  | "minPrice"
  | "maxPrice"
  | "inStock"
  | "onSale"
  | "featured"
  | "sort"
  | "page"
>;

/** Filter keys (everything but `page`): overriding one resets pagination. */
const HREF_FILTER_KEYS = [
  "platform",
  "brand",
  "genre",
  "region",
  "q",
  "minPrice",
  "maxPrice",
  "inStock",
  "onSale",
  "featured",
  "sort",
] as const satisfies ReadonlyArray<keyof ProductsHrefQuery>;

export interface ParsedProductsSearchParams {
  /** Whitelisted, clamped params ready to be handed to `getProducts`. */
  query: ProductQuery;
  /** Validated page number, also present on `query`. */
  page: number;
}

/** A repeated key arrives as an array; only the first value is ever considered. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Splits a brand/genre filter (a csv string or a list of values) into its
 * individual tokens, dropping empty ones.
 *
 * The parsed query keeps a filter as one comma separated string because that is
 * what GET /products expects; the form and every `/products?...` href use
 * repeated params instead, so both sides go through this helper.
 */
export function splitFilterValues(
  value: string | readonly string[] | undefined,
): string[] {
  if (value === undefined) {
    return [];
  }
  const values = typeof value === "string" ? [value] : value;
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Reads a brand/genre param that may arrive as a repeated key (array) or as a
 * single value, and returns it as one comma separated string for the backend
 * (which accepts `brand=سونی,EA`).
 *
 * Every token is trimmed, tokens that are empty, longer than 60 characters or
 * contain a comma are dropped (a comma could smuggle extra backend values) and
 * at most 10 unique tokens are kept. `undefined` means "no filter".
 */
function parseFilterList(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const rawValues = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of rawValues) {
    if (raw.includes(",")) {
      continue;
    }
    const token = raw.trim();
    if (token.length === 0 || token.length > MAX_FILTER_VALUE_LENGTH) {
      continue;
    }
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= MAX_FILTER_VALUES) {
      break;
    }
  }

  return tokens.length > 0 ? tokens.join(",") : undefined;
}

/** Digits-only string to a non-negative integer, or undefined when out of range. */
function parsePrice(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed > MAX_PRICE) {
    return undefined;
  }
  return parsed;
}

/** Page number clamped to 1..MAX_PAGE, defaulting to 1 for anything invalid. */
function parsePage(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PAGE;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return DEFAULT_PAGE;
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return DEFAULT_PAGE;
  }
  return Math.min(parsed, MAX_PAGE);
}

export function parseProductsSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ParsedProductsSearchParams {
  const query: ProductQuery = {};

  const platform = firstValue(raw.platform);
  if (isPlatform(platform)) {
    query.platform = platform;
  }

  const q = firstValue(raw.q)?.trim();
  if (q !== undefined && q.length > 0) {
    query.q = q.slice(0, MAX_QUERY_LENGTH);
  }

  const brand = parseFilterList(raw.brand);
  if (brand !== undefined) {
    query.brand = [brand];
  }

  const genre = parseFilterList(raw.genre);
  if (genre !== undefined) {
    query.genre = [genre];
  }

  const region = firstValue(raw.region)?.trim();
  if (region !== undefined && region.length > 0) {
    query.region = region.slice(0, MAX_FILTER_VALUE_LENGTH);
  }

  const minPrice = parsePrice(firstValue(raw.minPrice));
  const maxPrice = parsePrice(firstValue(raw.maxPrice));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    query.minPrice = maxPrice;
    query.maxPrice = minPrice;
  } else {
    if (minPrice !== undefined) {
      query.minPrice = minPrice;
    }
    if (maxPrice !== undefined) {
      query.maxPrice = maxPrice;
    }
  }

  if (firstValue(raw.inStock) === "true") {
    query.inStock = "true";
  }
  if (firstValue(raw.onSale) === "true") {
    query.onSale = "true";
  }
  if (firstValue(raw.featured) === "true") {
    query.featured = "true";
  }

  const sort = firstValue(raw.sort);
  if (sort !== undefined && SORT_VALUES.has(sort)) {
    query.sort = sort as ProductSort;
  }

  const page = parsePage(firstValue(raw.page));
  query.page = page;
  query.limit = PRODUCTS_PAGE_SIZE;

  return { query, page };
}

/**
 * Builds a `/products?...` href from the current params plus overrides.
 *
 * Empty values are skipped, and overriding any filter drops `page` so a filtered
 * list always starts from its first page. The result is produced by
 * `URLSearchParams`, so every value is URL-encoded.
 */
export function buildProductsHref(
  current: ProductsHrefQuery,
  overrides: ProductsHrefQuery = {},
): string {
  const merged: ProductsHrefQuery = { ...current, ...overrides };
  if (HREF_FILTER_KEYS.some((key) => key in overrides)) {
    delete merged.page;
  }

  const params = new URLSearchParams();
  if (merged.platform !== undefined) {
    params.set("platform", merged.platform);
  }
  // Brand/genre are repeated params (what the filter form submits), while the
  // parsed query keeps them comma separated for the backend.
  for (const value of splitFilterValues(merged.brand)) {
    params.append("brand", value);
  }
  for (const value of splitFilterValues(merged.genre)) {
    params.append("genre", value);
  }
  if (merged.region !== undefined && merged.region.length > 0) {
    params.set("region", merged.region);
  }
  if (merged.q !== undefined && merged.q.length > 0) {
    params.set("q", merged.q);
  }
  if (merged.minPrice !== undefined) {
    params.set("minPrice", String(merged.minPrice));
  }
  if (merged.maxPrice !== undefined) {
    params.set("maxPrice", String(merged.maxPrice));
  }
  if (merged.inStock === "true") {
    params.set("inStock", "true");
  }
  if (merged.onSale === "true") {
    params.set("onSale", "true");
  }
  if (merged.featured === "true") {
    params.set("featured", "true");
  }
  if (merged.sort !== undefined) {
    params.set("sort", merged.sort);
  }
  if (merged.page !== undefined && merged.page > 1) {
    params.set("page", String(merged.page));
  }

  const search = params.toString();
  return search.length > 0 ? `/products?${search}` : "/products";
}
