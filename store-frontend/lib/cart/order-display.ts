/**
 * Persian display helpers for the order pages (/orders, /orders/[id]).
 *
 * The backend enums are the only accepted values (prisma OrderStatus /
 * PaymentStatus); anything unexpected maps to a neutral "نامشخص" badge instead
 * of echoing a raw enum value into the UI.
 */

/** One status pill: label text + full Tailwind classes. */
export interface OrderBadge {
  label: string;
  className: string;
}

const BADGE_BASE = "rounded-full px-3 py-1 text-xs font-bold";

const ORDER_STATUS_BADGES: Record<string, OrderBadge> = {
  PENDING: {
    label: "در انتظار پرداخت",
    className: `${BADGE_BASE} bg-primary/10 text-primary`,
  },
  PAID: {
    label: "پرداخت شده",
    className: `${BADGE_BASE} bg-primary text-primary-foreground`,
  },
  SHIPPED: {
    label: "ارسال شده",
    className: `${BADGE_BASE} border border-primary text-primary`,
  },
  FAILED: {
    label: "ناموفق",
    className: `${BADGE_BASE} border border-border text-foreground/60`,
  },
};

const PAYMENT_STATUS_BADGES: Record<string, OrderBadge> = {
  pending: {
    label: "در انتظار پرداخت",
    className: `${BADGE_BASE} bg-primary/10 text-primary`,
  },
  paid: {
    label: "پرداخت شده",
    className: `${BADGE_BASE} bg-primary text-primary-foreground`,
  },
  failed: {
    label: "ناموفق",
    className: `${BADGE_BASE} border border-border text-foreground/60`,
  },
};

const UNKNOWN_BADGE: OrderBadge = {
  label: "نامشخص",
  className: `${BADGE_BASE} border border-border text-foreground/60`,
};

/** Persian label + badge classes for a backend OrderStatus value. */
export function orderStatusBadge(status: string): OrderBadge {
  return ORDER_STATUS_BADGES[status] ?? UNKNOWN_BADGE;
}

/** Persian label + badge classes for a backend PaymentStatus value. */
export function paymentStatusBadge(status: string): OrderBadge {
  return PAYMENT_STATUS_BADGES[status] ?? UNKNOWN_BADGE;
}

const orderDateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Persian date + time for an order's ISO-8601 createdAt. An unparsable value
 * (defensive) renders as an empty string rather than "Invalid Date".
 */
export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : orderDateTimeFormatter.format(date);
}
