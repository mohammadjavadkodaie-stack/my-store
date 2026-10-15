import type { ApiFetcher } from "./request";
import { serverFetch } from "./server";
import type { Paginated } from "./types";

/**
 * Admin view of one product row (GET /admin/products): only the fields the
 * management table renders. `category` stays a small object because the table
 * shows the category name next to each product.
 */
export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  category: { name: string };
}

/**
 * Whitelisted filters of GET /admin/products. Undefined values are skipped by
 * serverFetch, so an absent key simply means "no filter".
 */
export interface AdminProductQuery {
  q?: string;
  isActive?: "true" | "false";
  page?: number;
  limit?: number;
}

/** One validated page of GET /admin/products; `total` covers the whole result. */
export interface AdminProductPage {
  items: AdminProduct[];
  total: number;
}

/**
 * One product with every field the create/update DTOs accept, used by the edit
 * form. GET /admin/products returns these fields, but the list guard below
 * keeps only the table columns, so the id lookup reads the raw pages instead.
 */
export interface AdminProductDetail {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  compareAtPrice: number | null;
  brand: string | null;
  sku: string | null;
  region: string | null;
  portsCount: number | null;
  weight: number | null;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  genres: string[];
  specs: Record<string, string>;
}

/** Backend page-size cap for every list endpoint (query-products.dto.ts). */
const PAGE_SIZE = 50;

/** Defensive cap on the id lookup, so an untrusted `total` cannot spin forever. */
const MAX_LOOKUP_PAGES = 20;

/**
 * Loads one page of GET /admin/products (admin-only) and keeps only the rows
 * that pass the runtime guard, dropping malformed ones instead of failing the
 * whole table.
 *
 * Returns null for any failure — 401/403/5xx, unreachable backend, or a payload
 * that is not a list envelope — letting the caller show one generic Persian
 * message. Backend error text is neither rendered nor logged.
 */
export async function getAdminProducts(
  fetcher: ApiFetcher,
  { q, isActive, page, limit }: AdminProductQuery = {},
): Promise<AdminProductPage | null> {
  try {
    const query: Record<string, string | number> = {};
    if (q) {
      query.q = q;
    }
    if (isActive) {
      query.isActive = isActive;
    }
    if (typeof page === "number") {
      query.page = page;
    }
    if (typeof limit === "number") {
      query.limit = limit;
    }

    const envelope = await fetcher<Paginated<unknown>>("/admin/products", {
      query,
    });
    const total = readTotal(envelope);
    const items = readItems(envelope);
    if (total === null || items === null) {
      return null;
    }
    return { items: items.filter(isProductItem), total };
  } catch {
    return null;
  }
}

/**
 * Finds one product for the edit form by paging through GET /admin/products
 * with the backend's maximum page size (the endpoint has no id lookup). It
 * reads the raw pages itself — the list guard strips the editable fields — and
 * stops at the first row that passes isProductDetail, at the end of the list,
 * or after MAX_LOOKUP_PAGES pages. Returns null when the id is invalid,
 * absent, malformed or the backend fails.
 */
export async function getAdminProductById(
  id: number,
): Promise<AdminProductDetail | null> {
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  try {
    for (let page = 1; page <= MAX_LOOKUP_PAGES; page += 1) {
      const envelope = await serverFetch<Paginated<unknown>>("/admin/products", {
        query: { page, limit: PAGE_SIZE },
      });
      const items = readItems(envelope);
      if (items === null) {
        return null;
      }
      for (const item of items) {
        if (isProductDetail(item) && item.id === id) {
          return item;
        }
      }
      const total = readTotal(envelope);
      if (total === null || page * PAGE_SIZE >= total) {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads a trustworthy `total` out of a list envelope (may be undefined/204). */
function readTotal(envelope: Paginated<unknown> | undefined): number | null {
  const total = envelope?.total;
  return typeof total === "number" && Number.isInteger(total) && total >= 0
    ? total
    : null;
}

function readItems(envelope: Paginated<unknown> | undefined): unknown[] | null {
  return Array.isArray(envelope?.items) ? (envelope.items as unknown[]) : null;
}

/**
 * Runtime guard for one GET /admin/products row: the payload is untrusted, so
 * every rendered field is checked (same defensive stance as admin-categories).
 */
function isProductItem(value: unknown): value is AdminProduct {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "number" &&
    Number.isInteger(raw.id) &&
    raw.id > 0 &&
    typeof raw.name === "string" &&
    raw.name.length > 0 &&
    typeof raw.slug === "string" &&
    raw.slug.length > 0 &&
    typeof raw.price === "number" &&
    Number.isFinite(raw.price) &&
    raw.price >= 0 &&
    typeof raw.stock === "number" &&
    Number.isInteger(raw.stock) &&
    raw.stock >= 0 &&
    typeof raw.isActive === "boolean" &&
    isCategoryRef(raw.category)
  );
}

/** The table only needs `category.name`, so nothing else is required here. */
function isCategoryRef(value: unknown): value is { name: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return typeof raw.name === "string" && raw.name.length > 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isPlainObject(value) &&
    Object.values(value).every((item) => typeof item === "string")
  );
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

/**
 * Runtime guard for one raw GET /admin/products row: the payload is untrusted,
 * so every field the edit form reads is type-checked and malformed rows are
 * dropped instead of reaching the form (same defensive stance as
 * isProductItem, but for the full editable shape).
 */
export function isProductDetail(value: unknown): value is AdminProductDetail {
  if (!isPlainObject(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "number" &&
    Number.isInteger(raw.id) &&
    raw.id > 0 &&
    typeof raw.name === "string" &&
    raw.name.length > 0 &&
    typeof raw.slug === "string" &&
    raw.slug.length > 0 &&
    typeof raw.description === "string" &&
    raw.description.length > 0 &&
    typeof raw.price === "number" &&
    Number.isInteger(raw.price) &&
    raw.price >= 0 &&
    typeof raw.stock === "number" &&
    Number.isInteger(raw.stock) &&
    raw.stock >= 0 &&
    typeof raw.categoryId === "number" &&
    Number.isInteger(raw.categoryId) &&
    raw.categoryId >= 1 &&
    isNullableNumber(raw.compareAtPrice) &&
    isNullableString(raw.brand) &&
    isNullableString(raw.sku) &&
    isNullableString(raw.region) &&
    isNullableNumber(raw.portsCount) &&
    isNullableNumber(raw.weight) &&
    typeof raw.isActive === "boolean" &&
    typeof raw.isFeatured === "boolean" &&
    isStringArray(raw.images) &&
    isStringArray(raw.genres) &&
    isStringRecord(raw.specs)
  );
}
