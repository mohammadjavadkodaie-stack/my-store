import { MAX_ITEM_QUANTITY } from "./constants";
import { addCartItem, getCart } from "./client";
import { clearGuestCart, readGuestCart } from "./guest-storage";

/**
 * Merges the guest cart into the server cart after a successful login or
 * registration — called BEFORE the redirect in the auth forms.
 *
 * Rules:
 * - GET /cart first; a failure here leaves the guest cart untouched (it can be
 *   merged on the next login) and must never block the redirect.
 * - Per guest line: nothing on the server yet -> POST the guest quantity
 *   (capped at 10); server already has some -> POST only the difference
 *   (capped at 10 total); server already has >= guest quantity -> skip.
 * - Per-line 400/404 responses are ignored and the loop continues.
 * - After the loop the guest cart is cleared, whatever the per-line outcome.
 */
export async function mergeGuestCart(): Promise<void> {
  const guestItems = readGuestCart();
  if (guestItems.length === 0) {
    return;
  }
  let serverCart;
  try {
    serverCart = await getCart();
  } catch {
    return; // Best-effort: never block the login/register redirect.
  }

  for (const guestItem of guestItems) {
    const serverLine = serverCart.items.find(
      (item) => item.productId === guestItem.productId,
    );
    if (serverLine === undefined) {
      try {
        await addCartItem({
          productId: guestItem.productId,
          quantity: Math.min(guestItem.quantity, MAX_ITEM_QUANTITY),
        });
      } catch {
        // Ignored: 400/404/etc. per line must not stop the remaining lines.
      }
      continue;
    }
    const quantity = Math.min(guestItem.quantity, MAX_ITEM_QUANTITY);
    if (quantity > serverLine.quantity) {
      try {
        await addCartItem({
          productId: guestItem.productId,
          quantity: quantity - serverLine.quantity,
        });
      } catch {
        // Ignored, same as above.
      }
    }
  }

  clearGuestCart();
}
