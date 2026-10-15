import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/api/types";

/**
 * Vertical category list of the /categories page: one full-width, Digikala-style
 * horizontal row per category (the home page keeps its circular grid, this is a
 * separate component).
 *
 * RTL row: the category image sits first, on the physical right, inside a
 * 64px circle; the name follows next to it and a small gray chevron closes the
 * row on the far left (the end of the line). Rows are separated by thin
 * dividers.
 *
 * Server Component with no client JavaScript: every row is a plain `<Link>`,
 * so navigation is ordinary Next.js routing and no hook or handler is needed.
 * Unlike the home grid, categories without a usable image are still rendered —
 * their circle shows the first letter of the name.
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
 * Target of a category row. This frontend has no dedicated category page and
 * the products list does not accept a category slug, so — exactly like the
 * home category grid — the closest existing destination is the products list
 * of the category's platform.
 */
function categoryHref(platform: string): string {
  return `/products?platform=${encodeURIComponent(platform)}`;
}

/** Shared keyboard-focus ring, identical for every focusable row. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Chevron pointing towards the end of the RTL row (visually left). */
function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0 text-foreground/40"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function CategoryList({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <ul>
      {categories.map((category) => {
        const imageSrc = category.image?.trim() ?? "";
        const showImage = isRenderableImageSrc(imageSrc);
        return (
          <li
            key={category.id}
            className="border-b border-border last:border-b-0"
          >
            <Link
              href={categoryHref(category.platform)}
              className={`group flex h-20 items-center gap-3 ${FOCUS_RING}`}
            >
              {/* Fixed 64px circle; overflow-hidden guarantees the artwork can
                  never spill outside it. */}
              <span className="relative size-16 shrink-0 overflow-hidden rounded-full bg-[#e8e8e8]">
                {showImage ? (
                  <Image
                    src={imageSrc}
                    alt={category.name}
                    fill
                    sizes="64px"
                    quality={75}
                    className="object-contain p-1.5"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-lg font-bold text-foreground/40">
                    {category.name.charAt(0)}
                  </span>
                )}
              </span>

              <span className="min-w-0 flex-1 truncate text-base font-medium text-foreground">
                {category.name}
              </span>

              <ChevronLeftIcon />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
