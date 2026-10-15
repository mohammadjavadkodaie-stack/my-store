/**
 * Formatting helpers for the Persian (fa-IR) UI.
 *
 * Intl.NumberFormat("fa-IR") renders Persian digits and separators, matching
 * the RTL layout; prices always carry the "تومان" suffix.
 */

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

/** Formats a plain number in Persian digits, e.g. 1250000 -> "۱٬۲۵۰٬۰۰۰". */
export function formatNumber(value: number): string {
  return faNumberFormatter.format(value);
}

/** Formats a Toman price in Persian digits, e.g. 1250000 -> "۱٬۲۵۰٬۰۰۰ تومان". */
export function formatPrice(value: number): string {
  return `${formatNumber(value)} تومان`;
}

/** Formats a whole percentage with the Persian percent sign, e.g. 25 -> "۲۵٪". */
export function formatPercent(value: number): string {
  return `${faNumberFormatter.format(value)}٪`;
}
