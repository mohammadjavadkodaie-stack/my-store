import type { Metadata } from "next";
import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/session";
import { getOrders } from "@/lib/cart/client";
import {
  formatOrderDateTime,
  orderStatusBadge,
} from "@/lib/cart/order-display";
import { formatPrice } from "@/lib/format";
import type { OrdersPage } from "@/lib/cart/types";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  robots: { index: false, follow: false },
};

type OrdersListPageProps = {
  /** Next.js 16 passes search params as a Promise that must be awaited. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ORDERS_PAGE_SIZE = 10;

const faNumber = new Intl.NumberFormat("fa-IR");

/** ?page= -> a positive integer (default 1); anything else falls back to 1. */
function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

const PAGER_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PAGER_LINK_CLASS = `inline-flex min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary ${PAGER_FOCUS_RING}`;

const PAGER_CURRENT_CLASS =
  "inline-flex min-w-9 items-center justify-center rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground";

const PAGER_DISABLED_CLASS =
  "inline-flex min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/40";

/** Prev/next plus a five-page window — same shape as the products pagination. */
function OrdersPager({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) {
    return null;
  }
  const href = (target: number): string =>
    target <= 1 ? "/orders" : `/orders?page=${target}`;

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const numbers: number[] = [];
  for (let current = start; current <= end; current += 1) {
    numbers.push(current);
  }

  return (
    <nav
      aria-label="صفحه‌بندی"
      className="mt-6 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link rel="prev" href={href(page - 1)} className={PAGER_LINK_CLASS}>
          قبلی
        </Link>
      ) : (
        <span className={PAGER_DISABLED_CLASS}>قبلی</span>
      )}
      {numbers.map((number) =>
        number === page ? (
          <span key={number} aria-current="page" className={PAGER_CURRENT_CLASS}>
            {faNumber.format(number)}
          </span>
        ) : (
          <Link key={number} href={href(number)} className={PAGER_LINK_CLASS}>
            {faNumber.format(number)}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link rel="next" href={href(page + 1)} className={PAGER_LINK_CLASS}>
          بعدی
        </Link>
      ) : (
        <span className={PAGER_DISABLED_CLASS}>بعدی</span>
      )}
    </nav>
  );
}

/** /orders — the signed-in visitor's orders, newest first. */
export default async function OrdersListPage({
  searchParams,
}: OrdersListPageProps) {
  await requireUser("/orders");
  const page = parsePage((await searchParams).page);

  let result: OrdersPage | null = null;
  try {
    result = await getOrders(
      { page, limit: ORDERS_PAGE_SIZE },
      serverFetch,
    );
  } catch {
    // The backend message is deliberately neither shown nor logged.
    result = null;
  }

  if (result === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-extrabold text-foreground">
          سفارش‌های من
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-border bg-primary/5 p-6 text-center"
        >
          <p className="text-base font-bold text-foreground">
            خطا در دریافت سفارش‌ها
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            در حال حاضر نمایش سفارش‌ها ممکن نیست. لطفاً چند لحظه بعد دوباره
            تلاش کنید.
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold text-foreground">سفارش‌های من</h1>

      {result.items.length === 0 ? (
        result.total === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 p-10 text-center">
            <p className="text-base font-bold text-foreground">
              شما هنوز سفارشی ثبت نکرده‌اید.
            </p>
            <Link
              href="/products"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          // e.g. /orders?page=99 — orders exist, just not on this page.
          <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 p-10 text-center">
            <p className="text-base font-bold text-foreground">
              صفحه‌ای با این شماره وجود ندارد.
            </p>
            <Link
              href="/orders"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              سفارش‌های من
            </Link>
          </div>
        )
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {result.items.map((order) => {
              const badge = orderStatusBadge(order.status);
              return (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground">
                        سفارش {faNumber.format(order.id)}
                      </span>
                      <span className="text-xs text-foreground/60">
                        {formatOrderDateTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className={badge.className}>{badge.label}</span>
                      <span className="text-xs text-foreground/60">
                        {faNumber.format(order.itemCount)} کالا
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <OrdersPager page={result.page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
