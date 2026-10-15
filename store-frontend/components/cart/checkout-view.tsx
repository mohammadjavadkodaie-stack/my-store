"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isApiError } from "@/lib/api/error";
import { createOrder } from "@/lib/cart/client";
import { cartErrorMessages } from "@/lib/cart/errors";
import { useCart } from "@/lib/cart/cart-provider";
import { safeNextPath } from "@/lib/auth/redirect";
import { formatPrice } from "@/lib/format";

const faNumber = new Intl.NumberFormat("fa-IR");

const ORDER_FAILED_MESSAGE =
  "ثبت سفارش ممکن نشد. لطفاً سبد خرید خود را بررسی و دوباره تلاش کنید.";

/**
 * 409 — a line's stock changed between page load and submit. Unlike the other
 * failures this one is actionable, so it gets its own text plus a link back to
 * /cart (where the refreshed cart shows which line went invalid).
 */
const STOCK_CONFLICT_MESSAGE =
  "موجودی برخی کالاهای سبد خرید شما تغییر کرده است. لطفاً سبد خرید را بررسی و دوباره تلاش کنید.";

/**
 * /checkout — a signed-in visitor's order placement. The server cart is the
 * single source of truth: totals and lines are only rendered from it, and
 * POST /orders (no body) is submitted exactly once per click.
 *
 * 401 -> /login?next=/checkout; 409 (stock changed) shows its own Persian
 * message with a link to /cart; any other failure shows the generic Persian
 * message. Every failure refreshes the cart so a stock change becomes visible.
 */
export function CheckoutView() {
  const router = useRouter();
  const { cart, loaded, pending, refresh } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stockConflict, setStockConflict] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (submitting) {
      return; // Double-submit guard.
    }
    setSubmitting(true);
    setError(null);
    setStockConflict(false);
    try {
      const order = await createOrder();
      router.replace(`/orders/${order.id}`);
    } catch (cause) {
      if (isApiError(cause) && cause.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(safeNextPath("/checkout"))}`,
        );
        return;
      }
      if (isApiError(cause) && cause.status === 409) {
        setStockConflict(true);
        setError(STOCK_CONFLICT_MESSAGE);
      } else {
        setError(
          isApiError(cause) ? cartErrorMessages(cause)[0] : ORDER_FAILED_MESSAGE,
        );
      }
      await refresh(); // Pull the server cart: a line may have gone invalid.
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-extrabold text-foreground">تکمیل خرید</h1>
        <p className="mt-6 text-sm text-foreground/60">در حال دریافت سبد خرید...</p>
      </div>
    );
  }

  if (cart === null || cart.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-extrabold text-foreground">تکمیل خرید</h1>
        <p className="mt-6 text-sm text-foreground/70">سبد خرید شما خالی است.</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  const hasWarning = cart.items.some(
    (item) => item.outOfStock || item.quantityExceedsStock || item.inactive,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold text-foreground">تکمیل خرید</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {cart.items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4"
          >
            <Link
              href={`/products/${encodeURIComponent(item.product.slug)}`}
              className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary"
            >
              {item.product.name}
            </Link>
            <p className="shrink-0 text-xs text-foreground/60">
              {formatPrice(item.product.price)} × {faNumber.format(item.quantity)} ={" "}
              <span className="font-bold text-foreground">
                {formatPrice(item.lineTotal)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-end text-sm font-extrabold text-foreground">
        جمع کل: {formatPrice(cart.total)}
      </p>
      {error !== null && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          <p>{error}</p>
          {stockConflict && (
            <Link
              href="/cart"
              className="mt-2 inline-block font-bold underline underline-offset-4"
            >
              بازگشت به سبد خرید
            </Link>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={submitting || pending || hasWarning}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 sm:w-fit sm:px-10"
        >
          {submitting ? "در حال ثبت سفارش..." : "ثبت سفارش"}
        </button>
        {hasWarning && (
          <p className="text-xs text-foreground/70">
            برخی کالاهای سبد شما مشکل دارند؛ ابتدا سبد خرید را اصلاح کنید.
          </p>
        )}
      </div>
    </div>
  );
}
