"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronIcon } from "@/components/home/discount-band-icons";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Product } from "@/lib/api/types";

/**
 * Product strip of the home discount band.
 *
 * A Client Component only because of the desktop arrows: the strip itself is
 * plain CSS scroll-snap (swipeable, with a hidden scrollbar) and each arrow
 * scrolls the track by exactly one card. No data is fetched here — the Server
 * Component passes the discounted products down.
 */

/** Scroll direction; the list is RTL, so "next" walks visually to the left. */
type ScrollDirection = "prev" | "next";

/** One card: a fixed width, a snap point and a share of the row's height. */
const CARD_CLASS = "w-36 shrink-0 snap-start sm:w-40 md:w-44";

/** Circular white arrow, desktop only, pinned to a vertical edge of the strip. */
const ARROW_CLASS =
  "absolute top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background text-foreground shadow-md transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary md:flex";

/**
 * Only http(s) and root-relative image URLs are rendered; any other value falls
 * back to the neutral placeholder box (the same guard the shared ProductCard
 * uses).
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

/**
 * One white card: image, a discount badge, a two-line name, the old price
 * struck through and the bold current price with a small "تومان".
 */
function DiscountBandCard({ product }: { product: Product }) {
  const imageSrc = product.images[0]?.trim() ?? "";
  const showImage = imageSrc.length > 0 && isRenderableImageSrc(imageSrc);

  return (
    <Link
      href={`/products/${encodeURIComponent(product.slug)}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl bg-background transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-primary/5">
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- product images come from arbitrary backend hosts, so a plain img is used instead of next/image
          <img
            src={imageSrc}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-foreground/40">
            بدون تصویر
          </div>
        )}

        <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
          {formatPercent(product.discountPercent)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground">
          {product.name}
        </h3>

        <div className="mt-auto flex flex-col items-end gap-0.5">
          {product.compareAtPrice !== null && (
            <s className="text-xs text-foreground/50">
              {formatNumber(product.compareAtPrice)}
            </s>
          )}
          <span className="flex items-baseline gap-1 text-foreground">
            <span className="text-base font-extrabold">
              {formatNumber(product.price)}
            </span>
            <span className="text-xs font-medium">تومان</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Width of one card plus the gap to the next, measured from the DOM. */
function cardStep(track: HTMLElement): number {
  const first = track.firstElementChild;
  const second = first?.nextElementSibling;
  if (first instanceof HTMLElement && second instanceof HTMLElement) {
    return Math.abs(
      second.getBoundingClientRect().left - first.getBoundingClientRect().left,
    );
  }
  if (first instanceof HTMLElement) {
    return first.getBoundingClientRect().width;
  }
  return track.clientWidth;
}

export function DiscountBandCarousel({ products }: { products: Product[] }) {
  const trackRef = useRef<HTMLUListElement>(null);

  function scrollByCard(direction: ScrollDirection): void {
    const track = trackRef.current;
    if (track === null) {
      return;
    }
    const step = cardStep(track);
    // The page is RTL: moving toward the end of the list lowers scrollLeft
    // (toward negative), so "next" subtracts a step and "prev" adds one.
    const delta = direction === "next" ? -step : step;
    track.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <li key={product.slug} className={CARD_CLASS}>
            <DiscountBandCard product={product} />
          </li>
        ))}
      </ul>

      {/* Start side of the RTL strip is the right edge, where "prev" belongs. */}
      <button
        type="button"
        onClick={() => scrollByCard("prev")}
        aria-label="محصولات قبلی"
        className={`${ARROW_CLASS} start-2`}
      >
        <ChevronIcon direction="right" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard("next")}
        aria-label="محصولات بعدی"
        className={`${ARROW_CLASS} end-2`}
      >
        <ChevronIcon direction="left" />
      </button>
    </div>
  );
}
