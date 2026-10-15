import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isApiError } from "@/lib/api/error";
import { serverFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/session";
import { getOrder } from "@/lib/cart/client";
import {
  formatOrderDateTime,
  orderStatusBadge,
  paymentStatusBadge,
} from "@/lib/cart/order-display";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/cart/types";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

type OrderDetailPageProps = {
  /** Next.js 16 passes route params as a Promise that must be awaited. */
  params: Promise<{ id: string }>;
};

const faNumber = new Intl.NumberFormat("fa-IR");

/**
 * Pure digits, at most nine of them: everything else (letters, path-like
 * values, negatives) is rejected before any backend call — a 404 without
 * touching the API.
 */
function parseOrderId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) {
    return null;
  }
  const id = Number.parseInt(raw, 10);
  return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

/** Friendly fallback for a backend failure that is not a 404. */
function OrderLoadError() {
  return (
    <div
      role="alert"
      className="mx-auto mt-6 flex w-full max-w-3xl flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 px-6 py-8 text-center"
    >
      <p className="text-base font-bold leading-7 text-foreground">
        دریافت اطلاعات سفارش ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.
      </p>
      <Link
        href="/orders"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        بازگشت به سفارش‌ها
      </Link>
    </div>
  );
}

/** /orders/:id — one of the visitor's own orders (a 404 for anyone else's). */
export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id: rawId } = await params;
  const id = parseOrderId(rawId);
  if (id === null) {
    notFound();
  }

  await requireUser(`/orders/${id}`);

  let order: Order;
  try {
    order = await getOrder(id, serverFetch);
  } catch (cause) {
    if (isApiError(cause) && cause.isNotFound) {
      // Unknown id, or an order that belongs to someone else.
      notFound();
    }
    return <OrderLoadError />;
  }

  const status = orderStatusBadge(order.status);
  const payment = paymentStatusBadge(order.paymentStatus);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <Link
        href="/orders"
        className="text-sm text-primary transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        بازگشت به سفارش‌ها
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-foreground">
          سفارش {faNumber.format(order.id)}
        </h1>
        <p className="text-sm text-foreground/70">
          {formatOrderDateTime(order.createdAt)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={status.className}>وضعیت سفارش: {status.label}</span>
        <span className={payment.className}>
          وضعیت پرداخت: {payment.label}
        </span>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {order.items.map((item) => (
          <li
            key={item.productId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4"
          >
            <span className="text-sm font-bold text-foreground">
              {item.productName}
            </span>
            <p className="text-xs text-foreground/60">
              {formatPrice(item.unitPrice)} × {faNumber.format(item.quantity)} ={" "}
              <span className="font-bold text-foreground">
                {formatPrice(item.lineTotal)}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-end text-sm font-extrabold text-foreground">
        جمع کل: {formatPrice(order.total)}
      </p>
    </div>
  );
}
