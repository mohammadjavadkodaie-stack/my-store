import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CartLink } from "@/components/cart/cart-link";
import { AccountMenu } from "@/components/layout/account-menu";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Plain-text store name: used by the metadata title template in
 * app/layout.tsx (a `<title>` cannot carry an image). The visible brand mark is
 * the logo image (public/logo.png), rendered by the header and the footer.
 */
export const STORE_NAME = "بازی بازار";

/** Shared keyboard-focus ring, identical for every focusable top-row control. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Line-art icon frame shared by the top-row icons. lucide-react is not a
 * dependency of this project (and no new packages may be installed), so the
 * few icons the top row needs are drawn inline in the same 24x24 stroke style.
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

/** Magnifier drawn for the search submit button. */
function SearchIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

/** Notification bell for the decorative (visual-only) bell spot. */
function BellIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Icon>
  );
}

/**
 * "Log in" glyph: an arrow entering a box. Drawn pre-mirrored (box on the
 * left, arrow arriving from the right) so it points into the page in the RTL
 * document direction without a runtime transform.
 */
function LogInIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="m14 17-5-5 5-5" />
      <path d="M21 12H9" />
    </Icon>
  );
}

/**
 * Top of every page: a Digikala-style top row — logo, rounded search field, a
 * flexible gap, then the bell / login-account / divider / cart cluster.
 *
 * The platform menu no longer lives here: it is rendered by the home page,
 * directly below the hero slider.
 *
 * Async Server Component on purpose: it reads the current session through
 * getCurrentUser (React-cached per request, and no backend call at all for a
 * guest) so the header shows either the guest "ورود | ثبت‌نام" button or the
 * signed-in AccountMenu (a dropdown from `md` up, a link to /account/menu
 * below it). Reading cookies() makes routes render dynamically — the price of
 * a header that always knows the auth state.
 */
export default async function SiteHeader() {
  const user = await getCurrentUser();

  // Display name of the account menu: the full name, falling back to the phone
  // number when the visitor has not filled in either name field yet.
  const accountName =
    user === null
      ? ""
      : `${user.firstName} ${user.lastName}`.trim() || user.phone;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      {/* White 64px (h-16) top row on the same container as the rest of the
          site (mx-auto max-w-6xl + px-4). On small screens the bell and the
          divider disappear and only the search field shrinks. */}
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        {/* 1) Logo (rightmost in RTL): the public/logo.png brand mark at 44px,
            width auto so the image keeps its own aspect ratio. `preload`
            (not the deprecated `priority`) because it is above the fold. */}
        <Link
          href="/"
          aria-label="بازی بازار — صفحه اصلی"
          className={`shrink-0 rounded-full ${FOCUS_RING}`}
        >
          <Image
            src="/logo.png"
            alt="بازی بازار"
            width={1774}
            height={887}
            quality={100}
            preload
            className="h-11 w-auto object-contain"
          />
        </Link>

        {/* 2) Search (next to the logo): pill-shaped, borderless, light-gray
            field that grows up to max-w-xl and shrinks on small screens.
            Still a native GET form: submitting navigates to /products?q=...
            with no JS, and the magnifier inside the field is its submit
            button (positioned on the right = inline-start in RTL). */}
        <form
          action="/products"
          method="get"
          role="search"
          aria-label="جستجو در محصولات"
          className="min-w-0 max-w-xl flex-1 rounded-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
        >
          <div className="relative">
            <input
              type="search"
              name="q"
              maxLength={100}
              aria-label="جستجوی محصول"
              placeholder="جستجو"
              className="h-11 w-full rounded-full border-0 bg-[#f0f0f1] pe-4 ps-11 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none"
            />
            <button
              type="submit"
              aria-label="جستجو"
              className={`absolute start-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-foreground/50 transition-colors hover:text-foreground ${FOCUS_RING}`}
            >
              <SearchIcon className="size-5" />
            </button>
          </div>
        </form>

        {/* 3) Flexible gap: the auto margin only absorbs the space the search
            field cannot take (it is already capped at max-w-xl), pinning the
            cluster below to the far (left) edge. */}
        <div aria-hidden="true" className="ml-auto" />

        {/* 4) Left cluster, RTL order: bell, login/account, divider, cart. */}
        <nav
          aria-label="حساب کاربری و سبد خرید"
          className="flex shrink-0 items-center gap-1.5 sm:gap-2.5"
        >
          {/* Visual-only bell: no dropdown, no handler, invisible to
              assistive tech — it is decoration until notifications exist. */}
          <span
            aria-hidden="true"
            className="hidden size-11 items-center justify-center text-foreground/70 sm:inline-flex"
          >
            <BellIcon className="size-6" />
          </span>

          {/* Login/account, divider and cart live in the fixed bottom
              navigation bar below `md`; from `md` up they render exactly as
              before. Wrapping them keeps the bell as the only mobile top-row
              control without duplicating the responsive rules. */}
          <div className="hidden items-center gap-1.5 md:flex sm:gap-2.5">
            {user === null ? (
              <Link
                href="/login"
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-foreground/5 ${FOCUS_RING}`}
              >
                ورود | ثبت‌نام
                <LogInIcon className="size-5 text-foreground/70" />
              </Link>
            ) : (
              <>
                {/* Admin-only shortcut. This gating is UI-only — it merely hides
                    the link from non-admins; the real protection is the backend
                    @Roles(ADMIN) guard on the admin endpoints. */}
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    title="پنل مدیریت"
                    className={`inline-flex h-11 items-center whitespace-nowrap rounded-xl border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-foreground/5 ${FOCUS_RING}`}
                  >
                    پنل مدیریت
                  </Link>
                )}
                {/* Account entry point for every signed-in role (USER and
                    ADMIN alike): the dropdown from `md` up, the /account/menu
                    page below it. Both carry the logout action, so the header
                    stays a pure navigation bar. */}
                <AccountMenu
                  fullName={accountName}
                  isOwner={user.isOwner === true}
                />
              </>
            )}

            {/* Thin 24px vertical divider, hidden below `md` with the rest of
                this cluster. */}
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-border md:block"
            />

            <CartLink />
          </div>
        </nav>
      </div>
    </header>
  );
}
