import { apiFetch } from "@/lib/api/client";
import type { ApiFetcher } from "@/lib/api/request";
import type { ProductDetail } from "@/lib/api/types";
import type { Cart, Order, OrdersPage } from "./types";

/**
 * Cart & order calls for the browser ("use client" components).
 *
 * Every call goes through apiFetch — the same "/api" rewrite with
 * credentials: "include" — so the httpOnly cookie authenticates cart and
 * order endpoints; Server Components use serverFetch from "@/lib/api/server".
 * Authenticated reads always pass cache: "no-store" (prices/stock change).
 */

/** GET /cart — the signed-in visitor's cart. 401 when not signed in. */
export function getCart(fetcher: ApiFetcher = apiFetch): Promise<Cart> {
  return fetcher<Cart>("/cart", { cache: "no-store" });
}

/** POST /cart/items — ADDS `quantity` to an existing line. */
export function addCartItem(
  input: { productId: number; quantity: number },
  fetcher: ApiFetcher = apiFetch,
): Promise<Cart> {
  return fetcher<Cart>("/cart/items", {
    method: "POST",
    body: input,
    cache: "no-store",
  });
}

/** PATCH /cart/items/:productId — sets the line quantity (1..10). */
export function updateCartItem(
  productId: number,
  quantity: number,
  fetcher: ApiFetcher = apiFetch,
): Promise<Cart> {
  return fetcher<Cart>(`/cart/items/${productId}`, {
    method: "PATCH",
    body: { quantity },
    cache: "no-store",
  });
}

/** DELETE /cart/items/:productId — removes one line. */
export function removeCartItem(
  productId: number,
  fetcher: ApiFetcher = apiFetch,
): Promise<Cart> {
  return fetcher<Cart>(`/cart/items/${productId}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

/** DELETE /cart — removes every line. */
export function clearServerCart(fetcher: ApiFetcher = apiFetch): Promise<Cart> {
  return fetcher<Cart>("/cart", { method: "DELETE", cache: "no-store" });
}

/** POST /orders — places an order from the current cart (no body). */
export function createOrder(fetcher: ApiFetcher = apiFetch): Promise<Order> {
  return fetcher<Order>("/orders", { method: "POST", cache: "no-store" });
}

/** GET /orders — the visitor's orders, newest first. */
export function getOrders(
  query: { page?: number; limit?: number } = {},
  fetcher: ApiFetcher = apiFetch,
): Promise<OrdersPage> {
  return fetcher<OrdersPage>("/orders", { query, cache: "no-store" });
}

/** GET /orders/:id — one order; 404 when it is not the visitor's. */
export function getOrder(
  id: number,
  fetcher: ApiFetcher = apiFetch,
): Promise<Order> {
  return fetcher<Order>(`/orders/${id}`, { cache: "no-store" });
}

/**
 * GET /products/:slug for the guest cart view — public, but still fetched
 * with cache: "no-store" so a guest never sees stale prices. Prices shown to
 * a guest come from THIS response only, never from localStorage.
 */
export function getCartProductBySlug(
  slug: string,
  fetcher: ApiFetcher = apiFetch,
): Promise<ProductDetail> {
  return fetcher<ProductDetail>(`/products/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
}
