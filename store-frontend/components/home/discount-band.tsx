import Link from "next/link";
import { DiscountBandCarousel } from "@/components/home/discount-band-carousel";
import { DiscountBandCountdown } from "@/components/home/discount-band-countdown";
import { ChevronIcon, PercentIcon } from "@/components/home/discount-band-icons";
import type { DiscountBandSettings, Product } from "@/lib/api/types";

/**
 * Digikala-style discount band of the home page, directly under the platform
 * menu: a theme-primary rounded box whose start side holds the percent icon,
 * the title, the countdown and the "مشاهده همه" link, followed by a horizontally
 * scrolling strip of discounted products.
 *
 * Server Component: it keeps no state of its own. The countdown is the only
 * client piece here (the page passes the two server timestamps down) and the
 * strip's arrows live inside the client carousel.
 */

/**
 * The countdown is shown only when the timer is on and its end is really after
 * the server clock. A disabled, expired or malformed timer yields `null`, i.e.
 * the band renders without a timer.
 */
function liveTimerEndsAt(settings: DiscountBandSettings): string | null {
  if (!settings.timerEnabled || settings.timerEndsAt === null) {
    return null;
  }
  const endsAt = Date.parse(settings.timerEndsAt);
  const serverNow = Date.parse(settings.serverNow);
  if (
    !Number.isFinite(endsAt) ||
    !Number.isFinite(serverNow) ||
    endsAt <= serverNow
  ) {
    return null;
  }
  return settings.timerEndsAt;
}

export function DiscountBand({
  products,
  settings,
}: {
  /** Already filtered to on-sale products that carry a discount percent. */
  products: Product[];
  settings: DiscountBandSettings;
}) {
  if (products.length === 0) {
    return null;
  }

  const timerEndsAt = liveTimerEndsAt(settings);

  return (
    <section aria-label="تخفیف‌های ویژه" className="rounded-2xl bg-primary p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
        {/*
          Start panel: a ~220px column on desktop and a compact wrapping row
          (icon + title + timer + button) above the cards on small screens.
        */}
        <div className="flex flex-wrap items-center gap-3 md:w-[220px] md:shrink-0 md:flex-col md:items-start md:gap-4">
          <PercentIcon />

          <h2 className="text-lg font-extrabold text-primary-foreground sm:text-xl">
            تخفیف‌های ویژه
          </h2>

          {timerEndsAt !== null ? (
            <DiscountBandCountdown
              endsAt={timerEndsAt}
              serverNow={settings.serverNow}
            />
          ) : null}

          <Link
            href="/products?onSale=true&sort=discount"
            className="inline-flex items-center gap-1 rounded-full bg-background px-4 py-2 text-sm font-bold text-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <span>مشاهده همه</span>
            <ChevronIcon direction="left" />
          </Link>
        </div>

        <DiscountBandCarousel products={products} />
      </div>
    </section>
  );
}
