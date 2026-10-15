import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isApiError } from "@/lib/api/error";
import { getProduct } from "@/lib/api/products";
import { serverFetch } from "@/lib/api/server";
import type { ProductDetail } from "@/lib/api/types";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { PLATFORM_LABELS, isPlatform } from "@/lib/platforms";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { LowStockNotice } from "@/components/product/low-stock-notice";
import { ProductGallery } from "@/components/product/product-gallery";

type ProductPageProps = {
  /** Next.js 16 passes route params as a Promise that must be awaited. */
  params: Promise<{ slug: string }>;
};

/** Longest slug the backend can issue; anything longer is rejected before any call. */
const MAX_SLUG_LENGTH = 120;

/** Persian digits for the detail numbers that have no shared formatter. */
const faNumber = new Intl.NumberFormat("fa-IR");

/** Used for a not-found slug and for any other backend failure alike. */
const FALLBACK_METADATA: Metadata = { title: "محصول" };

/**
 * Turns the raw route segment into a slug that is safe to send to the backend.
 *
 * The segment normally arrives already percent-decoded; decoding defensively
 * (and keeping the raw value when the escape sequence is malformed) makes sure
 * an invalid value can never throw here. Empty, over-long or path-like segments
 * return null so the caller can answer with notFound() without a backend call:
 * a "/" or "\" inside the slug would otherwise change the requested URL.
 */
function normalizeSlug(raw: string): string | null {
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // Malformed percent-encoding: the raw value is validated below instead.
  }

  const trimmed = slug.trim();
  const isPathLike = trimmed.includes("/") || trimmed.includes("\\");
  if (trimmed.length === 0 || trimmed.length > MAX_SLUG_LENGTH || isPathLike) {
    return null;
  }
  return trimmed;
}

/**
 * Same whitelist as the product card: only http(s) and root-relative sources are
 * rendered, so values such as data: or javascript: never reach the <img> src.
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

/**
 * Friendly fallback for backend failures that are not a 404 (outage, 5xx, ...).
 * The real error is never rendered nor logged; only this generic text is shown.
 */
function ProductLoadError() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-16 sm:py-24">
      <div
        role="alert"
        className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 px-6 py-8 text-center"
      >
        <p className="text-base font-bold leading-7 text-foreground">
          دریافت اطلاعات این محصول ممکن نشد. لطفاً کمی بعد دوباره تلاش کنید.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          بازگشت به فهرست محصولات
        </Link>
      </div>
    </div>
  );
}

/**
 * Price block shared by the desktop buy card and the mobile buy bar: the
 * primary percent badge with the struck-through old price above the final
 * price (both only when the product is discounted), the number in bold with a
 * small «تومان» suffix. Out-of-stock products never render this block — the
 * callers show the red «ناموجود» message instead.
 */
function PriceBlock({
  price,
  compareAtPrice,
  discountPercent,
  className,
}: {
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  className?: string;
}) {
  const hasDiscount = discountPercent > 0;
  return (
    <div className={className}>
      {hasDiscount && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {formatPercent(discountPercent)}
          </span>
          {compareAtPrice !== null && (
            <s className="text-xs text-foreground/50">
              {formatPrice(compareAtPrice)}
            </s>
          )}
        </div>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-foreground">
          {formatNumber(price)}
        </span>
        <span className="text-xs text-foreground/60">تومان</span>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  try {
    const { slug: rawSlug } = await params;
    const slug = normalizeSlug(rawSlug);
    if (slug === null) {
      return FALLBACK_METADATA;
    }

    const product = await getProduct(slug, serverFetch);
    const description = product.description.trim().slice(0, 160).trim();
    return {
      title: product.name,
      description: description.length > 0 ? description : undefined,
    };
  } catch {
    // An unknown slug, a backend outage or an unexpected payload all fall back
    // to the generic metadata; the page itself renders the matching state.
    return FALLBACK_METADATA;
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug: rawSlug } = await params;
  const slug = normalizeSlug(rawSlug);
  if (slug === null) {
    notFound();
  }

  let product: ProductDetail | null = null;
  try {
    product = await getProduct(slug, serverFetch);
  } catch (error) {
    if (isApiError(error) && error.isNotFound) {
      notFound();
    }
  }

  if (product === null) {
    return <ProductLoadError />;
  }

  const renderableImages = product.images
    .map((src) => src.trim())
    .filter(isRenderableImageSrc);
  const platform = isPlatform(product.category.platform)
    ? product.category.platform
    : null;
  const platformLabel = platform !== null ? PLATFORM_LABELS[platform] : null;
  const platformHref =
    platform !== null ? `/products?platform=${platform}` : null;
  const genres = product.genres
    .map((genre) => genre.trim())
    .filter((genre) => genre.length > 0);
  const description = product.description.trim();
  const brand = product.brand?.trim() ?? "";
  const sku = product.sku?.trim() ?? "";
  const { portsCount, weight } = product;
  const outOfStock = !product.inStock;
  // `lowStock` is the stock count only while it is 1–3, so the last unit is
  // exactly `lowStock === 1`; the 2–3 range keeps the vaguer line below.
  const singleUnitLeft = product.inStock && product.lowStock === 1;
  const lowStockRange =
    product.inStock && product.lowStock !== null && product.lowStock > 1;

  // Real product attributes only: the specs map plus the three scalar detail
  // fields the API exposes. An entry is kept only when it has a non-empty
  // value, so an empty «ویژگی‌ها» section is never rendered.
  const specEntries: Array<[string, string]> = Object.entries(
    product.specs ?? {},
  ).filter(
    ([key, value]) =>
      key.trim().length > 0 &&
      typeof value === "string" &&
      value.trim().length > 0,
  );
  if (sku.length > 0) {
    specEntries.push(["شناسه کالا", sku]);
  }
  if (portsCount !== null) {
    specEntries.push(["تعداد پورت", `${faNumber.format(portsCount)} عدد`]);
  }
  if (weight !== null) {
    specEntries.push(["وزن", faNumber.format(weight)]);
  }

  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:pb-10 lg:pt-8">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[8fr_7fr_5fr] lg:items-start lg:gap-8">
          {/* Right column (≈40%): the gallery. */}
          <section aria-label="تصاویر محصول" className="flex flex-col gap-3">
            {renderableImages.length > 0 ? (
              <ProductGallery
                key={product.id}
                images={renderableImages}
                name={product.name}
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-foreground/5 text-sm text-foreground/40">
                بدون تصویر
              </div>
            )}
          </section>

          {/* Middle column (≈35%): breadcrumb, identity and details. */}
          <section
            aria-label="اطلاعات محصول"
            className="flex flex-col gap-4 border-t border-border pt-6 lg:border-t-0 lg:pt-0"
          >
            <nav aria-label="مسیر صفحه" className="text-xs text-foreground/60">
              <ol className="flex flex-wrap items-center gap-1">
                <li>
                  <Link
                    href="/"
                    className="transition-colors hover:text-primary"
                  >
                    بازی بازار
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                {platformLabel !== null && platformHref !== null && (
                  <>
                    <li>
                      <Link
                        href={platformHref}
                        className="transition-colors hover:text-primary"
                      >
                        {platformLabel}
                      </Link>
                    </li>
                    <li aria-hidden="true">/</li>
                  </>
                )}
                <li
                  aria-current="page"
                  className="max-w-[12rem] truncate font-bold text-foreground/80"
                >
                  {product.name}
                </li>
              </ol>
            </nav>

            <div className="flex flex-col gap-2">
              {platformLabel !== null && platformHref !== null && (
                <Link
                  href={platformHref}
                  className="w-fit text-xs font-bold text-primary transition-opacity hover:opacity-80"
                >
                  {platformLabel}
                </Link>
              )}
              <h1 className="text-xl font-black leading-relaxed text-foreground lg:text-2xl">
                {product.name}
              </h1>
              {brand.length > 0 && (
                <p className="text-sm text-foreground/60">{brand}</p>
              )}
            </div>

            <div className="h-px w-full bg-border" />

            {specEntries.length > 0 && (
              <section aria-label="ویژگی‌ها" className="flex flex-col gap-3">
                <h2 className="text-base font-bold text-foreground">
                  <span className="hidden lg:inline">ویژگی‌ها</span>
                  <span className="lg:hidden">مشخصات کالا</span>
                </h2>
                <dl className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
                  {specEntries.map(([key, value], index) => (
                    <div
                      key={`${index}-${key}`}
                      className="w-40 shrink-0 snap-start rounded-xl bg-foreground/5 p-3 lg:w-auto"
                    >
                      <dt className="text-xs text-foreground/60">{key}</dt>
                      <dd className="mt-1 whitespace-pre-line text-sm font-bold leading-6 text-foreground">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {genres.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {genres.map((genre, index) => (
                      <li
                        key={`${index}-${genre}`}
                        className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground/70"
                      >
                        {genre}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {description.length > 0 && (
              <section
                aria-label="توضیحات"
                className="flex flex-col gap-3 border-t border-border pt-4 lg:border-t-0 lg:pt-0"
              >
                <h2 className="text-base font-bold text-foreground">توضیحات</h2>
                <p className="whitespace-pre-line text-sm leading-7 text-foreground/80">
                  {product.description}
                </p>
              </section>
            )}
          </section>

          {/* Left column (≈25%): sticky buy card, desktop only. */}
          <aside aria-label="خرید" className="hidden lg:sticky lg:top-24 lg:block">
            <div className="rounded-2xl border border-border bg-background p-5">
              {outOfStock ? (
                <p className="py-2 text-center text-sm font-bold text-red-600">
                  ناموجود
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  <PriceBlock
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    discountPercent={product.discountPercent}
                    className="flex flex-col gap-2"
                  />
                  <AddToCartButton
                    productId={product.id}
                    slug={product.slug}
                    inStock={product.inStock}
                  />
                  {lowStockRange && (
                    <p className="text-xs font-medium text-primary">
                      تنها چند عدد باقی مانده
                    </p>
                  )}
                  <LowStockNotice singleUnit={singleUnitLeft} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Fixed mobile buy bar (below lg). Out of stock shows only «ناموجود». */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          {outOfStock ? (
            <p className="w-full py-2 text-center text-sm font-bold text-red-600">
              ناموجود
            </p>
          ) : (
            <>
              <div className="flex-[3]">
                <AddToCartButton
                  productId={product.id}
                  slug={product.slug}
                  inStock={product.inStock}
                />
              </div>
              <div className="flex-[2]">
                <PriceBlock
                  price={product.price}
                  compareAtPrice={product.compareAtPrice}
                  discountPercent={product.discountPercent}
                  className="flex flex-col gap-1.5"
                />
                <LowStockNotice singleUnit={singleUnitLeft} className="mt-1" />
                {lowStockRange && (
                  <p className="mt-1 text-xs font-medium text-primary">
                    تنها چند عدد باقی مانده
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

