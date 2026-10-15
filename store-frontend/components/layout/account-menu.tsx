"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { SiteStatusToggle } from "@/components/site-status/site-status-toggle";
import { logout } from "@/lib/auth/client";

/**
 * Account entry point of the header top row for a signed-in visitor.
 *
 * The server-side header only passes the display name; this component renders
 * both triggers so the layout is decided in CSS:
 * - below `md`: a plain icon link to the /account/menu page (no dropdown — the
 *   mobile menu page carries the same entries as full-width rows);
 * - from `md` up: a button that toggles the dropdown with those entries.
 *
 * The dropdown closes on an outside pointer-down, on Escape (focus returns to
 * the trigger) and on every route change. Its logout row calls the exact same
 * POST /auth/logout flow the account dashboard uses (lib/auth/client) and then
 * re-syncs the UI, so the header re-renders as a guest.
 *
 * lucide-react is not a dependency of this project (and no new packages may be
 * installed), so every icon is drawn inline in the same 24x24 stroke style as
 * the other top-row icons in site-header.tsx.
 */

/** Shared keyboard-focus ring, identical for every focusable top-row control. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** id of the dropdown, referenced by the trigger's aria-controls. */
const MENU_ID = "account-menu-dropdown";

/** One row of the dropdown: shared by the links and the logout button. */
const MENU_ROW_CLASS = `flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary ${FOCUS_RING}`;

/**
 * Destinations of the menu. There is no wishlist page yet, so "لیست‌ها" points
 * at the account dashboard instead of a page created just for this menu (the
 * same fallback the mobile menu page uses).
 */
const MOBILE_MENU_HREF = "/account/menu";
const PROFILE_HREF = "/account/profile";
const ORDERS_HREF = "/orders";
const ADDRESSES_HREF = "/account/addresses";
const WISHLIST_HREF = "/account";

/** Line-art icon frame shared by the menu icons. */
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

/** Person glyph of the trigger (head + shoulders). */
function PersonIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

/** Caret-down of the trigger. */
function CaretDownIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
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

/** Shopping bag — the "سفارش‌ها" entry. */
function BagIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </Icon>
  );
}

/** Signpost — the "آدرس‌ها" entry. */
function SignpostIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 3v18" />
      <path d="M12 6h5.5l2.5 2.5-2.5 2.5H12" />
      <path d="M12 13H6.5L4 15.5 6.5 18H12" />
    </Icon>
  );
}

/** Heart — the "لیست‌ها" entry. */
function HeartIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </Icon>
  );
}

/**
 * Logout glyph: a door opening on the right (the inline start in this RTL
 * document) with the arrow leaving it towards the page end — the mirror of the
 * "log in" glyph drawn in site-header.tsx.
 */
function LogoutIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M3 12h12" />
      <path d="m8 7-5 5 5 5" />
    </Icon>
  );
}

/**
 * Power glyph — the site kill-switch row. Drawn in the same 24x24 stroke style
 * as the other menu icons (lucide-react is not a dependency of this project).
 */
function PowerIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 2v10" />
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    </Icon>
  );
}

type AccountMenuProps = {
  /** Full name of the visitor, already falling back to the phone number. */
  fullName: string;
  /**
   * Owner flag of the backend session (GET /auth/me -> `isOwner`). Only the
   * server sets it, and it is the sole condition for rendering the site
   * kill-switch row below — no owner phone or owner check lives in this file.
   */
  isOwner?: boolean;
};

export function AccountMenu({ fullName, isOwner = false }: AccountMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // Path the dropdown was last synchronized with. Comparing it during render
  // (the React-documented way to reset state when a value changes) closes the
  // menu on any navigation — links, back/forward or a programmatic push —
  // without an effect, which would trigger a cascading re-render.
  const [menuPath, setMenuPath] = useState(pathname);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  function closeMenu(): void {
    setOpen(false);
  }

  // While open: close on an outside pointer-down and on Escape (handing the
  // focus back to the trigger). The listeners exist only while it is mounted.
  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: PointerEvent): void {
      if (
        wrapperRef.current !== null &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleLogout(): Promise<void> {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logout();
    } catch {
      // Ignored: the refresh below re-reads the session from the server.
    } finally {
      setOpen(false);
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <>
      {/* Mobile (below `md`): no dropdown, just the /account/menu page. */}
      <Link
        href={MOBILE_MENU_HREF}
        aria-label="حساب کاربری"
        className={`inline-flex size-11 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-[#fde8ea] md:hidden ${FOCUS_RING}`}
      >
        <PersonIcon className="size-6" />
      </Link>

      {/* Desktop (`md` and up). The wrapper is hidden below `md` too, so an
          empty relative box never adds a gap to the top row. */}
      <div ref={wrapperRef} className="relative hidden md:block">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((current) => !current)}
          className={`hidden h-11 max-w-44 items-center gap-2 rounded-xl px-3 text-sm text-foreground transition-colors md:flex ${
            open ? "bg-[#fde8ea]" : "hover:bg-[#fde8ea]"
          } ${FOCUS_RING}`}
        >
          <PersonIcon className="size-5 shrink-0 text-foreground/70" />
          <span className="min-w-0 truncate">{fullName}</span>
          {/* The caret sits at the visual left (the trailing edge in RTL). */}
          <CaretDownIcon
            className={`size-4 shrink-0 text-foreground/60 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div
            id={MENU_ID}
            role="menu"
            aria-label="منوی حساب کاربری"
            className="absolute end-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-white p-2 shadow-lg"
          >
            <div className="flex flex-col divide-y divide-border">
              {/* 1) The visitor's own name: the way into the profile page. */}
              <Link
                role="menuitem"
                href={PROFILE_HREF}
                onClick={closeMenu}
                className={MENU_ROW_CLASS}
              >
                <span className="min-w-0 flex-1 truncate font-bold">
                  {fullName}
                </span>
                <ChevronLeftIcon className="size-4 shrink-0 text-slate-400" />
              </Link>
              <Link
                role="menuitem"
                href={ORDERS_HREF}
                onClick={closeMenu}
                className={MENU_ROW_CLASS}
              >
                <BagIcon className="size-5 shrink-0 text-slate-400" />
                <span className="flex-1">سفارش‌ها</span>
              </Link>
              <Link
                role="menuitem"
                href={ADDRESSES_HREF}
                onClick={closeMenu}
                className={MENU_ROW_CLASS}
              >
                <SignpostIcon className="size-5 shrink-0 text-slate-400" />
                <span className="flex-1">آدرس‌ها</span>
              </Link>
              {/* No wishlist page exists yet: the entry falls back to /account. */}
              <Link
                role="menuitem"
                href={WISHLIST_HREF}
                onClick={closeMenu}
                className={MENU_ROW_CLASS}
              >
                <HeartIcon className="size-5 shrink-0 text-slate-400" />
                <span className="flex-1">لیست‌ها</span>
              </Link>
              {/*
                Owner-only site kill switch. Rendered from the server-provided
                `isOwner` flag only, so the row simply does not exist for
                everybody else. The confirm dialog and the POST /site-status
                call live inside SiteStatusToggle.
              */}
              {isOwner && (
                <SiteStatusToggle
                  menuItem
                  className={MENU_ROW_CLASS}
                  icon={<PowerIcon className="size-5 shrink-0 text-slate-400" />}
                />
              )}
              <button
                role="menuitem"
                type="button"
                onClick={handleLogout}
                disabled={pending}
                className={`${MENU_ROW_CLASS} disabled:pointer-events-none disabled:opacity-60`}
              >
                <LogoutIcon className="size-5 shrink-0 text-slate-400" />
                <span className="flex-1">
                  {pending ? "در حال خروج..." : "خروج از حساب کاربری"}
                </span>
              </button>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
