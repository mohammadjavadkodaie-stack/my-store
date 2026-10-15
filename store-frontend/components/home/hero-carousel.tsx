"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/api/types";

/**
 * Home hero: an auto-rotating promotional carousel (RTL).
 *
 * Client Component because the rotation and the prev/next buttons are local
 * state; nothing is stored and no request is made here — the Server Component
 * fetches GET /slides and passes the result down as `slides`.
 *
 * When that list is empty (backend down, no active slide) or every entry is
 * unusable, the built-in static slides are rendered exactly as before: the
 * first one reuses the copy of the previous static hero block, the other ones
 * are placeholders.
 */

/** One entry of the built-in fallback set. */
type StaticSlide = {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

/** A backend slide reduced to what the carousel renders (URLs already vetted). */
type BackendSlide = {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  linkPath: string | null;
};

type HeroCarouselProps = {
  /**
   * Slides of GET /slides. Optional so the carousel keeps working without the
   * prop; an empty (or fully unusable) list falls back to the static slides.
   */
  slides?: readonly HeroSlide[];
};

const STATIC_SLIDES: readonly StaticSlide[] = [
  {
    id: "store",
    title: "فروشگاه کنسول و بازی",
    description:
      "جدیدترین کنسول‌ها و بازی‌ها را با بهترین قیمت و ارسال سریع تهیه کنید.",
    ctaLabel: "مشاهده محصولات",
    ctaHref: "/products",
  },
  {
    id: "deals",
    title: "پیشنهادات شگفت‌انگیز",
    description:
      "روی بازی‌های منتخب تا پایان هفته تخفیف‌های ویژه بگیرید؛ هر روز چند پیشنهاد تازه.",
    ctaLabel: "کالاهای تخفیف‌دار",
    ctaHref: "/products?onSale=true&sort=discount",
  },
  {
    id: "consoles",
    title: "کنسول‌های نسل جدید",
    description:
      "پلی‌استیشن ۵، ایکس‌باکس سری X و نینتندو سوییچ، همراه با لوازم جانبی اصل.",
    ctaLabel: "مشاهده کنسول‌ها",
    ctaHref: "/products?platform=PS5",
  },
  {
    id: "shipping",
    title: "ارسال سریع و پرداخت امن",
    description:
      "سفارش‌ها با بسته‌بندی مطمئن به سراسر ایران ارسال می‌شوند و پشتیبانی همراه شماست.",
    ctaLabel: "شروع خرید",
    ctaHref: "/products?sort=newest",
  },
];

/** Delay between two automatic slides. */
const ROTATION_INTERVAL_MS = 4500;

const ARROW_CLASS =
  "inline-flex size-9 items-center justify-center rounded-full bg-primary-foreground/15 text-lg leading-none text-primary-foreground transition-colors hover:bg-primary-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

/**
 * Shared pill button styling. The CTA of a static slide adds its own margin,
 * the button of a backend slide is pinned to the corner instead.
 */
const CTA_BASE_CLASS =
  "inline-flex items-center justify-center rounded-full bg-primary-foreground px-6 py-2.5 text-sm font-extrabold text-primary transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

const CTA_CLASS = `mt-2 ${CTA_BASE_CLASS}`;

/**
 * Only a same-origin path ("/x", but not the protocol-relative "//host") or an
 * absolute https URL may reach an <img> src: data:, javascript:, http: and
 * anything else are refused, so a hostile value never becomes an image source.
 */
function isSafeImageUrl(src: string): boolean {
  return (
    (src.startsWith("/") && !src.startsWith("//")) ||
    src.startsWith("https://")
  );
}

/** Only a same-origin path may become a href; anything else hides the button. */
function isSafeLinkPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Reduces one backend slide; `null` when its image URL may not be rendered. */
function toBackendSlide(slide: HeroSlide): BackendSlide | null {
  const imageUrl = slide.imageUrl.trim();
  if (!isSafeImageUrl(imageUrl)) {
    return null;
  }
  const linkPath = slide.linkPath?.trim() ?? "";
  return {
    id: `slide-${slide.id}`,
    imageUrl,
    title: slide.title ?? null,
    subtitle: slide.subtitle ?? null,
    buttonLabel: slide.buttonLabel ?? null,
    linkPath: isSafeLinkPath(linkPath) ? linkPath : null,
  };
}

/** Dot styling shared by both variants; only the active dot is filled. */
function dotClass(isActive: boolean): string {
  return `size-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary ${
    isActive
      ? "bg-primary-foreground"
      : "bg-primary-foreground/40 hover:bg-primary-foreground/70"
  }`;
}

export function HeroCarousel({ slides = [] }: HeroCarouselProps) {
  // Unsafe entries are dropped here, so an empty result means "no usable
  // backend slide" and the built-in static slides are rendered instead.
  // backend slide" and the built-in static slides are rendered instead.
  const backendSlides = slides
    .map(toBackendSlide)
    .filter((slide): slide is BackendSlide => slide !== null);
  const usesBackendSlides = backendSlides.length > 0;
  const slideCount = usesBackendSlides
    ? backendSlides.length
    : STATIC_SLIDES.length;

  const [index, setIndex] = useState(0);
  /** Hovering/focusing the hero stops the rotation so links stay reachable. */
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  // A prop change (e.g. a shorter list) must never leave the index out of range.
  const activeIndex = index % slideCount;

  useEffect(() => {
    if (paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, slideCount]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="پیشنهادهای فروشگاه"
      className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* RTL: `start-*` puts the arrow column on the right-hand side. */}
      <div className="absolute start-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="اسلاید قبلی"
          className={ARROW_CLASS}
        >
          <span aria-hidden="true">›</span>
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="اسلاید بعدی"
          className={ARROW_CLASS}
        >
          <span aria-hidden="true">‹</span>
        </button>
      </div>

      <div aria-live="polite">
        {usesBackendSlides
          ? backendSlides.map((slide, slideIndex) => (
              <article
                key={slide.id}
                aria-hidden={slideIndex !== activeIndex}
                className={
                  slideIndex === activeIndex
                    ? "relative isolate flex min-h-[20rem] flex-col items-center justify-center gap-4 px-14 py-12 text-center sm:min-h-[24rem] sm:py-16"
                    : "hidden"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- slide images come from arbitrary backend hosts, so a plain img is used instead of next/image */}
                <img
                  src={slide.imageUrl}
                  alt=""
                  loading={slideIndex === 0 ? "eager" : "lazy"}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 -z-10 h-full w-full object-cover"
                />
                {/* Keeps the copy readable on top of an arbitrary photo. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/35 to-transparent"
                />

                {slide.title !== null || slide.subtitle !== null ? (
                  <div className="flex flex-col items-center gap-3">
                    {slide.title !== null ? (
                      <h1 className="text-2xl font-black leading-relaxed sm:text-4xl">
                        {slide.title}
                      </h1>
                    ) : null}
                    {slide.subtitle !== null ? (
                      <p className="max-w-xl text-sm leading-7 opacity-90 sm:text-base">
                        {slide.subtitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Physical bottom-right corner (not start/end) as designed. */}
                {slide.buttonLabel !== null && slide.linkPath !== null ? (
                  <Link
                    href={slide.linkPath}
                    className={`${CTA_BASE_CLASS} absolute right-4 bottom-4 z-10`}
                  >
                    {slide.buttonLabel}
                  </Link>
                ) : null}
              </article>
            ))
          : STATIC_SLIDES.map((slide, slideIndex) => (
              <article
                key={slide.id}
                aria-hidden={slideIndex !== activeIndex}
                className={
                  slideIndex === activeIndex
                    ? "flex flex-col items-center gap-4 px-14 py-12 text-center sm:py-16"
                    : "hidden"
                }
              >
                <h1 className="text-2xl font-black leading-relaxed sm:text-4xl">
                  {slide.title}
                </h1>
                <p className="max-w-xl text-sm leading-7 opacity-90 sm:text-base">
                  {slide.description}
                </p>
                <Link href={slide.ctaHref} className={CTA_CLASS}>
                  {slide.ctaLabel}
                </Link>
              </article>
            ))}
      </div>

      <div className="flex items-center justify-center gap-2 pb-5">
        {usesBackendSlides
          ? backendSlides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(slideIndex)}
                aria-label={`نمایش اسلاید ${slideIndex + 1}`}
                aria-current={slideIndex === activeIndex ? "true" : undefined}
                className={dotClass(slideIndex === activeIndex)}
              />
            ))
          : STATIC_SLIDES.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(slideIndex)}
                aria-label={`نمایش اسلاید ${slide.title}`}
                aria-current={slideIndex === activeIndex ? "true" : undefined}
                className={dotClass(slideIndex === activeIndex)}
              />
            ))}
      </div>
    </section>
  );
}
