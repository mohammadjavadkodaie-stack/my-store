import { parseDecimalInput } from "@/lib/price-input";

/**
 * Bridge between the form's new fields and the product payload's existing
 * `specs: Record<string, string>` map (lib/api/admin-products.ts). The payload
 * has no dedicated fields for features, dimensions or connection types, so all
 * three are stored inside specs — no new API field is invented.
 *
 * Multi-value entries are stored newline separated: the public product page
 * renders spec values with `whitespace-pre-line`, so a list stays a list.
 */

/** کلیدهای specs که این فرم مدیریت می‌کند؛ کلیدهای دیگر محصول دست‌نخورده می‌مانند. */
export const SPEC_KEY_FEATURES = "قابلیت‌ها";
export const SPEC_KEY_LENGTH = "طول (سانتی‌متر)";
export const SPEC_KEY_WIDTH = "عرض (سانتی‌متر)";
export const SPEC_KEY_CONNECTION = "نوع اتصال";

const MANAGED_SPEC_KEYS: readonly string[] = [
  SPEC_KEY_FEATURES,
  SPEC_KEY_LENGTH,
  SPEC_KEY_WIDTH,
  SPEC_KEY_CONNECTION,
];

/** فهرست ثابت و بستهٔ انواع اتصال؛ مقدار ذخیره‌شده همان برچسب فارسی است. */
export const CONNECTION_TYPES = [
  "بی‌سیم (Wi-Fi)",
  "بلوتوث",
  "سیمی",
  "USB",
  "USB-C",
  "Lightning",
  "HDMI",
  "DisplayPort",
  "AUX (۳.۵ میلی‌متر)",
  "اترنت (LAN)",
  "NFC",
  "مادون قرمز",
  "دانگل بی‌سیم ۲.۴ گیگاهرتز",
  "فیبر نوری (Optical)",
  "Thunderbolt",
] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

/** سقف‌های این فرم (DTO برای specs سقف عددی اعلام‌شده‌ای در فرانت ندارد). */
export const FEATURES_MAX_COUNT = 10;
export const FEATURE_MAX_LENGTH = 200;
export const DIMENSION_MAX = 1000;

/** فقط برچسب‌های همین فهرست بسته پذیرفته می‌شوند. */
export function isConnectionType(value: string): value is ConnectionType {
  return (CONNECTION_TYPES as readonly string[]).includes(value);
}

/** «الف\nب» -> ["الف", "ب"]؛ ردیف‌های خالی حذف می‌شوند. */
export function splitSpecList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * مقدار ذخیره‌شدهٔ «نوع اتصال» را به برچسب‌های شناخته‌شده و مقادیر ناشناخته
 * تقسیم می‌کند؛ مقادیر ناشناخته حذف نمی‌شوند تا ویرایش، دادهٔ قدیمی را پاک نکند.
 */
export function splitConnectionTypes(value: string | undefined): {
  selected: string[];
  unknown: string[];
} {
  const selected: string[] = [];
  const unknown: string[] = [];
  for (const item of splitSpecList(value)) {
    if (isConnectionType(item)) {
      if (!selected.includes(item)) selected.push(item);
    } else if (!unknown.includes(item)) {
      unknown.push(item);
    }
  }
  return { selected, unknown };
}

/** specs بدون کلیدهای این فرم؛ سایر مشخصات محصول حفظ می‌شوند. */
export function withoutManagedSpecs(
  specs: Record<string, string>,
): Record<string, string> {
  const rest: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (!MANAGED_SPEC_KEYS.includes(key)) {
      rest[key] = value;
    }
  }
  return rest;
}

/** خطای فهرست قابلیت‌ها (فارسی) یا undefined وقتی فهرست درست است. */
export function featuresError(features: string[]): string | undefined {
  if (features.length > FEATURES_MAX_COUNT) {
    return `حداکثر ${FEATURES_MAX_COUNT} قابلیت مجاز است.`;
  }
  if (features.some((item) => item.length > FEATURE_MAX_LENGTH)) {
    return `هر قابلیت حداکثر ${FEATURE_MAX_LENGTH} کاراکتر است.`;
  }
  return undefined;
}

/** خطای یک بُعد: عدد اعشاری مثبت و در بازهٔ مجاز؛ خالی بودن ایراد نیست. */
export function dimensionError(raw: string, label: string): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const value = parseDecimalInput(trimmed);
  if (Number.isNaN(value) || value <= 0 || value > DIMENSION_MAX) {
    return `${label} باید عددی مثبت و حداکثر ${DIMENSION_MAX} باشد.`;
  }
  return undefined;
}

/** خطای انتخاب‌های نوع اتصال: فقط برچسب‌های فهرست ثابت مجازند. */
export function connectionTypesError(
  selected: readonly string[],
): string | undefined {
  return selected.every(isConnectionType)
    ? undefined
    : "نوع اتصال نامعتبر است؛ فقط گزینه‌های فهرست مجاز هستند.";
}

export interface ProductSpecsInput {
  features: string[];
  length: string;
  width: string;
  connectionTypes: string[];
  /** مقادیر ناشناختهٔ قبلی که دست‌نخورده بازگردانده می‌شوند. */
  connectionTypesUnknown: string[];
}

/**
 * specs نهایی: کلیدهای دیگر محصول + قابلیت‌ها + ابعاد + نوع اتصال. کلیدی که
 * مقدارش خالی شده حذف می‌شود تا صفحهٔ محصول ردیف خالی نشان ندهد.
 */
export function buildSpecs(
  base: Record<string, string>,
  input: ProductSpecsInput,
): Record<string, string> {
  const specs: Record<string, string> = { ...base };
  const features = input.features
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  setSpec(specs, SPEC_KEY_FEATURES, features.join("\n"));
  setSpec(specs, SPEC_KEY_LENGTH, input.length.trim());
  setSpec(specs, SPEC_KEY_WIDTH, input.width.trim());
  setSpec(
    specs,
    SPEC_KEY_CONNECTION,
    [...input.connectionTypes, ...input.connectionTypesUnknown].join("\n"),
  );

  return specs;
}

function setSpec(
  specs: Record<string, string>,
  key: string,
  value: string,
): void {
  if (value.length === 0) {
    delete specs[key];
  } else {
    specs[key] = value;
  }
}
