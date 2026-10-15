"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SupportChat } from "./support-chat";

/**
 * Focus ring of the header/footer controls, re-coloured for the widget's
 * indigo surface (the chat header uses the same #6366f1).
 */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Floating support widget: a round launcher pinned to the physical bottom-left
 * corner (never the logical start — the site is RTL) that toggles the chat
 * popup. `SupportChat` is reused untouched, so the thread lives in React state
 * for as long as the visitor keeps the site open; nothing is sent or stored.
 *
 * Positioning notes:
 * - The launcher clears the mobile bottom nav (`h-16`, fixed, z-40, md:hidden)
 *   by adding its height and `env(safe-area-inset-bottom)` to the bottom
 *   offset; from `md` up that bar is gone, so the plain 1.5rem offset is used.
 *   The footer's "back to top" button is an inline (non-fixed) footer control,
 *   so it can never collide with the launcher.
 * - The panel uses z-50 and therefore covers the sticky header and the bottom
 *   nav (both z-40); the launcher stays at z-40, like those bars.
 * - Below `sm` the panel is a full-width, near-full-height sheet that keeps the
 *   launcher's offset: that way the button stays tappable (click it again to
 *   close), the panel never covers the nav and the home indicator, and the
 *   safe-area inset is honoured by the offset itself. From `sm` up it becomes
 *   the 360px panel anchored bottom-left just above the button.
 */
export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  // Escape closes the popup; the listener exists only while it is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Storefront only: the dashboard has its own chrome.
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {open ? (
        <div
          role="dialog"
          aria-label="پشتیبانی"
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+9rem)] z-50 flex h-[85dvh] max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:inset-x-auto sm:left-4 sm:h-[70vh] sm:max-h-[32rem] sm:w-[360px] sm:rounded-3xl md:bottom-24"
        >
          {/* Panel header: the title plus the ✕ that closes the popup. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/20 bg-[#6366f1] px-4 py-2.5 text-white">
            <span className="text-sm font-bold">پشتیبانی</span>
            <button
              type="button"
              onClick={close}
              aria-label="بستن"
              className="flex size-7 items-center justify-center rounded-full text-base leading-none text-white/85 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6366f1]"
            >
              ✕
            </button>
          </div>

          {/* The chat fills whatever height the panel has left. */}
          <div className="min-h-0 flex-1">
            <SupportChat />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label="پشتیبانی"
        aria-expanded={open}
        className={`fixed left-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 flex size-14 items-center justify-center rounded-full bg-[#6366f1] text-white shadow-lg transition-colors hover:bg-[#4f46e5] md:bottom-6 ${FOCUS_RING}`}
      >
        {/* Support headset with a mic boom, same line-art as the footer. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
          className="size-6"
        >
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <rect x="2.5" y="13" width="4" height="6" rx="1.6" />
          <rect x="17.5" y="13" width="4" height="6" rx="1.6" />
          <path className="text-white/60" d="M19.5 19v.4a2.6 2.6 0 0 1-2.6 2.6h-3" />
        </svg>
      </button>
    </>
  );
}
