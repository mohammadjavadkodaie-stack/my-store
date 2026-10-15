import Link from "next/link";
import type { ProductQuery } from "@/lib/api/types";
import { buildProductsHref } from "@/lib/products-query";

/**
 * Server-rendered pagination: prev/next plus up to five numbered links around
 * the current page. Hrefs are built by {@link buildProductsHref}, which keeps the
 * active filters and URL-encodes every value.
 */

type PaginationProps = {
  query: ProductQuery;
  page: number;
  totalPages: number;
};

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

/** How many numbered links are shown at once. */
const PAGE_WINDOW = 5;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const LINK_CLASS = `inline-flex min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_RING}`;

const CURRENT_CLASS =
  "inline-flex min-w-9 items-center justify-center rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground";

const DISABLED_CLASS =
  "inline-flex min-w-9 items-center justify-center rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/40";

/** A sliding window of at most PAGE_WINDOW page numbers containing `page`. */
function pageNumbers(page: number, totalPages: number): number[] {
  const half = Math.floor(PAGE_WINDOW / 2);
  const start = Math.max(
    1,
    Math.min(page - half, totalPages - PAGE_WINDOW + 1),
  );
  const end = Math.min(totalPages, start + PAGE_WINDOW - 1);

  const pages: number[] = [];
  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }
  return pages;
}

export function Pagination({ query, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="صفحه‌بندی"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {hasPrevious ? (
        <Link
          href={buildProductsHref(query, { page: page - 1 })}
          rel="prev"
          className={LINK_CLASS}
        >
          قبلی
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>قبلی</span>
      )}

      {pageNumbers(page, totalPages).map((number) =>
        number === page ? (
          <span key={number} aria-current="page" className={CURRENT_CLASS}>
            {faNumberFormatter.format(number)}
          </span>
        ) : (
          <Link
            key={number}
            href={buildProductsHref(query, { page: number })}
            className={LINK_CLASS}
          >
            {faNumberFormatter.format(number)}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link
          href={buildProductsHref(query, { page: page + 1 })}
          rel="next"
          className={LINK_CLASS}
        >
          بعدی
        </Link>
      ) : (
        <span className={DISABLED_CLASS}>بعدی</span>
      )}
    </nav>
  );
}
