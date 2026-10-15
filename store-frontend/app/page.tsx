import { Suspense } from "react";
import { CategoryGrid } from "@/components/home/category-grid";
import { DiscountBand } from "@/components/home/discount-band";
import { HeroSlider } from "@/components/home/hero-slider";
import { ProductSection } from "@/components/home/product-section";
import PlatformTabs, {
  PlatformTabsRow,
} from "@/components/layout/platform-tabs";
import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import {
  getDiscountBandSettings,
  getHeroSlides,
  serverFetch,
} from "@/lib/api/server";
import type { Category, Product, ProductQuery } from "@/lib/api/types";

/**
 * Fetches the products of a single home section.
 *
 * Home sections are best-effort: a failing call — an ApiError for non-2xx
 * responses or a network-level failure — degrades to an empty list so the
 * rest of the page still renders. Error details never reach the UI.
 */
async function fetchSectionProducts(query: ProductQuery): Promise<Product[]> {
  try {
    const { items } = await getProducts(query, serverFetch);
    return items;
  } catch {
    return [];
  }
}

/**
 * Fetches the home category row, best-effort like the product sections: the
 * public GET /categories already returns only active categories in backend
 * order, so the payload is used as-is. A failure degrades to an empty list and
 * the row renders nothing. The backend caps `limit` at 50, the largest page
 * that still fits one request.
 */
async function fetchHomeCategories(): Promise<Category[]> {
  try {
    const { items } = await getCategories({ limit: 50 }, serverFetch);
    return items;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  // The hero slides come from the backend too (GET /slides, uncached so an
  // admin edit shows up immediately). An empty list — or one whose slides are
  // all unusable — makes the carousel fall back to its built-in slides.
  const [
    heroSlides,
    discountBand,
    categories,
    onSaleProducts,
    featuredProducts,
    newestProducts,
  ] = await Promise.all([
    getHeroSlides(),
    getDiscountBandSettings(),
    fetchHomeCategories(),
    fetchSectionProducts({ onSale: "true", sort: "discount", limit: 10 }),
    fetchSectionProducts({ featured: "true", limit: 8 }),
    fetchSectionProducts({ sort: "newest", limit: 8 }),
  ]);

  // The deals row is discount-only: an on-sale flag without a discount percent
  // is dropped so every item in the row really carries a badge.
  const dealProducts = onSaleProducts.filter(
    (product) => product.discountPercent > 0,
  );

  // The band renders only when it is enabled and there is a discounted product
  // to fill it; the remaining rows then decide whether the page has content.
  const showDiscountBand = discountBand.bandEnabled && dealProducts.length > 0;

  const hasAnyProduct =
    showDiscountBand ||
    featuredProducts.length > 0 ||
    newestProducts.length > 0;

  return (
    <>
      {/* Full-bleed hero: edge to edge (outside the site container) and the
          very first thing under the header. */}
      <HeroSlider slides={heroSlides} />

      {/* Platform menu, Digikala-style circles, directly below the hero. It
          reads ?platform= from the URL, so it suspends on useSearchParams and
          needs a boundary here; the fallback is the same row with nothing
          highlighted. */}
      <Suspense fallback={<PlatformTabsRow activePlatform={null} />}>
        <PlatformTabs />
      </Suspense>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:py-12">
        {/* The discount band leads the container, so the category row below it
            sits directly under the band — and directly under the platform menu
            when the band is hidden. */}
        {showDiscountBand ? (
          <DiscountBand products={dealProducts} settings={discountBand} />
        ) : null}

        <CategoryGrid categories={categories} />

        {hasAnyProduct ? (
          <>
            <ProductSection
              title="محصولات ویژه"
              href="/products?featured=true"
              products={featuredProducts}
              layout="grid"
            />
            <ProductSection
              title="جدیدترین‌ها"
              href="/products?sort=newest"
              products={newestProducts}
              layout="grid"
            />
          </>
        ) : (
          <section className="rounded-2xl border border-border bg-background px-6 py-16 text-center">
            <p className="text-base font-bold text-foreground">
              فعلاً محصولی برای نمایش وجود ندارد؛ کمی بعد دوباره سر بزنید!
            </p>
          </section>
        )}
      </div>
    </>
  );
}

