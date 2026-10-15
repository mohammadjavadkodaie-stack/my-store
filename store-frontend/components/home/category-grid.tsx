import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/api/types";

/**
 * Digikala-style category row of the home page, directly below the discount
 * band (or below the platform menu when the band is hidden): a responsive grid
 * of circular category thumbnails with the category name underneath.
 *
 * Server Component with no client JavaScript: every item is a plain
 * `<Link>`, so navigation is ordinary Next.js routing and no hook or handler is
 * needed here.
 *
 * Only categories that carry an image are rendered, in the exact order the
 * backend returned them (GET /categories already filters to active rows and
 * orders them by sortOrder then id). A category whose `image` is missing or not
 * a usable URL falls back to a neutral circle holding the first letter of its
 * name, and an empty list renders nothing at all.
 */

/**
 * The only values safe to hand to next/image: a root-relative path (the
 * backend's own upload URLs, e.g. "/api/uploads/<name>") or an http(s) URL.
 * Anything else (empty string, data:, javascript:, ...) is skipped.
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://")
  );
}

/**
 * Target of a category item. This frontend has no dedicated category page and
 * the products list does not accept a category slug, so — exactly like the
 * slide form's category link — the closest existing destination is the products
 * list of the category's platform.
 */
function categoryHref(platform: string): string {
  return `/products?platform=${encodeURIComponent(platform)}`;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  // Only categories with an image set in the admin panel are shown; the public
  // endpoint already returns just the active ones, in backend order.
  const items = categories.filter(
    (category) =>
      typeof category.image === "string" && category.image.trim().length > 0,
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section
      // The <h2> below stays the accessible name of the section.
      aria-labelledby="home-categories-heading"
      className="flex flex-col gap-4"
    >
      <h2 id="home-categories-heading" className="text-xl font-bold text-foreground">
        دسته‌بندی‌ها
      </h2>

      {/* RTL single row: one column per category, so the strip always fits the
          page container with no horizontal scrolling at any viewport (320px and
          up). `auto-cols-fr` is `minmax(0, 1fr)` per column, which lets every
          column shrink below its content size and keeps the strip inside the
          container padding; the circle is capped to its column width below `md`
          for the same reason. The top padding is deliberately kept: every
          thumbnail overflows above its circle (Digikala-style "pop out"), so it
          must never touch the heading. */}
      <ul className="grid w-full min-w-0 grid-flow-col auto-cols-fr gap-x-1 pt-8 md:gap-x-4">
        {items.map((category) => {
          const imageSrc = category.image?.trim() ?? "";
          const showImage = isRenderableImageSrc(imageSrc);
          return (
            <li key={category.id} className="min-w-0">
              <Link
                href={categoryHref(category.platform)}
                className="group flex w-full min-w-0 flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {/* The wrapper keeps the circle's responsive footprint: it fills
                    its column below `md` (capped at 48px, so a very narrow phone
                    with many categories can never push the row off screen) and
                    is the fixed 64px circle from `md` up. It is deliberately NOT
                    clipped, so the image layer may grow above it. */}
                <span className="relative mx-auto aspect-square w-full max-w-12 md:h-16 md:w-16 md:max-w-none">
                  {/* Circle background: a separate layer painted behind the
                      artwork so the image can escape the circle's bounds. */}
                  <span className="absolute inset-0 rounded-full border border-[#f0f0f1] bg-[#e8e8e8]" />

                  {showImage ? (
                    /* Image layer: bottom-anchored and larger than the circle
                       (120% x 130%), so the top of the artwork rises clearly
                       above the circle while its base stays put. Hover scales
                       only this layer; the circle stays still. */
                    <span className="absolute bottom-0 left-1/2 h-[130%] w-[120%] -translate-x-1/2 origin-bottom transition-transform duration-300 ease-out group-hover:scale-110">
                      <Image
                        src={imageSrc}
                        alt={category.name}
                        fill
                        sizes="(min-width: 768px) 77px, 58px"
                        quality={75}
                        className="object-contain object-bottom drop-shadow-md"
                      />
                    </span>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground/40 md:text-base">
                      {category.name.charAt(0)}
                    </span>
                  )}
                </span>
                <span className="mt-2 w-full min-w-0 truncate text-center text-[11px] font-medium text-foreground md:mt-3 md:text-sm">
                  {category.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
