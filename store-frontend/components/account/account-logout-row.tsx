"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth/client";

/**
 * Logout row of the mobile account menu page (/account/menu).
 *
 * Same flow as the other logout entry points of the app: POST /auth/logout
 * through lib/auth/client (the backend clears the httpOnly cookie — never a
 * GET), then back to the home page with a refresh, which re-renders the
 * header as a guest and lets CartProvider swap the server cart for guest
 * storage. A failure is swallowed on purpose — the refresh always shows the
 * real server-side state — and the row is disabled while the request is in
 * flight.
 *
 * The row shape (h-14, icon on the right, label, chevron at the far left)
 * mirrors the link rows the page renders around it; lucide-react is not a
 * dependency of this project, so its two icons are drawn inline in the same
 * 24x24 stroke style as the rest of the site.
 */

/** Shared keyboard-focus ring, identical for every focusable row. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ROW_CLASS = `flex h-14 w-full items-center gap-3 px-2 text-start text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-primary disabled:pointer-events-none disabled:opacity-60 ${FOCUS_RING}`;

/** Line-art icon frame. */
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

/**
 * Logout glyph: a door opening on the right (the inline start in this RTL
 * document) with the arrow leaving it towards the page end.
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

/** Chevron pointing towards the end of the RTL row (visually left). */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function AccountLogoutRow() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick(): Promise<void> {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logout();
    } catch {
      // Ignored: the refresh below re-reads the session from the server.
    } finally {
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={ROW_CLASS}
    >
      <span className="shrink-0 text-slate-400">
        <LogoutIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1 truncate">
        {pending ? "در حال خروج..." : "خروج از حساب کاربری"}
      </span>
      <ChevronLeftIcon className="size-4 shrink-0 text-slate-400" />
    </button>
  );
}
