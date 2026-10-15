import type { Metadata } from "next";
import Link from "next/link";
import {
  getProductFilters,
  type ProductFilterOptions,
} from "@/lib/api/filters";
import { getProducts } from "@/lib/api/products";
import { serverFetch } from "@/lib/api/server";
import type { Product } from "@/lib/api/types";
import { ProductCard } from "@/components/product/product-card";
import { ProductListItem } from "@/components/product/product-list-item";
import { Pagination } from "@/components/products/pagination";
import { ProductFilters } from "@/components/products/product-filters";
import { PLATFORM_LABELS } from "@/lib/platforms";
import {
  PRODUCTS_PAGE_SIZE,
  parseProductsSearchParams,
} from "@/lib/products-query";

export const metadata: Metadata = { title: "محصولات" };

/**
 * Search params of the App Router are a Promise in Next.js 16 and must be awaited.
 * The value stays `unknown`-ish on purpose: it is validated by the strict
 * whitelist in `parseProductsSearchParams` before it reaches the backend.
 */
type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { query, page } = parseProductsSearchParams(await searchParams);

  let products: Product[] = [];
  let total = 0;
  let failed = false;
  let filterOptions: ProductFilterOptions | null = null;

  // Both calls are independent, so they run together; either one failing must
  // not take the page down.
  const [productsResult, filtersResult] = await Promise.all([
    getProducts(query, serverFetch).catch(() => null),
    getProductFilters(serverFetch).catch(() => null),
  ]);

  if (productsResult === null) {
    // The backend message/stack is deliberately not shown nor logged.
    failed = true;
  } else {
    products = productsResult.items;
    total = productsResult.total;
  }

  // A missing option list only hides the brand/genre/region groups.
  filterOptions = filtersResult;

  const heading = query.q
    ? `نتایج جستجو برای «${query.q}»`
    : query.platform
      ? PLATFORM_LABELS[query.platform]
      : "همه محصولات";

  const totalPages = Math.ceil(total / PRODUCTS_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">{heading}</h1>
        {!failed && (
          <p className="text-sm text-foreground/70">
            {faNumberFormatter.format(total)} کالا یافت شد
          </p>
        )}
      </header>

      {failed ? (
        <div
          role="alert"
          className="rounded-2xl border border-border bg-primary/5 p-6 text-center"
        >
          <p className="text-base font-bold text-foreground">
            خطا در دریافت محصولات
          </p>
          <p className="mt-2 text-sm text-foreground/70">
            در حال حاضر نمایش فهرست محصولات ممکن نیست. لطفاً چند لحظه بعد دوباره
            تلاش کنید.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
          <ProductFilters query={query} options={filterOptions} />

          <div className="flex flex-col gap-6">
            {products.length > 0 ? (
              <>
                {/* From md up: the untouched card grid (exactly as before).
                    Below md it is hidden in favour of the mobile row list. */}
                <ul className="hidden grid-cols-2 gap-3 sm:grid-cols-3 md:grid xl:grid-cols-4">
                  {products.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>

                {/* Below md only: single-column Digikala-style rows. */}
                <ul className="md:hidden">
                  {products.map((product) => (
                    <li
                      key={product.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <ProductListItem product={product} />
                    </li>
                  ))}
                </ul>

                <Pagination query={query} page={page} totalPages={totalPages} />
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-primary/5 p-10 text-center">
                <p className="text-base font-bold text-foreground">
                  محصولی با این مشخصات پیدا نشد.
                </p>
                <p className="text-sm text-foreground/70">
                  می‌توانید فیلترها را حذف کنید و همه محصولات را ببینید.
                </p>
                <Link
                  href="/products"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  حذف فیلترها
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
