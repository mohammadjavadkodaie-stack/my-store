import { apiFetch } from "./client";
import type { ApiFetcher } from "./request";

/**
 * GET /products/filters — the option lists the filter sidebar is built from.
 *
 * The response is public but still untrusted: nothing here is typed as the
 * backend's shape, every field is re-validated at runtime and an unexpected
 * payload degrades into an empty option list instead of throwing.
 */

/** Option groups returned by GET /products/filters. */
export interface ProductFilterOptions {
  brands: string[];
  genres: string[];
  regions: string[];
  price: { min: number; max: number };
}

/** Defensive limits, so a broken payload can never blow up the UI. */
const MAX_ITEMS = 100;
const MAX_ITEM_LENGTH = 60;

/**
 * Filter options change only when the catalogue changes, so the call opts into
 * Next's data cache instead of the `no-store` default `serverFetch` applies.
 */
const REVALIDATE_SECONDS = 300;

/** Keeps trimmed, non-empty strings only (unique, capped in count and length). */
function toSafeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_ITEM_LENGTH) {
      continue;
    }
    if (seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= MAX_ITEMS) {
      break;
    }
  }

  return result;
}

/** Finite numbers only; anything else (NaN, Infinity, strings) becomes 0. */
function toSafeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Builds a guaranteed-safe {@link ProductFilterOptions} from an unknown payload. */
function toSafeFilterOptions(payload: unknown): ProductFilterOptions {
  const source =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const price =
    typeof source.price === "object" && source.price !== null
      ? (source.price as Record<string, unknown>)
      : {};

  return {
    brands: toSafeStringList(source.brands),
    genres: toSafeStringList(source.genres),
    regions: toSafeStringList(source.regions),
    price: {
      min: toSafeNumber(price.min),
      max: toSafeNumber(price.max),
    },
  };
}

/**
 * GET /products/filters — brands, genres, regions and the price range used by
 * the filter panel. Never rejects on a malformed body: a missing field or a
 * wrong type yields an empty group / a zero price.
 *
 * Browser / Client Component:
 *   await getProductFilters()
 *
 * Server Component (relative URLs do not work there, so pass serverFetch):
 *   await getProductFilters(serverFetch)
 */
export async function getProductFilters(
  fetcher: ApiFetcher = apiFetch,
): Promise<ProductFilterOptions> {
  const payload = await fetcher<unknown>("/products/filters", {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  return toSafeFilterOptions(payload);
}
