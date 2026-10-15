/**
 * Short notice for the last unit of a product.
 *
 * Display-only and server-rendered: the caller decides whether the condition
 * holds. The public product view never exposes the raw stock number; it exposes
 * `lowStock` — the stock count while it is between 1 and 3 — so «exactly one
 * unit left» is `product.lowStock === 1`.
 *
 * Renders nothing when `singleUnit` is false, so it can sit in an existing
 * price / add-to-cart slot without adding an empty row.
 */
type LowStockNoticeProps = {
  /** true only when exactly one unit is left; anything else renders nothing. */
  singleUnit: boolean;
  /** Optional layout classes; the text style itself stays fixed. */
  className?: string;
};

export function LowStockNotice({ singleUnit, className }: LowStockNoticeProps) {
  if (!singleUnit) {
    return null;
  }

  return (
    <p
      className={`text-xs font-medium leading-5 text-primary${
        className ? ` ${className}` : ""
      }`}
    >
      تنها ۱ عدد از این محصول باقی مانده است
    </p>
  );
}
