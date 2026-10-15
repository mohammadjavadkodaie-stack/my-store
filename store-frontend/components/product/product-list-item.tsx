import Image from "next/image";
import Link from "next/link";
import { formatPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/api/types";

type ProductListItemProps = {
  product: Product;
};

/**
 * Mobile-only product row of the products list (Digikala style). The products
 * page renders this below `md` and the untouched {@link ProductCard} grid from
 * `md` up, so the card itself never changes anywhere else.
 *
 * The whole row is a single `<Link>` to the product page. RTL layout: the image
 * sits first, on the physical right, and the text column follows to its left —
 * name on top, the small gray brand line (the same label the card shows) under
 * it, and the price block pushed to the bottom, aligned to the end (left).
 *
 * No ratings, color dots, delivery labels or seller info are added.
 */

/**
 * Only http(s) and root-relative image URLs are rendered; any other value
 * (empty string, data:, javascript:, ...) falls back to the neutral
 * placeholder box instead of reaching the <Image> src.
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/")
  );
}

/** Shared keyboard-focus ring, identical to the product card's. */
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function ProductListItem({ product }: ProductListItemProps) {
  const imageSrc = product.images[0]?.trim() ?? "";
  const showImage = imageSrc.length > 0 && isRenderableImageSrc(imageSrc);
  const hasDiscount = product.discountPercent > 0;
  const isSoldOut = !product.inStock;
  const brand = product.brand?.trim() ?? "";

  return (
    <Link
      href={`/products/${encodeURIComponent(product.slug)}`}
      className={`flex gap-3 py-4 ${FOCUS_RING}`}
    >
      <div className="relative size-32 shrink-0">
        {showImage ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="128px"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary/5 text-xs text-foreground/40">
            بدون تصویر
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-3 text-sm font-bold leading-relaxed text-foreground">
          {product.name}
        </h3>

        {brand.length > 0 && (
          <span className="mt-1 truncate text-xs text-foreground/60">
            {brand}
          </span>
        )}

        <div className="mt-auto flex flex-col items-end gap-1 pt-3">
          {isSoldOut ? (
            <span className="text-xs font-medium text-red-600">ناموجود</span>
          ) : (
            <>
              {hasDiscount && product.compareAtPrice !== null && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {formatPercent(product.discountPercent)}
                  </span>
                  <s className="text-xs text-foreground/50">
                    {formatPrice(product.compareAtPrice)}
                  </s>
                </div>
              )}
              <span className="text-sm font-bold text-foreground">
                {formatPrice(product.price)}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
