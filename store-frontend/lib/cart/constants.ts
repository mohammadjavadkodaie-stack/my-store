/**
 * Cart/order facts mirrored from the backend cart & orders controllers — the
 * backend code is the source of truth; these constants only keep this frontend
 * in sync with the rules that apply on both sides.
 */

/** localStorage key of the guest cart; it holds ONLY {productId, slug, quantity}. */
export const GUEST_CART_STORAGE_KEY = "guest_cart";

/** Hard cap on distinct products in a cart (guest storage and server cart). */
export const MAX_CART_ITEMS = 30;

/** Per-item quantity cap enforced by POST/PATCH /cart/items. */
export const MAX_ITEM_QUANTITY = 10;

/** Smallest/largest productId the backend can issue (32-bit signed integer). */
export const MIN_PRODUCT_ID = 1;
export const MAX_PRODUCT_ID = 2147483647;

/** Longest product slug the backend can issue. */
export const MAX_SLUG_LENGTH = 120;

/** Backend slug pattern: lowercase kebab-case. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
