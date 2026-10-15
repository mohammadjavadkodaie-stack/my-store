import { SiteStatusToggle } from "./site-status-toggle";

/**
 * Thin owner-only banner shown while the site is stopped (see app/layout.tsx:
 * it is rendered only for a visitor whose backend session reports
 * `isOwner: true` *and* whose site status is off).
 *
 * It carries the status text and the one-click way back ON, so the owner does
 * not have to open a menu to reopen the store. No links, no details: while the
 * site is stopped everybody else is already seeing the maintenance page.
 */

/** Shared keyboard-focus ring, identical to the other small controls. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteStatusBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-amber-900">
        <p className="min-w-0 truncate font-bold">سایت برای بقیه خاموش است</p>
        <SiteStatusToggle
          // The server already read the status to render this banner.
          knownEnabled={false}
          className={`inline-flex shrink-0 items-center rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-bold text-amber-900 transition-colors hover:bg-amber-100 ${FOCUS_RING}`}
        />
      </div>
    </div>
  );
}
