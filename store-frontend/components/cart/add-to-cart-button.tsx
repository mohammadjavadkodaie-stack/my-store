"use client";

import { useState } from "react";
import { MAX_ITEM_QUANTITY } from "@/lib/cart/constants";
import {
  useCart,
  type AddToCartResult,
} from "@/lib/cart/cart-provider";

/**
 * «افزودن به سبد خرید» on the product detail page.
 *
 * One click adds one piece (the server ADDS it to the existing line). The
 * button is disabled while the request is in flight, when the product is out
 * of stock, or once ten pieces of this product are already in the cart.
 * Only generic Persian texts are ever shown — never a backend message.
 */
export function AddToCartButton({
  productId,
  slug,
  inStock,
}: {
  productId: number;
  slug: string;
  inStock: boolean;
}) {
  const { addToCart, cart, guestItems, authenticated, pending } = useCart();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const existingQuantity = authenticated
    ? (cart?.items.find((item) => item.productId === productId)?.quantity ?? 0)
    : (guestItems.find((item) => item.productId === productId)?.quantity ?? 0);
  const atLimit = existingQuantity >= MAX_ITEM_QUANTITY;
  const disabled = !inStock || pending || submitting || atLimit;

  async function handleClick(): Promise<void> {
    if (disabled) {
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const result: AddToCartResult = await addToCart(productId, slug, 1);
      if (result === "ok") {
        setFeedback("به سبد خرید اضافه شد.");
      } else if (result === "limit") {
        setFeedback(`حداکثر ${MAX_ITEM_QUANTITY} عدد از هر کالا.`);
      } else {
        setFeedback("افزودن به سبد ممکن نشد. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        className={
          disabled
            ? "flex h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-primary/40 px-6 text-sm font-extrabold text-primary-foreground"
            : "flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        }
      >
        {inStock ? "افزودن به سبد خرید" : "ناموجود"}
      </button>
      {feedback !== null && (
        <p role="status" className="text-xs text-foreground/70">
          {feedback}
        </p>
      )}
      {!inStock && (
        <p className="text-xs text-foreground/60">
          این محصول فعلاً موجود نیست.
        </p>
      )}
    </div>
  );
}
