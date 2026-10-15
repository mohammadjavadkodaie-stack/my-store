"use client";

/**
 * "بازگشت به بالا" (back to top) control of the footer.
 *
 * The footer itself stays a Server Component; this is the single client
 * boundary it renders, because only the click needs the browser. Clicking
 * smooth-scrolls the window to the top — no anchor/hash, so the URL never
 * changes and no history entry is pushed.
 */
export function BackToTop() {
  function handleClick(): void {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-4 text-xs text-foreground/70 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* The chevron sits at the inline-start of the label (visually right in
          the RTL document), so it comes first in the DOM. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className="size-4"
      >
        <path d="m6 15 6-6 6 6" />
      </svg>
      <span>بازگشت به بالا</span>
    </button>
  );
}
