/**
 * Inline SVG icons of the home discount band.
 *
 * Plain presentational components with no hooks and no browser APIs, so they
 * carry no "use client" directive: the Server Component band and the Client
 * Component carousel both render them.
 */

/** Percent sign: two small circles and one diagonal slash, nothing else. */
export function PercentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
      className="size-14 shrink-0 text-primary-foreground"
    >
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
      <path d="M17 7 7 17" />
    </svg>
  );
}

/** Directional chevron used by the strip arrows and the "view all" link. */
export function ChevronIcon({ direction }: { direction: "left" | "right" }) {
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
      className="size-4"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
