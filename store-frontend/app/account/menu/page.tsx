import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountLogoutRow } from "@/components/account/account-logout-row";
import { SiteStatusToggle } from "@/components/site-status/site-status-toggle";
import { serverFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/session";
import { getOrders } from "@/lib/cart/client";

export const metadata: Metadata = {
  title: "منوی حساب کاربری",
  robots: { index: false, follow: false },
};

/** Shared keyboard-focus ring, identical for every focusable row. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** One full-width row of the menu: icon at the right, chevron at the far left. */
const MENU_ROW_CLASS = `flex h-14 items-center gap-3 px-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary ${FOCUS_RING}`;

/** Persian digits for the badges — same formatter the order pages use. */
const faNumber = new Intl.NumberFormat("fa-IR");

/** The backend caps GET /orders' `limit` at 50 (list-orders.dto.ts). */
const ORDERS_PAGE_LIMIT = 50;
/** Safety cap: at most 20 pages (1000 orders) are walked while counting. */
const MAX_ORDER_PAGES = 20;

/** One order bucket of the page: icon, label and the counter key. */
type OrderBucket = "active" | "delivered" | "returned";

/** The three buckets, in the order they are rendered (right to left). */
const ORDER_GROUPS: { key: OrderBucket; label: string; icon: string }[] = [
  { key: "active", label: "جاری", icon: "/icons/order-active.png" },
  { key: "delivered", label: "تحویل شده", icon: "/icons/order-delivered.png" },
  { key: "returned", label: "مرجوع شده", icon: "/icons/order-returned.png" },
];

/** How many orders fall into each bucket. */
type OrderCounts = Record<OrderBucket, number>;

/**
 * Bucket of one backend OrderStatus (prisma schema: PENDING | PAID | SHIPPED |
 * FAILED). The backend has no dedicated DELIVERED/RETURNED status yet, so the
 * closest existing values are used: SHIPPED counts as delivered and FAILED
 * (payment never completed) as returned — the same trade-off the rest of the
 * app makes when it maps those enums to Persian labels.
 */
function bucketOf(status: string): OrderBucket {
  if (status === "SHIPPED") {
    return "delivered";
  }
  if (status === "FAILED") {
    return "returned";
  }
  return "active";
}

/**
 * Counts the visitor's orders per bucket, or null when the numbers cannot be
 * trusted (see below).
 *
 * GET /orders returns one page plus `total` and offers no aggregation, so the
 * pages are walked one by one with the maximum page size. The whole count is
 * best-effort: a failed request or a page beyond MAX_ORDER_PAGES yields null,
 * and the page then renders the three icons without badges instead of a
 * silently wrong number. A visitor with a handful of orders — the realistic
 * case for a mobile menu — needs a single request.
 */
async function loadOrderCounts(): Promise<OrderCounts | null> {
  const counts: OrderCounts = { active: 0, delivered: 0, returned: 0 };
  let counted = 0;

  try {
    for (let page = 1; page <= MAX_ORDER_PAGES; page += 1) {
      const result = await getOrders(
        { page, limit: ORDERS_PAGE_LIMIT },
        serverFetch,
      );
      for (const order of result.items) {
        counts[bucketOf(order.status)] += 1;
      }
      counted += result.items.length;
      if (result.items.length === 0 || counted >= result.total) {
        return counts;
      }
    }
  } catch {
    // Backend unreachable, 401 or an unexpected payload: no badges.
    return null;
  }

  // More orders than the safety cap allows to count: no badges rather than a
  // number that is only a lower bound.
  return null;
}

/**
 * Line-art icon frame shared by the menu rows. lucide-react is not a
 * dependency of this project (and no new packages may be installed), so the
 * few icons the rows need are drawn inline in the same 24x24 stroke style as
 * the header's top-row icons.
 */
function Icon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Chevron pointing towards the end of the RTL row (visually left). */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

/** Bell — decorative header of the page (no notifications yet). */
function BellIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Icon>
  );
}

/** Shopping bag — the "سفارش‌ها" row. */
function BagIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Icon>
  );
}

/** Heart — the "لیست‌ها" row. */
function HeartIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Icon>
  );
}

/** Signpost — the "آدرس‌ها" row. */
function SignpostIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 3v18" />
      <path d="M12 6h5.5l2.5 2.5-2.5 2.5H12" />
      <path d="M12 13H6.5L4 15.5 6.5 18H12" />
    </Icon>
  );
}

/** Speech bubble — the "پیام‌ها" row. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
    </Icon>
  );
}

/** Person — the "اطلاعات حساب کاربری" row. */
function UserIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

/** Power — the owner-only site kill-switch row. */
function PowerIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 2v10" />
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    </Icon>
  );
}

/** One navigation row: icon at the right, label, chevron at the far left. */
function MenuRow({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className={MENU_ROW_CLASS}>
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronLeftIcon className="size-4 shrink-0 text-slate-400" />
    </Link>
  );
}

/**
 * Mobile account menu (Server Component), the page behind the account icon of
 * the header below `md` (from `md` up the header shows the dropdown instead).
 *
 * requireUser redirects anonymous visitors to /login?next=/account/menu, so the
 * body only ever renders for a real session. Layout, from top to bottom:
 * a decorative bell, the three order buckets with their counts, then the
 * full-width menu rows.
 *
 * Two rows point at /account because their own pages do not exist yet (see the
 * comments on the rows) — no page is invented here just to fill the menu.
 */
export default async function AccountMenuPage() {
  const user = await requireUser("/account/menu");
  const counts = await loadOrderCounts();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <h1 className="sr-only">حساب کاربری</h1>

      {/* Top row: the bell is decorative (the store sends no notifications
          yet), so it is not a link. */}
      <div className="flex items-center justify-end">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center text-slate-500"
        >
          <BellIcon className="size-6" />
        </span>
      </div>

      {/* Orders: title with the primary underline on the right, "مشاهده همه"
          on the left, then the three buckets. */}
      <section className="mt-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              سفارش‌های من
            </h2>
            <span
              aria-hidden="true"
              className="mt-1.5 block h-0.5 w-10 rounded-full bg-primary"
            />
          </div>
          <Link
            href="/orders"
            className={`flex items-center gap-1 rounded-md pb-1 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 ${FOCUS_RING}`}
          >
            مشاهده همه
            <ChevronLeftIcon className="size-4" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-2xl border border-border bg-background py-4">
          {ORDER_GROUPS.map((group, index) => {
            // null = the counts could not be established: icon without badge.
            const count = counts === null ? null : counts[group.key];
            return (
              <div
                key={group.key}
                className={`flex flex-col items-center gap-2 ${
                  index > 0 ? "border-s border-border" : ""
                }`}
              >
                <div className="relative size-16">
                  <Image
                    src={group.icon}
                    alt=""
                    width={64}
                    height={64}
                    quality={100}
                    className="size-16 object-contain"
                  />
                  {count !== null && count > 0 && (
                    <span className="absolute -bottom-1 -end-1 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary shadow-sm ring-1 ring-border">
                      {faNumber.format(count)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-600">{group.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Thin separator, then the full-width rows. */}
      <nav
        aria-label="منوی حساب کاربری"
        className="mt-6 divide-y divide-border border-t border-border"
      >
        <MenuRow
          href="/orders"
          label="سفارش‌ها"
          icon={<BagIcon className="size-5" />}
        />
        {/* No wishlist page exists yet, so the row falls back to /account. */}
        <MenuRow
          href="/account"
          label="لیست‌ها"
          icon={<HeartIcon className="size-5" />}
        />
        <MenuRow
          href="/account/addresses"
          label="آدرس‌ها"
          icon={<SignpostIcon className="size-5" />}
        />
        {/* The store has no messaging feature yet: fallback to /account. */}
        <MenuRow
          href="/account"
          label="پیام‌ها"
          icon={<ChatIcon className="size-5" />}
        />
        <MenuRow
          href="/account/profile"
          label="اطلاعات حساب کاربری"
          icon={<UserIcon className="size-5" />}
        />
        {/*
          Owner-only site kill switch. The row is rendered from the backend's
          `isOwner` flag alone, so it does not exist for anybody else; the
          confirmation dialog and the POST /site-status call are inside
          SiteStatusToggle.
        */}
        {user.isOwner === true && (
          <SiteStatusToggle
            className={MENU_ROW_CLASS}
            icon={<PowerIcon className="size-5" />}
            trailing={
              <ChevronLeftIcon className="size-4 shrink-0 text-slate-400" />
            }
          />
        )}
        <AccountLogoutRow />
      </nav>
    </div>
  );
}
