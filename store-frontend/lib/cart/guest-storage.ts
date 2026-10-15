import {
  GUEST_CART_STORAGE_KEY,
  MAX_CART_ITEMS,
  MAX_ITEM_QUANTITY,
  MAX_PRODUCT_ID,
  MAX_SLUG_LENGTH,
  MIN_PRODUCT_ID,
  SLUG_PATTERN,
} from "./constants";
import type { GuestCartItem } from "./types";

/**
 * Guest cart storage: localStorage["guest_cart"] = [{productId, slug, quantity}].
 *
 * Nothing else is ever stored — no prices, no totals, no user data. Storage is
 * untrusted (the visitor can edit it), so every read re-validates the whole
 * list and silently drops anything invalid: non-arrays, non-objects, wrong
 * types, non-integer/out-of-range ids & quantities, bad slugs, duplicates
 * (first wins) and items beyond the 30-distinct cap.
 */

function isValidProductId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_PRODUCT_ID &&
    value <= MAX_PRODUCT_ID
  );
}

function isValidSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(value)
  );
}

function isValidQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_ITEM_QUANTITY
  );
}

/** Reads the guest cart and returns only its valid entries. */
export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? "null");
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const items: GuestCartItem[] = [];
  const seenProductIds = new Set<number>();
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    if (
      !isValidProductId(candidate.productId) ||
      !isValidSlug(candidate.slug) ||
      !isValidQuantity(candidate.quantity)
    ) {
      continue;
    }
    if (seenProductIds.has(candidate.productId)) {
      continue;
    }
    seenProductIds.add(candidate.productId);
    items.push({
      productId: candidate.productId,
      slug: candidate.slug,
      quantity: candidate.quantity,
    });
    if (items.length === MAX_CART_ITEMS) {
      break;
    }
  }
  return items;
}

/** Persists the guest cart; callers pass an already-validated list. */
export function writeGuestCart(items: GuestCartItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked/full: the in-memory copy stays authoritative.
  }
}

/** Removes the guest cart entirely. */
export function clearGuestCart(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // Ignored: nothing we can do about blocked storage.
  }
}
