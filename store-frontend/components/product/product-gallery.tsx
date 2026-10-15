"use client";

import { useState } from "react";

type ProductGalleryProps = {
  images: string[];
  name: string;
};

/**
 * Only a root-relative path (a single leading "/", never "//") or an https URL
 * is rendered. Any other backend value (empty, data:, javascript:, http://, ...)
 * is skipped, so it never reaches the <img> src.
 */
function isRenderableImageSrc(src: string): boolean {
  const value = src.trim();
  if (value.startsWith("//")) {
    return false;
  }
  return value.startsWith("/") || value.startsWith("https://");
}

const NAV_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const THUMB_CLASS =
  "size-16 shrink-0 overflow-hidden rounded-lg border bg-background transition-opacity";

/** The selected thumbnail is marked with a primary-colored border. */
const THUMB_ACTIVE_CLASS = "border-primary";

const THUMB_IDLE_CLASS = "border-border opacity-70 hover:opacity-100";

/** Chevron pointing to the physical right: the previous image on this RTL page. */
function ChevronRight() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** Chevron pointing to the physical left: the next image on this RTL page. */
function ChevronLeft() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/**
 * Product detail gallery: one big main image plus a thumbnail strip.
 *
 * The main image keeps a square frame (`object-contain`, rounded, bordered) and
 * the strip is always a horizontal, scrollable row of same-size square
 * thumbnails directly below it, on every breakpoint. The selected thumbnail is
 * marked with a primary-colored border. One image (or none) renders no
 * controls; the caller keeps its own placeholder for the empty case.
 */
export function ProductGallery({ images, name }: ProductGalleryProps) {
  const sources = images.map((src) => src.trim()).filter(isRenderableImageSrc);
  const [index, setIndex] = useState(0);
  // A shorter list (or a recycled component instance) must never leave the index
  // out of range; the caller resets it with a key when the product changes.
  const safeIndex = index < sources.length ? index : 0;

  if (sources.length === 0) {
    return null;
  }

  function showImage(next: number): void {
    const count = sources.length;
    setIndex(((next % count) + count) % count);
  }

  const currentSrc = sources[safeIndex] ?? sources[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element -- product images live on arbitrary backend hosts, so a plain img is used instead of next/image */}
        <img
          src={currentSrc}
          alt={name}
          loading={safeIndex === 0 ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain"
        />

        {sources.length > 1 && (
          // RTL page: the first button of this row sits on the physical right
          // (previous image), the second one on the physical left (next image).
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => showImage(safeIndex - 1)}
              aria-label="تصویر قبلی"
              className={NAV_BUTTON_CLASS}
            >
              <ChevronRight />
            </button>
            <button
              type="button"
              onClick={() => showImage(safeIndex + 1)}
              aria-label="تصویر بعدی"
              className={NAV_BUTTON_CLASS}
            >
              <ChevronLeft />
            </button>
          </div>
        )}
      </div>

      {sources.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sources.map((src, thumbIndex) => (
            <button
              key={`${thumbIndex}-${src}`}
              type="button"
              onClick={() => showImage(thumbIndex)}
              aria-label={`نمایش تصویر ${thumbIndex + 1}`}
              aria-current={thumbIndex === safeIndex ? "true" : undefined}
              className={`${THUMB_CLASS} ${
                thumbIndex === safeIndex ? THUMB_ACTIVE_CLASS : THUMB_IDLE_CLASS
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- product images live on arbitrary backend hosts, so a plain img is used instead of next/image */}
              <img
                src={src}
                alt={name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
