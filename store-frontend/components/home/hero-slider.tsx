"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { HeroSlide } from "@/lib/api/types";
import styles from "./hero-slider.module.css";

/**
 * Home hero: a full-bleed auto-rotating crossfade slider (RTL page).
 *
 * The original slider was driven by Embla Carousel plus its Fade and Autoplay
 * plugins. No package may be added, so the behaviour is re-implemented here
 * with plain React state/effects: stacked slides whose opacity is crossfaded,
 * a looping 5s autoplay that pauses on hover/focus and when the visitor asks
 * for reduced motion, and one progress-bar tab per slide.
 *
 * Data is unchanged from the previous home carousel: the Server Component
 * fetches GET /slides and passes the rows down as `slides`; every entry is run
 * through the same URL guards, and an empty (or fully unusable) list falls back
 * to the built-in static slides. Only the presentation is new.
 */

/** One slide reduced to what the slider renders (URLs already vetted). */
type Slide = {
  id: string;
  /** `null` for a static fallback slide: it shows the plain dark background. */
  imageUrl: string | null;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  /** Internal path only; `null` hides the button. */
  linkPath: string | null;
};

type HeroSliderProps = {
  /**
   * Slides of GET /slides. Optional so the slider keeps working without the
   * prop; an empty (or fully unusable) list falls back to the static slides.
   */
  slides?: readonly HeroSlide[];
};

/**
 * The built-in fallback set (kept from the previous carousel): rendered when
 * the backend has no usable slide, so the home page never loses its hero.
 */
const STATIC_SLIDES: readonly Slide[] = [
  {
    id: "store",
    imageUrl: null,
    title: "فروشگاه کنسول و بازی",
    subtitle:
      "جدیدترین کنسول‌ها و بازی‌ها را با بهترین قیمت و ارسال سریع تهیه کنید.",
    buttonLabel: "مشاهده محصولات",
    linkPath: "/products",
  },
  {
    id: "deals",
    imageUrl: null,
    title: "پیشنهادات شگفت‌انگیز",
    subtitle:
      "روی بازی‌های منتخب تا پایان هفته تخفیف‌های ویژه بگیرید؛ هر روز چند پیشنهاد تازه.",
    buttonLabel: "کالاهای تخفیف‌دار",
    linkPath: "/products?onSale=true&sort=discount",
  },
  {
    id: "consoles",
    imageUrl: null,
    title: "کنسول‌های نسل جدید",
    subtitle:
      "پلی‌استیشن ۵، ایکس‌باکس سری X و نینتندو سوییچ، همراه با لوازم جانبی اصل.",
    buttonLabel: "مشاهده کنسول‌ها",
    linkPath: "/products?platform=PS5",
  },
  {
    id: "shipping",
    imageUrl: null,
    title: "ارسال سریع و پرداخت امن",
    subtitle:
      "سفارش‌ها با بسته‌بندی مطمئن به سراسر ایران ارسال می‌شوند و پشتیبانی همراه شماست.",
    buttonLabel: "شروع خرید",
    linkPath: "/products?sort=newest",
  },
];

/** Delay between two automatic slides; also drives the tab fill animation. */
const DELAY_MS = 5000;

/** The backend refuses an 11th slide, so the slider never renders more. */
const MAX_SLIDES = 10;

/**
 * Only a same-origin path ("/x", but not the protocol-relative "//host") or an
 * absolute https URL may reach an <img> src: data:, javascript:, http: and
 * anything else are refused, so a hostile value never becomes an image source.
 */
function isSafeImageUrl(src: string): boolean {
  return (
    (src.startsWith("/") && !src.startsWith("//")) || src.startsWith("https://")
  );
}

/** Only a same-origin path may become a href; anything else hides the button. */
function isSafeLinkPath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/** Reduces one backend slide; `null` when its image URL may not be rendered. */
function toSlide(slide: HeroSlide): Slide | null {
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

export function HeroSlider({ slides = [] }: HeroSliderProps) {
  // Unsafe entries are dropped here, so an empty result means "no usable
  // backend slide" and the built-in static slides are rendered instead.
  const usableSlides = slides
    .slice(0, MAX_SLIDES)
    .map(toSlide)
    .filter((slide): slide is Slide => slide !== null);
  const items = usableSlides.length > 0 ? usableSlides : STATIC_SLIDES;
  const slideCount = items.length;

  const [index, setIndex] = useState(0);
  /** Hovering/focusing the hero stops the rotation so links stay reachable. */
  const [paused, setPaused] = useState(false);
  /** `prefers-reduced-motion: reduce` disables autoplay entirely. */
  const [reduceMotion, setReduceMotion] = useState(false);

  // A prop change (e.g. a shorter list) must never leave the index out of range.
  const activeIndex = slideCount === 0 ? 0 : index % slideCount;

  const goTo = useCallback(
    (next: number) => {
      if (slideCount === 0) {
        return;
      }
      setIndex(((next % slideCount) + slideCount) % slideCount);
    },
    [slideCount],
  );

  // Match the media query once on mount and follow it if it changes.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Autoplay: the interval is the timer, the paused flag is its switch.
  useEffect(() => {
    if (paused || reduceMotion || slideCount <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, DELAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slideCount]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="پیشنهادهای فروشگاه"
      className={`${styles.root} ${paused || reduceMotion ? styles.paused : ""}`}
      style={{ "--hero-slider-delay": `${DELAY_MS}ms` } as CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={styles.viewport}>
        <div className={styles.container}>
          {items.map((slide, slideIndex) => {
            const isActive = slideIndex === activeIndex;
            return (
              <article
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${slideIndex + 1} از ${slideCount}`}
                aria-hidden={!isActive}
                className={`${styles.slide} ${isActive ? styles.slideActive : ""}`}
              >
                {slide.imageUrl !== null ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- slide images come from arbitrary backend hosts, so a plain img is used instead of next/image */
                  <img
                    src={slide.imageUrl}
                    alt=""
                    loading={slideIndex === 0 ? "eager" : "lazy"}
                    referrerPolicy="no-referrer"
                  />
                ) : null}

                {slide.title !== null || slide.subtitle !== null ? (
                  <div className={styles.copy}>
                    {slide.title !== null ? <h2>{slide.title}</h2> : null}
                    {slide.subtitle !== null ? <p>{slide.subtitle}</p> : null}
                  </div>
                ) : null}

                {/* Physical bottom-right corner (not start/end) as designed. */}
                {slide.buttonLabel !== null && slide.linkPath !== null ? (
                  <Link
                    href={slide.linkPath}
                    tabIndex={isActive ? 0 : -1}
                    className={styles.cta}
                  >
                    {slide.buttonLabel}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <div className={styles.nav} role="tablist" aria-label="انتخاب اسلاید">
        {items.map((slide, slideIndex) => {
          const isActive = slideIndex === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`نمایش اسلاید ${slideIndex + 1}`}
              onClick={() => goTo(slideIndex)}
              className={styles.navButton}
            >
              {/* Remounting on a new selection restarts the CSS fill. */}
              {isActive ? (
                <span key={activeIndex} className={styles.navFill} />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
