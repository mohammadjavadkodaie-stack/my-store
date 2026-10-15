import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/api/types";

type ProductSectionProps = {
  /** Section heading (Persian UI text). */
  title: string;
  /** Target of the "مشاهده همه" link, e.g. "/products?sort=newest". */
  href: string;
  products: Product[];
  layout: "scroll" | "grid";
  /**
   * "deals" wraps the section in the red accent box used by the
   * "پیشنهادات شگفت‌انگیز" row; "default" (or omitted) is a plain section.
   */
  variant?: "default" | "deals";
};

/** Plain section: the default look of the home rows. */
const DEFAULT_SECTION_CLASS = "flex flex-col gap-4";
const DEFAULT_HEADING_CLASS =
  "text-lg font-extrabold text-foreground sm:text-xl";
const DEFAULT_LINK_CLASS =
  "inline-flex items-center gap-1 rounded-full text-sm font-bold text-primary transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Deals section: the red accent box of "پیشنهادات شگفت‌انگیز". */
const DEALS_SECTION_CLASS =
  "flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-4 sm:p-5";
const DEALS_HEADING_CLASS = "text-lg font-extrabold text-red-700 sm:text-xl";
const DEALS_LINK_CLASS =
  "inline-flex items-center gap-1 rounded-full text-sm font-bold text-red-700 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50";

export function ProductSection({
  title,
  href,
  products,
  layout,
  variant = "default",
}: ProductSectionProps) {
  if (products.length === 0) {
    return null;
  }

  const isDeals = variant === "deals";

  return (
    <section className={isDeals ? DEALS_SECTION_CLASS : DEFAULT_SECTION_CLASS}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={isDeals ? DEALS_HEADING_CLASS : DEFAULT_HEADING_CLASS}>
          {title}
        </h2>
        <Link href={href} className={isDeals ? DEALS_LINK_CLASS : DEFAULT_LINK_CLASS}>
          مشاهده همه
          <span aria-hidden="true" className="text-xs leading-none">
            ←
          </span>
        </Link>
      </div>

      {layout === "scroll" ? (
        <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {products.map((product) => (
            <li
              key={product.slug}
              className="w-40 shrink-0 snap-start sm:w-52 md:w-56"
            >
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid auto-rows-fr grid-cols-2 items-stretch gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            /*
              Uniform grid cards: every row shares one height (auto-rows-fr) and
              each item stretches, so the fixed-height card template lines up
              across the whole grid instead of only inside its own row;
              min-w-0 lets an item shrink to its column so a long nowrapped
              title can never push the square image taller than its neighbours.
            */
            <li key={product.slug} className="flex min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
