import { apiFetch } from "./client";
import type { ApiFetcher } from "./request";
import type { Category, CategoryQuery, Paginated } from "./types";

/**
 * GET /categories — public, paginated category list (optional platform filter).
 *
 * Browser / Client Component:
 *   await getCategories({ platform: "PS5" })
 *
 * Server Component (relative URLs do not work there, so pass serverFetch):
 *   await getCategories(undefined, serverFetch)
 */
export function getCategories(
  query?: CategoryQuery,
  fetcher: ApiFetcher = apiFetch,
): Promise<Paginated<Category>> {
  return fetcher<Paginated<Category>>("/categories", { query });
}

/**
 * GET /categories/:slug — public category detail (same shape as a list item).
 * Throws ApiError with status 404 for an unknown slug.
 */
export function getCategory(
  slug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<Category> {
  return fetcher<Category>(`/categories/${encodeURIComponent(slug)}`);
}
