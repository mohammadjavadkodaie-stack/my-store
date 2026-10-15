import { apiFetch } from "./client";
import type { ApiFetcher } from "./request";
import type { Paginated, Product, ProductDetail, ProductQuery } from "./types";

/**
 * GET /products — public, paginated product list.
 *
 * Browser / Client Component:
 *   await getProducts({ page: 1, sort: "price_asc" })
 *
 * Server Component (relative URLs do not work there, so pass serverFetch):
 *   await getProducts({ page: 1 }, serverFetch)
 */
export function getProducts(
  query?: ProductQuery,
  fetcher: ApiFetcher = apiFetch,
): Promise<Paginated<Product>> {
  return fetcher<Paginated<Product>>("/products", { query });
}

/**
 * GET /products/:slug — public product detail.
 * Throws ApiError with status 404 (and the backend's Persian message) for an
 * unknown slug.
 */
export function getProduct(
  slug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<ProductDetail> {
  return fetcher<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}
