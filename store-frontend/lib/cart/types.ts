/**
 * Shapes of the cart & order endpoints (JSON over the same /api proxy as the
 * public catalog, authenticated by the httpOnly cookie).
 *
 * The guest cart (localStorage "guest_cart") never stores any of these: it only
 * keeps {productId, slug, quantity} triples — prices and totals always come
 * from a server response (cart API or GET /products/:slug).
 */

/** Trimmed product embedded in every cart line. */
export interface CartProduct {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  /** Integer price in Toman. */
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  /** Raw stock count; the cart flags below are derived from it. */
  stock: number;
}

/** One line of GET /cart (and of every cart mutation response). */
export interface CartItem {
  productId: number;
  quantity: number;
  /** Server-computed line total — the only line total ever rendered. */
  lineTotal: number;
  outOfStock: boolean;
  quantityExceedsStock: boolean;
  inactive: boolean;
  product: CartProduct;
}

/** GET /cart and every POST/PATCH/DELETE /cart... response. */
export interface Cart {
  items: CartItem[];
  total: number;
}

/** The ONLY shape ever written to localStorage "guest_cart". */
export interface GuestCartItem {
  productId: number;
  slug: string;
  quantity: number;
}

/** One line of POST /orders' items array. */
export interface OrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

/** POST /orders and GET /orders/:id response. */
export interface Order {
  id: number;
  status: string;
  paymentStatus: string;
  total: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
  items: OrderItem[];
}

/** One entry of GET /orders' items array. */
export interface OrderSummary {
  id: number;
  status: string;
  paymentStatus: string;
  total: number;
  /** ISO-8601 timestamp. */
  createdAt: string;
  itemCount: number;
}

/** GET /orders?page&limit envelope. */
export interface OrdersPage {
  items: OrderSummary[];
  total: number;
  page: number;
  limit: number;
}
