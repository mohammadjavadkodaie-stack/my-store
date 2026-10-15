"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/cart-provider";

/**
 * Line-art shopping cart for the header link. lucide-react is not a
 * dependency of this project (and no new packages may be installed), so the
 * icon is drawn inline in the same 24x24 stroke style as the other top-row
 * icons in site-header.tsx.
 */
function CartIcon({ className }: { className?: string }) {
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
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.07H5.12" />
    </svg>
  );
}

/**
 * Header cart link with the item-count badge (total quantity). The count
 * comes from the cart context: the server cart for a signed-in visitor, the
 * validated guest storage otherwise. Hidden (not zero) when the cart is empty.
 *
 * Redesigned with the Digikala-style top row as an icon-only control — the
 * visible label became the aria-label and the badge now overlays the top-end
 * corner of the icon. The link target (/cart) and the badge logic are
 * unchanged.
 */
export function CartLink() {
  const { itemCount } = useCart();

  return (
    <Link
      href="/cart"
      className="relative inline-flex size-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={
        itemCount > 0 ? `سبد خرید، ${itemCount} کالا` : "سبد خرید"
      }
    >
      <CartIcon className="size-6" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -end-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-primary-foreground">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
