/**
 * Client-safe entry point of the API layer: `import { getProducts, ApiError } from "@/lib/api"`.
 *
 * This barrel deliberately does NOT re-export "./server": that module imports
 * `next/headers`, which cannot be bundled into a Client Component. Server-side
 * code imports the server helper directly:
 *
 *   import { serverFetch } from "@/lib/api/server";
 *   const { items, total } = await getProducts({ page: 1 }, serverFetch);
 *
 * Quick rules
 * - Client Component / browser: `apiFetch` (relative "/api/..." through the
 *   next.config.ts rewrite, httpOnly cookie sent via credentials: "include").
 * - Server Component / Route Handler / Server Function: `serverFetch` (absolute
 *   backend origin + cookies forwarded from `next/headers`).
 * - Endpoint functions take an optional `fetcher` as their last argument and
 *   default to `apiFetch`, so the same call site works in both environments.
 */
export { API_PREFIX, apiFetch } from "./client";
export { buildApiPath, buildQueryString } from "./request";
export type {
  ApiCallOptions,
  ApiFetcher,
  ApiRequestOptions,
  QueryParams,
  QueryValue,
} from "./request";
export { ApiError, isApiError, parseApiErrorBody } from "./error";
export type { ApiErrorBody, ApiErrorInit } from "./error";
export { getProduct, getProducts } from "./products";
export { getCategories, getCategory } from "./categories";
export type {
  AdminSlide,
  Category,
  CategoryQuery,
  HeroSlide,
  Paginated,
  Platform,
  Product,
  ProductCategoryRef,
  ProductDetail,
  ProductQuery,
  ProductSort,
} from "./types";
