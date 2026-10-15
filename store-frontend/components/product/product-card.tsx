import Link from "next/link";
import { formatPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/api/types";

type ProductCardProps = {
  product: Product;
};

/**
 * Only http(s) and root-relative image URLs are rendered; any other value
 * (empty string, data:, javascript:, ...) falls back to the neutral
 * placeholder box instead of reaching the <img> src.
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const imageSrc = product.images[0]?.trim() ?? "";
  const showImage = imageSrc.length > 0 && isRenderableImageSrc(imageSrc);
  const hasDiscount = product.discountPercent > 0;
  const isSoldOut = !product.inStock;
  const isLowStock = product.inStock && product.lowStock !== null;

  return (
    <Link
      href={`/products/${encodeURIComponent(product.slug)}`}
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

        {hasDiscount && (
          <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {formatPercent(product.discountPercent)} تخفیف
          </span>
        )}

        {isSoldOut && (
          <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1.5 text-center text-xs font-bold text-red-600">
            ناموجود
          </span>
        )}
      </div>

      {/*
        Fixed-height rows: the brand line, a two-line title, a price block and
        the stock note are always rendered — empty when the product has no brand,
        no discount or healthy stock — so cards in the same row never misalign.
      */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="block min-h-4 truncate text-xs text-foreground/60">
          {product.brand ?? ""}
        </span>

        <h3 className="line-clamp-2 min-h-12 text-sm font-bold leading-6 text-foreground">
          {product.name}
        </h3>

        <div className="mt-auto flex min-h-10 flex-wrap items-baseline gap-x-2 gap-y-1 pt-2">
          {isSoldOut ? (
            <span className="text-sm font-bold text-red-600">ناموجود</span>
          ) : (
            <>
              {hasDiscount && product.compareAtPrice !== null && (
                <s className="text-xs text-foreground/50">
                  {formatPrice(product.compareAtPrice)}
                </s>
              )}
              <span className="text-sm font-extrabold text-foreground">
                {formatPrice(product.price)}
              </span>
            </>
          )}
        </div>

        <span className="block min-h-4 truncate text-xs font-medium text-primary">
          {isLowStock ? "تنها چند عدد باقی مانده" : ""}
        </span>
      </div>
    </Link>
  );
}
