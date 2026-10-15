"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isApiError } from "@/lib/api/error";
import type { ProductDetail } from "@/lib/api/types";
import { useCart } from "@/lib/cart/cart-provider";
import { getCartProductBySlug } from "@/lib/cart/client";
import { safeNextPath } from "@/lib/auth/redirect";
import { formatPrice } from "@/lib/format";
import { CartItemRow } from "@/components/cart/cart-item-row";
import type { CartItem, GuestCartItem } from "@/lib/cart/types";

const faNumber = new Intl.NumberFormat("fa-IR");

/** One guest cart line: the storage entry plus the product fetched by slug. */
interface GuestLine {
  item: GuestCartItem;
  product: ProductDetail;
}

/** Normalized line used to compute the payment summary for both flavors. */
interface SummaryLine {
  unitPrice: number;
  compareAtPrice: number | null;
  discountPercent: number;
  quantity: number;
}

/** One-line loading / error notice, styled as a cart card. */
function CartNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 text-sm text-foreground/60">
      {children}
    </div>
  );
}

/** Shared empty-cart state for both flavors. */
function EmptyCart() {
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <p className="text-sm text-foreground/70">سبد خرید شما خالی است.</p>
      <Link
        href="/products"
        className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        مشاهده محصولات
      </Link>
    </div>
  );
}

/** /cart — guest (storage + public product lookups) or signed-in (server cart). */
export function CartView() {
  const router = useRouter();
  const { authenticated } = useCart();

  function goToCheckout(): void {
    // Fixed internal paths (never user input) — still routed through
    // safeNextPath so the login redirect always stays on-site.
    if (authenticated) {
      router.push(safeNextPath("/checkout"));
    } else {
      router.push(`/login?next=${encodeURIComponent(safeNextPath("/checkout"))}`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      {authenticated ? (
        <ServerCartSection onGoToCheckout={goToCheckout} />
      ) : (
        <GuestCartSection onGoToCheckout={goToCheckout} />
      )}
    </div>
  );
}

/**
 * RTL two-column cart body: the items card sits on the right (≈2/3) and the
 * payment card on the left (≈1/3, sticky below the 64px header). On smaller
 * screens the two cards stack, items first.
 */
function CartLayout({
  itemCount,
  children,
  summary,
}: {
  itemCount: number;
  children: ReactNode;
  summary: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section className="rounded-2xl border border-border bg-background p-6 lg:flex-[2]">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold text-foreground">سبد خرید</h1>
          <span className="text-sm text-foreground/60">
            {faNumber.format(itemCount)} کالا
          </span>
        </div>
        {children}
      </section>
      <aside className="lg:flex-[1] lg:sticky lg:top-24">{summary}</aside>
    </div>
  );
}

/**
 * Payment details card: pre-discount total, the savings band (only when there
 * is a discount) and the payable total. Every figure is derived from the
 * existing cart data with the shared helpers — no prices are recalculated
 * here beyond summing the lines the caller already rendered.
 */
function PaymentSummary({
  itemCount,
  lines,
  payableTotal,
  disabled,
  hasWarning,
  note,
  onGoToCheckout,
}: {
  itemCount: number;
  lines: SummaryLine[];
  payableTotal: number;
  disabled: boolean;
  hasWarning: boolean;
  note: string | null;
  onGoToCheckout: () => void;
}) {
  // Original (pre-discount) unit price is compareAtPrice — the same field the
  // product card strikes through — falling back to the payable price.
  const originalTotal = lines.reduce(
    (sum, line) => sum + (line.compareAtPrice ?? line.unitPrice) * line.quantity,
    0,
  );
  const saved = originalTotal - payableTotal;
  const hasDiscount = saved > 0;

  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <h2 className="text-base font-bold text-foreground">جزئیات پرداخت</h2>
      <dl className="mt-4 flex flex-col gap-3 text-sm">
        <div className="flex items-center justify-between gap-3 text-foreground/70">
          <dt>مجموع قیمت کالاها ({faNumber.format(itemCount)} کالا)</dt>
          <dd>{formatPrice(originalTotal)}</dd>
        </div>

        {hasDiscount && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-green-50 px-3 py-2 text-green-700">
            <dt>سود شما از خرید</dt>
            <dd className="font-bold">{formatPrice(saved)}</dd>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <dt className="font-bold text-foreground">مجموع سبد خرید</dt>
          <dd className="text-end">
            {hasDiscount && (
              <s className="block text-xs text-foreground/50">
                {formatPrice(originalTotal)}
              </s>
            )}
            <span className="text-base font-extrabold text-foreground">
              {formatPrice(payableTotal)}
            </span>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onGoToCheckout}
        disabled={disabled || hasWarning}
        className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
      >
        ثبت سفارش
      </button>
      {note !== null && (
        <p className="mt-3 text-xs text-foreground/70">{note}</p>
      )}
    </div>
  );
}

/** Single server cart line (GET /cart item) mapped onto the shared row. */
function ServerCartLine({
  item,
  pending,
  onSetQuantity,
  onRemove,
}: {
  item: CartItem;
  pending: boolean;
  onSetQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}) {
  const warning = item.outOfStock
    ? "ناموجود شده است"
    : item.quantityExceedsStock
      ? "تعداد درخواستی بیشتر از موجودی است"
      : item.inactive
        ? "فعلاً قابل فروش نیست"
        : null;

  return (
    <CartItemRow
      slug={item.product.slug}
      name={item.product.name}
      imageSrc={item.product.image}
      unitPrice={item.product.price}
      compareAtPrice={item.product.compareAtPrice}
      discountPercent={item.product.discountPercent}
      quantity={item.quantity}
      disabled={pending}
      outOfStock={item.outOfStock}
      warning={warning}
      onSetQuantity={(quantity) => onSetQuantity(item.productId, quantity)}
      onRemove={() => onRemove(item.productId)}
    />
  );
}

/** Signed-in cart: GET /cart via the cart context; warnings gate checkout. */
function ServerCartSection({
  onGoToCheckout,
}: {
  onGoToCheckout: () => void;
}) {
  const {
    cart,
    loaded,
    pending,
    error,
    setQuantity,
    removeItem,
    clear,
  } = useCart();

  if (!loaded) {
    return <CartNotice>در حال دریافت سبد خرید...</CartNotice>;
  }

  if (cart === null) {
    return (
      <CartNotice>
        سبد خرید دریافت نشد. لطفاً صفحه را دوباره بارگذاری کنید.
      </CartNotice>
    );
  }

  if (cart.items.length === 0) {
    return <EmptyCart />;
  }

  const hasWarning = cart.items.some(
    (item) => item.outOfStock || item.quantityExceedsStock || item.inactive,
  );
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const summaryLines: SummaryLine[] = cart.items.map((item) => ({
    unitPrice: item.product.price,
    compareAtPrice: item.product.compareAtPrice,
    discountPercent: item.product.discountPercent,
    quantity: item.quantity,
  }));

  return (
    <CartLayout
      itemCount={itemCount}
      summary={
        <PaymentSummary
          itemCount={itemCount}
          lines={summaryLines}
          payableTotal={cart.total}
          disabled={pending}
          hasWarning={hasWarning}
          note={
            hasWarning
              ? "برای ادامه پرداخت، کالاهای مشکل‌دار را از سبد حذف یا تعدادشان را اصلاح کنید."
              : null
          }
          onGoToCheckout={onGoToCheckout}
        />
      }
    >
      {error !== null && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-primary/5 px-4 py-3 text-sm text-primary"
        >
          {error}
        </p>
      )}
      <ul className="mt-2 divide-y divide-border">
        {cart.items.map((item) => (
          <ServerCartLine
            key={item.productId}
            item={item}
            pending={pending}
            onSetQuantity={(productId, quantity) => {
              void setQuantity(productId, quantity);
            }}
            onRemove={(productId) => {
              void removeItem(productId);
            }}
          />
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            void clear();
          }}
          disabled={pending}
          className="text-xs font-medium text-foreground/60 underline-offset-4 transition-colors hover:text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          خالی کردن سبد
        </button>
      </div>
    </CartLayout>
  );
}

/**
 * Guest cart: the validated storage entries plus one public GET /products/:slug
 * per line, fetched in parallel with cache: "no-store" so prices are never
 * stale. A 404 (product deleted/inactive) just drops that line; every rendered
 * price/total comes from these fresh server responses — never from storage.
 */
function GuestCartSection({
  onGoToCheckout,
}: {
  onGoToCheckout: () => void;
}) {
  const { guestItems, loaded, setQuantity, removeItem, clear } = useCart();
  const [lines, setLines] = useState<GuestLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (guestItems.length === 0) {
      setLines([]);
      return;
    }
    setLines(null);
    void Promise.all(
      guestItems.map(async (item): Promise<GuestLine | null> => {
        try {
          return { item, product: await getCartProductBySlug(item.slug) };
        } catch (cause) {
          if (isApiError(cause) && cause.status === 404) {
            return null; // Product is gone: silently drop the line.
          }
          throw cause;
        }
      }),
    )
      .catch(() => null)
      .then((result) => {
        if (!cancelled && result !== null) {
          setLines(result.filter((line): line is GuestLine => line !== null));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [guestItems]);

  if (!loaded) {
    return <CartNotice>در حال دریافت سبد خرید...</CartNotice>;
  }

  if (guestItems.length === 0) {
    return <EmptyCart />;
  }

  if (lines === null) {
    return <CartNotice>در حال دریافت سبد خرید...</CartNotice>;
  }

  const payableTotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.item.quantity,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.item.quantity, 0);
  const summaryLines: SummaryLine[] = lines.map((line) => ({
    unitPrice: line.product.price,
    compareAtPrice: line.product.compareAtPrice,
    discountPercent: line.product.discountPercent,
    quantity: line.item.quantity,
  }));

  return (
    <CartLayout
      itemCount={itemCount}
      summary={
        <PaymentSummary
          itemCount={itemCount}
          lines={summaryLines}
          payableTotal={payableTotal}
          disabled={false}
          hasWarning={false}
          note="برای تکمیل خرید باید وارد حساب کاربری شوید."
          onGoToCheckout={onGoToCheckout}
        />
      }
    >
      <ul className="mt-2 divide-y divide-border">
        {lines.map((line) => {
          const outOfStock = !line.product.inStock;
          // The public API never exposes raw stock: lowStock (1..3) is the only
          // visible count, so the "exceeds stock" hint can only use it.
          const exceeds =
            line.product.inStock &&
            line.product.lowStock !== null &&
            line.item.quantity > line.product.lowStock;
          const warning = outOfStock
            ? "ناموجود شده است"
            : exceeds
              ? "تعداد درخواستی بیشتر از موجودی است"
              : null;
          return (
            <CartItemRow
              key={line.item.productId}
              slug={line.product.slug}
              name={line.product.name}
              imageSrc={line.product.images[0] ?? null}
              unitPrice={line.product.price}
              compareAtPrice={line.product.compareAtPrice}
              discountPercent={line.product.discountPercent}
              quantity={line.item.quantity}
              disabled={false}
              outOfStock={outOfStock}
              warning={warning}
              onSetQuantity={(quantity) => {
                void setQuantity(line.item.productId, quantity);
              }}
              onRemove={() => {
                void removeItem(line.item.productId);
              }}
            />
          );
        })}
      </ul>
      <div className="mt-4 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => {
            void clear();
          }}
          className="text-xs font-medium text-foreground/60 underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          خالی کردن سبد
        </button>
      </div>
    </CartLayout>
  );
}
