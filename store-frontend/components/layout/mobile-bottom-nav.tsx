"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart/cart-provider";

/**
 * Digikala-style fixed bottom navigation bar, mobile only (below `md`).
 *
 * Client Component because it needs the current pathname (to mark the active
 * tab and to stay off the /admin panel) and the live cart count from the cart
 * context — the same source the header's CartLink reads, so the two badges can
 * never drift apart. The signed-in state is NOT fetched here: the root layout
 * resolves it on the server and passes it in as `isLoggedIn`.
 *
 * The bar sits on top of the page (fixed, z-40) with the site background, a top
 * border and a soft upward shadow; it reserves room for the device's home
 * indicator with an env(safe-area-inset-bottom) padding. The storefront wrapper
 * in app/layout.tsx carries the matching bottom padding so the bar never covers
 * the footer or the last line of content.
 */

/** Shared keyboard-focus ring, identical for every focusable control on the site. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Persian digits for the cart badge. */
const faNumber = new Intl.NumberFormat("fa-IR");

/**
 * Line-art icon frame shared by the bar's icons. lucide-react is not a
 * dependency of this project (and no new packages may be installed), so the
 * four icons are drawn inline in the same 24x24 stroke style as the header
 * icons. `active` thickens the stroke, so the selected tab reads as
 * "filled/heavier" next to the gray inactive ones.
 */
function Icon({
  children,
  className,
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.8}
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

/** خانه — a house outline. */
function HomeIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <Icon className={className} active={active}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </Icon>
  );
}

/** دسته‌بندی — a 2x2 grid of squares (4-squares icon). */
function GridIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <Icon className={className} active={active}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

/** سبد خرید — the same glyph as the header cart link. */
function CartIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <Icon className={className} active={active}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.07H5.12" />
    </Icon>
  );
}

/** حساب من — the header account glyph (head + shoulders). */
function PersonIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <Icon className={className} active={active}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}


type NavIconProps = { className?: string; active?: boolean };

type NavItem = {
  key: string;
  label: string;
  href: string;
  IconComponent: (props: NavIconProps) => ReactNode;
  active: boolean;
};

type MobileBottomNavProps = {
  /** Signed-in state, resolved on the server by the root layout. */
  isLoggedIn: boolean;
};

export function MobileBottomNav({ isLoggedIn }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  // The bar belongs to the storefront only: the admin panel has its own
  // sidebar and must not carry the shopper navigation.
  if (pathname.startsWith("/admin")) {
    return null;
  }

  // The product detail page carries its own fixed buy bar; hiding this bar on
  // that route (and only there — the /products listing keeps it) keeps the two
  // fixed bars from ever stacking on top of each other.
  if (/^\/products\/[^/]+/.test(pathname)) {
    return null;
  }

  const accountHref = isLoggedIn ? "/account/menu" : "/login";

  // RTL render order is right to left: خانه, دسته‌بندی, سبد خرید, حساب من.
  const items: NavItem[] = [
    {
      key: "home",
      label: "خانه",
      href: "/",
      IconComponent: HomeIcon,
      active: pathname === "/",
    },
    {
      key: "categories",
      label: "دسته‌بندی",
      href: "/categories",
      IconComponent: GridIcon,
      active: pathname.startsWith("/categories"),
    },
    {
      key: "cart",
      label: "سبد خرید",
      href: "/cart",
      IconComponent: CartIcon,
      active: pathname.startsWith("/cart"),
    },
    {
      key: "account",
      label: "حساب من",
      href: accountHref,
      IconComponent: PersonIcon,
      active: pathname.startsWith("/account") || pathname.startsWith("/login"),
    },
  ];

  return (
    <nav
      aria-label="ناوبری پایین"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex h-16 items-stretch">
        {items.map(({ key, label, href, IconComponent, active }) => (
          <li key={key} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-full flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-primary" : "text-foreground/60"
              } ${FOCUS_RING}`}
            >
              <span className="relative">
                <IconComponent className="size-6" active={active} />
                {key === "cart" && itemCount > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                    {itemCount > 9 ? "۹+" : faNumber.format(itemCount)}
                  </span>
                )}
              </span>
              <span
                className={`text-[11px] leading-none ${active ? "font-bold" : ""}`}
              >
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
