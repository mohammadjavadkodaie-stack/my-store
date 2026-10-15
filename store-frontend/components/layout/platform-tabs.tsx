"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { Platform } from "@/lib/api/types";

/**
 * Platform menu: a Digikala-style single row of evenly spaced items, each a
 * circular icon with its label underneath.
 *
 * A Client Component on purpose: it reads `?platform=` from the current URL with
 * useSearchParams so the matching item can be highlighted. Clicking an item is a
 * plain navigation to `/products?platform=<value>` — no JS is involved in the
 * filtering itself, the row only reacts to the resulting URL.
 *
 * `PlatformTabsRow` is the pure presentational part (no hooks), so the home page
 * can also render it as the Suspense fallback of `PlatformTabs`.
 */

/** A single platform item: backend enum value, display label and its icon. */
interface PlatformTab {
  value: Platform;
  label: string;
  /** Omitted items fall back to a neutral circle with the label's first letter. */
  icon?: () => ReactNode;
}

/**
 * Generic line-art icons: original shapes evocative of each platform (a console
 * silhouette, a handheld, ...). No official PlayStation/Xbox/Nintendo logo or
 * trademarked artwork is reproduced.
 */
function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="size-6"
    >
      {children}
    </svg>
  );
}

/** Upright console body with a disc slot and a power dot. */
function ConsoleIcon() {
  return (
    <IconFrame>
      <rect x="7" y="2.5" width="10" height="19" rx="3" />
      <path d="M10 6.5h4" />
      <circle cx="12" cy="17.5" r="1" />
    </IconFrame>
  );
}

/** Flat console with a front disc slot. */
function FlatConsoleIcon() {
  return (
    <IconFrame>
      <rect x="2.5" y="7.5" width="19" height="9" rx="2.5" />
      <path d="M6.5 10.5h11" />
      <circle cx="12" cy="14" r="1" />
    </IconFrame>
  );
}

/** Older console with a curved top and a single front button. */
function RetroConsoleIcon() {
  return (
    <IconFrame>
      <rect x="3" y="9.5" width="18" height="7" rx="3.5" />
      <path d="M8 9.5c0-3 8-3 8 0" />
      <circle cx="8" cy="13" r="1" />
    </IconFrame>
  );
}

/** Handheld: a screen between two detachable side controllers. */
function HandheldIcon() {
  return (
    <IconFrame>
      <rect x="8.5" y="3" width="7" height="18" rx="1.5" />
      <rect x="3" y="4" width="4" height="16" rx="2" />
      <rect x="17" y="4" width="4" height="16" rx="2" />
    </IconFrame>
  );
}

/** Box-shaped console with a large vent and two ports. */
function BoxConsoleIcon() {
  return (
    <IconFrame>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="9" cy="12" r="2.5" />
      <path d="M15 10h4M15 14h4" />
    </IconFrame>
  );
}

/**
 * The five items, in display order. The row is RTL, so the first entry (PS5)
 * renders rightmost. Each item filters the products list by that single
 * platform value.
 *
 * The labels are deliberately Latin ("PS5", "Switch", ...) even though the rest
 * of the site is Persian — the platform names are brand-style abbreviations,
 * not translatable copy.
 */
const PLATFORM_TABS: readonly PlatformTab[] = [
  { value: "PS5", label: "PS5", icon: ConsoleIcon },
  { value: "PS4", label: "PS4", icon: FlatConsoleIcon },
  { value: "PS3", label: "PS3", icon: RetroConsoleIcon },
  { value: "SWITCH", label: "Switch", icon: HandheldIcon },
  { value: "XBOX_ONE", label: "Xbox One", icon: BoxConsoleIcon },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Circle of an item. Below `sm` it is as wide as its column (capped at 56px), so
 * five items always fit the narrowest phone; from `sm` up it is the original
 * fixed 56px circle.
 */
const CIRCLE_CLASS =
  "flex aspect-square w-full max-w-14 items-center justify-center rounded-full transition-colors sm:aspect-auto sm:h-14 sm:w-14 sm:max-w-none";
const ACTIVE_CIRCLE_CLASS = "bg-primary text-primary-foreground";
const INACTIVE_CIRCLE_CLASS =
  "bg-[#f0f0f1] text-foreground/70 group-hover:bg-foreground/10";

/**
 * The row itself: hook-free, so it renders both inside the client
 * `PlatformTabs` below and as its Suspense fallback on the home page (with
 * `activePlatform` null, i.e. no highlighted item).
 */
export function PlatformTabsRow({
  activePlatform,
}: {
  activePlatform: string | null;
}) {
  return (
    <nav aria-label="پلتفرم‌ها" className="border-b border-border bg-background">
      {/*
        One evenly spaced row that always fits the viewport:
        - below `sm` the list is a five-column grid, so every item takes an equal
          share of the width and the last one is never cut off (320px and up);
        - from `sm` up it is the original centered shrink-to-fit row (w-max),
          which is pixel-identical to the previous layout.

        `min-w-0` on the list, the items and their boxes is what lets a column
        shrink below its content size instead of widening the page.
      */}
      <ul className="mx-auto grid w-full min-w-0 grid-cols-5 gap-x-1 px-4 py-4 sm:flex sm:w-max sm:items-start sm:gap-10">
        {PLATFORM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePlatform === tab.value;
          return (
            <li key={tab.value} className="min-w-0 sm:shrink-0">
              <Link
                href={`/products?platform=${tab.value}`}
                aria-current={isActive ? "page" : undefined}
                className={`group flex w-full min-w-0 flex-col items-center gap-2 sm:w-20 ${FOCUS_RING}`}
              >
                <span
                  className={`${CIRCLE_CLASS} ${
                    isActive ? ACTIVE_CIRCLE_CLASS : INACTIVE_CIRCLE_CLASS
                  }`}
                >
                  {Icon ? (
                    <Icon />
                  ) : (
                    <span className="text-lg font-bold">
                      {tab.label.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="w-full min-w-0 truncate text-center text-xs font-medium text-foreground sm:w-auto">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function PlatformTabs() {
  const searchParams = useSearchParams();
  return <PlatformTabsRow activePlatform={searchParams.get("platform")} />;
}
