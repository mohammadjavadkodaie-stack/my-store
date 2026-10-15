/**
 * Digit helpers shared by the admin product form's price and dimension inputs.
 *
 * An admin may type Persian (۰-۹, U+06F0-U+06F9) or Arabic (٠-٩, U+0660-U+0669)
 * digits: every value is first converted to ASCII, then stripped of separators
 * and only then grouped with "," for display. What is submitted is always a
 * plain JSON number — never "1,234" and never "۱۲۳۴".
 */

/** Persian (۰-۹) and Arabic-Indic (٠-٩) digits, same range as lib/auth/validation.ts. */
const NON_ASCII_DIGITS = /[\u06f0-\u06f9\u0660-\u0669]/g;

/** Converts Persian/Arabic digits to ASCII ones; other characters are kept. */
export function toEnglishDigits(value: string): string {
  return value.replace(NON_ASCII_DIGITS, (char) => {
    const code = char.charCodeAt(0);
    // Persian digits start at U+06F0, Arabic ones at U+0660.
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** ASCII digits only: Persian/Arabic digits converted, everything else dropped. */
export function digitsOnly(value: string): string {
  return toEnglishDigits(value).replace(/[^0-9]/g, "");
}

/** Groups a digit string with thousands separators: "1234567" -> "1,234,567". */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** What a price input shows while typing: ASCII digits, grouped, no sign. */
export function formatPriceInput(value: string): string {
  return groupDigits(digitsOnly(value));
}

/** The plain integer a price input submits; NaN when the field is empty. */
export function parsePriceInput(value: string): number {
  const digits = digitsOnly(value);
  return digits.length === 0 ? Number.NaN : Number.parseInt(digits, 10);
}

/** Prefills a price input on edit: 1250000 -> "1,250,000"; null/undefined -> "". */
export function formatPriceValue(value: number | null | undefined): string {
  return value == null ? "" : groupDigits(String(value));
}

/** What a decimal input shows while typing: ASCII digits and at most one dot. */
export function formatDecimalInput(value: string): string {
  const normalized = toEnglishDigits(value)
    .replace(/[\u066b\u066c]/g, ".")
    .replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = normalized.split(".");
  return rest.length === 0 ? whole : `${whole}.${rest.join("")}`;
}

/** The plain positive decimal a dimension input submits; NaN when empty/invalid. */
export function parseDecimalInput(value: string): number {
  const text = value.trim();
  return /^\d+(?:\.\d+)?$/.test(text) ? Number.parseFloat(text) : Number.NaN;
}
