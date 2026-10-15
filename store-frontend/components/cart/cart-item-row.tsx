"use client";

import Link from "next/link";
import { MAX_ITEM_QUANTITY } from "@/lib/cart/constants";
import { formatPercent, formatPrice } from "@/lib/format";

const faNumber = new Intl.NumberFormat("fa-IR");

/**
 * Only http(s) and root-relative image URLs are rendered; any other value
 * (empty string, data:, javascript:, ...) falls back to the neutral
 * placeholder box instead of reaching the <img> src (the same guard the
 * product card uses).
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
  );
}

/**
 * Trash glyph for the "remove" control shown at quantity 1. lucide-react is
 * not a dependency of this project (and no new packages may be installed), so
 * the few icons the cart needs are drawn inline in the shared 24x24 stroke
 * style.
 */
function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

/**
 * Quantity pill shared by both cart flavors: plus on the right, the count in
 * the middle and minus on the left (RTL). At quantity 1 the minus is replaced
 * by a trash button that removes the line through the caller's existing
 * remove handler. Plus stays disabled at the shared max-quantity cap.
 */
function QuantityStepper({
  quantity,
  disabled,
  onSetQuantity,
  onRemove,
}: {
  quantity: number;
  disabled: boolean;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded-full bg-[#f0f0f1] px-1">
      <button
        type="button"
        aria-label="افزایش تعداد"
        disabled={disabled || quantity >= MAX_ITEM_QUANTITY}
        onClick={() => onSetQuantity(quantity + 1)}
        className="flex size-9 items-center justify-center rounded-full text-lg font-bold text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        +
      </button>
      <span className="min-w-6 text-center text-sm font-bold text-foreground">
        {faNumber.format(quantity)}
      </span>
      {quantity <= 1 ? (
        <button
          type="button"
          aria-label="حذف از سبد خرید"
          disabled={disabled}
          onClick={onRemove}
          className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <TrashIcon className="size-5" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="کاهش تعداد"
          disabled={disabled}
          onClick={() => onSetQuantity(quantity - 1)}
          className="flex size-9 items-center justify-center rounded-full text-lg font-bold text-foreground transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          −
        </button>
      )}
    </div>
  );
}

export interface CartItemRowProps {
  slug: string;
  name: string;
  imageSrc: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  discountPercent: number;
  quantity: number;
  /** True while a mutation for this line is in flight (server cart). */
  disabled: boolean;
  /** The line's product is no longer in stock: price is hidden, «ناموجود» shown. */
  outOfStock: boolean;
  /** Small warning line under the name (exceeds stock, inactive, ...). */
  warning: string | null;
  onSetQuantity: (quantity: number) => void;
  onRemove: () => void;
}

/**
 * Presentational cart line for both cart flavors: image (right, links to the
 * product), name/discount/price in the middle and the quantity pill on the
 * left. It owns no cart logic — every handler is passed in by the caller.
 */
export function CartItemRow({
  slug,
  name,
  imageSrc,
  unitPrice,
  compareAtPrice,
  discountPercent,
  quantity,
  disabled,
  outOfStock,
  warning,
  onSetQuantity,
  onRemove,
}: CartItemRowProps) {
  const href = `/products/${encodeURIComponent(slug)}`;
  const rawImage = imageSrc?.trim() ?? "";
  const showImage = rawImage.length > 0 && isRenderableImageSrc(rawImage);
  const hasDiscount = discountPercent > 0;

  return (
    <li className="flex items-center gap-3 py-5 first:pt-0 last:pb-0 sm:gap-4">
      <Link
        href={href}
        className="size-24 shrink-0 overflow-hidden rounded-xl bg-primary/5 sm:size-28"
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary backend hosts, so a plain img is used instead of next/image
          <img
            src={rawImage}
            alt={name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-foreground/40">
            بدون تصویر
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="line-clamp-2 text-sm font-bold text-foreground hover:text-primary sm:text-base"
        >
          {name}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {outOfStock ? (
            // No price is shown for an out-of-stock line: the same red
            // «ناموجود» the product card uses takes its place.
            <span className="text-sm font-bold text-red-600">ناموجود</span>
          ) : (
            <>
              {hasDiscount && (
                <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {formatPercent(discountPercent)}
                </span>
              )}
              {hasDiscount && compareAtPrice !== null && (
                <s className="text-xs text-foreground/50">
                  {formatPrice(compareAtPrice)}
                </s>
              )}
              <span className="text-sm font-extrabold text-foreground">
                {formatPrice(unitPrice)}
              </span>
            </>
          )}
        </div>

        {warning !== null && !outOfStock && (
          // An out-of-stock line already shows «ناموجود» above, so its own
          // warning text would only repeat the same information.
          <p className="mt-1 text-xs font-medium text-primary">{warning}</p>
        )}
      </div>

      <QuantityStepper
        quantity={quantity}
        disabled={disabled}
        onSetQuantity={onSetQuantity}
        onRemove={onRemove}
      />
    </li>
  );
}
