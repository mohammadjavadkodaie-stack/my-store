import type { AdminProductDetail } from "@/lib/api/admin-products";
import { isApiError } from "@/lib/api/error";
import {
  SPEC_KEY_CONNECTION,
  SPEC_KEY_FEATURES,
  SPEC_KEY_LENGTH,
  SPEC_KEY_WIDTH,
  buildSpecs,
  connectionTypesError,
  dimensionError,
  featuresError,
  splitConnectionTypes,
  splitSpecList,
  withoutManagedSpecs,
} from "@/components/admin/product-specs";
import {
  formatDecimalInput,
  formatPriceValue,
  parsePriceInput,
} from "@/lib/price-input";

/** Limits and rules mirrored from the backend DTOs (create/update-product.dto.ts). */
export const NAME_MAX_LENGTH = 200;
export const SLUG_MAX_LENGTH = 120;
/** حروف کوچک انگلیسی، عدد و خط تیره (SLUG_PATTERN در بک‌اند). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DESCRIPTION_MAX_LENGTH = 5_000;
export const PRICE_MAX = 1_000_000_000;
export const STOCK_MAX = 1_000_000;
export const COMPARE_AT_PRICE_MIN = 1;
export const BRAND_MAX_LENGTH = 100;
/** حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط (SKU_PATTERN در بک‌اند). */
export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;
export const REGION_MAX_LENGTH = 60;
export const PORTS_COUNT_MAX = 100;
export const WEIGHT_MAX = 1_000_000;
/** سقف تعداد و طول هر آدرس تصویر (mirrored from the create/update DTOs). */
export const IMAGES_MAX_COUNT = 10;
export const IMAGE_VALUE_MAX_LENGTH = 500;

/** آدرس مطلق http/https بدون فاصله یا کاراکتر کنترلی. */
const IMAGE_ABSOLUTE_URL_PATTERN = /^https?:\/\/[^\s]+$/;
/** مسیر ریشه‌ای؛ یک اسلش ابتدایی، بدون اسلش دوم، بک‌اسلش یا فاصله. */
const IMAGE_ROOT_PATH_PATTERN = /^\/(?!\/)[^\s\\]+$/;
/** طرح‌های خطرناک که هرگز نباید به عنوان تصویر پذیرفته شوند. */
const BLOCKED_IMAGE_SCHEME_PATTERN = /^(?:javascript|data|vbscript):/i;

/**
 * اعتبار یک آدرس تصویر: حداکثر ۵۰۰ کاراکتر، بدون فاصله، یا آدرس مطلق
 * http/https یا مسیر ریشه‌ای با یک اسلش («//»، «javascript:» و «data:» رد
 * می‌شوند). داده‌ی سرور نامطمئن است و این تابع تنها منبع اعتبارسنجی تصاویر است.
 */
export function isValidImageValue(value: string): boolean {
  if (value.length === 0 || value.length > IMAGE_VALUE_MAX_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) {
    return false;
  }
  if (BLOCKED_IMAGE_SCHEME_PATTERN.test(value)) {
    return false;
  }
  return (
    IMAGE_ABSOLUTE_URL_PATTERN.test(value) || IMAGE_ROOT_PATH_PATTERN.test(value)
  );
}

/** الفبای اسلاگ تولیدشده: حروف کوچک انگلیسی و رقم (هم‌خوان با SLUG_PATTERN). */
const SLUG_RANDOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_RANDOM_LENGTH = 8;
/** بزرگ‌ترین مضرب طول الفبا زیر ۲۵۶؛ مقادیر بیشتر دور ریخته می‌شوند تا نتیجه یکنواخت بماند. */
const SLUG_RANDOM_LIMIT =
  Math.floor(256 / SLUG_RANDOM_ALPHABET.length) * SLUG_RANDOM_ALPHABET.length;

/**
 * اسلاگ پیشنهادی محصول تازه: «p-» به‌همراه ۸ کاراکتر تصادفی امن. تصادف از
 * crypto.getRandomValues می‌آید (نه Math.random) و هر کاراکتر فقط از الفبای
 * مجاز SLUG_PATTERN انتخاب می‌شود.
 */
export function generateSlug(): string {
  let suffix = "";
  while (suffix.length < SLUG_RANDOM_LENGTH) {
    const bytes = new Uint8Array(SLUG_RANDOM_LENGTH - suffix.length);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= SLUG_RANDOM_LIMIT) continue;
      suffix += SLUG_RANDOM_ALPHABET.charAt(byte % SLUG_RANDOM_ALPHABET.length);
      if (suffix.length === SLUG_RANDOM_LENGTH) break;
    }
  }
  return `p-${suffix}`;
}

/** Raw form state: every numeric field stays a string until parsed on submit. */
export interface ProductFormValues {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  categoryId: string;
  brand: string;
  sku: string;
  region: string;
  portsCount: string;
  weight: string;
  /** ابعاد مثل قیمت تا لحظهٔ ارسال رشته می‌مانند. */
  length: string;
  width: string;
  isActive: boolean;
  isFeatured: boolean;
  /** Kept from the loaded product and resubmitted unchanged (their UI lands in B2). */
  images: string[];
  genres: string[];
  /** قابلیت‌ها و نوع اتصال؛ در specs ذخیره می‌شوند (product-specs.ts). */
  features: string[];
  connectionTypes: string[];
  /** قیمت تمام‌شده؛ تایپ محصول فعلی این فیلد را ندارد و تنها در صورت وجود پر می‌شود. */
  costPrice: string;
  specs: Record<string, string>;
}

export type ProductFieldErrors = Partial<
  Record<
    | "name"
    | "slug"
    | "description"
    | "price"
    | "compareAtPrice"
    | "stock"
    | "categoryId"
    | "brand"
    | "sku"
    | "region"
    | "portsCount"
    | "weight"
    | "length"
    | "width"
    | "features"
    | "connectionTypes"
    | "costPrice"
    | "images",
    string
  >
>;

/**
 * Maps a failed request to one fixed Persian message per status. The backend's
 * own message/details are never rendered — they may leak internal or user data.
 */
export function describeProductError(error: unknown): string {
  if (isApiError(error)) {
    if (error.isNetworkError) {
      return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
    }
    if (error.status === 400) {
      return "داده‌های ارسالی نامعتبر است؛ مقادیر واردشده را بررسی کنید.";
    }
    if (error.status === 401) {
      return "اعتبار ورود منقضی شده است؛ لطفاً دوباره وارد شوید.";
    }
    if (error.status === 403) {
      return "شما به این بخش دسترسی ندارید.";
    }
    if (error.status === 404) {
      return "محصول مورد نظر پیدا نشد.";
    }
    if (error.status === 409) {
      return "محصول تکراری است؛ اسلاگ یا کد کالای دیگری انتخاب کنید.";
    }
  }
  return "خطایی رخ داد؛ لطفاً دوباره تلاش کنید.";
}

/** Client-side mirror of the create/update DTO rules; all messages in Persian. */
export function validateProduct(input: ProductFormValues): ProductFieldErrors {
  const errors: ProductFieldErrors = {};

  if (input.name.trim().length === 0) {
    errors.name = "نام محصول الزامی است.";
  } else if (input.name.length > NAME_MAX_LENGTH) {
    errors.name = `نام محصول حداکثر ${NAME_MAX_LENGTH} کاراکتر است.`;
  }

  const slug = input.slug.trim();
  if (slug.length === 0) {
    errors.slug = "اسلاگ الزامی است.";
  } else if (input.slug.length > SLUG_MAX_LENGTH) {
    errors.slug = `اسلاگ حداکثر ${SLUG_MAX_LENGTH} کاراکتر است.`;
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد.";
  }

  if (input.description.trim().length === 0) {
    errors.description = "توضیحات الزامی است.";
  } else if (input.description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `توضیحات حداکثر ${DESCRIPTION_MAX_LENGTH} کاراکتر است.`;
  }

  if (input.categoryId.length === 0) {
    errors.categoryId = "دسته‌بندی الزامی است.";
  }

  addError(errors, "price", priceError(input.price, "قیمت", 0, PRICE_MAX, true));
  addError(errors, "stock", integerError(input.stock, "موجودی", 0, STOCK_MAX, true));
  addError(
    errors,
    "compareAtPrice",
    priceError(
      input.compareAtPrice,
      "قیمت پیش از تخفیف",
      COMPARE_AT_PRICE_MIN,
      PRICE_MAX,
      false,
    ),
  );
  addError(
    errors,
    "costPrice",
    priceError(input.costPrice, "قیمت تمام‌شده", 0, PRICE_MAX, false),
  );
  addError(
    errors,
    "portsCount",
    integerError(input.portsCount, "تعداد درگاه‌ها", 0, PORTS_COUNT_MAX, false),
  );
  addError(errors, "weight", numberError(input.weight, "وزن", 0, WEIGHT_MAX));

  if (input.brand.length > BRAND_MAX_LENGTH) {
    errors.brand = `برند حداکثر ${BRAND_MAX_LENGTH} کاراکتر است.`;
  }

  const sku = input.sku.trim();
  if (sku.length > 0 && !SKU_PATTERN.test(sku)) {
    errors.sku =
      "کد کالا فقط می‌تواند شامل حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط باشد.";
  }

  if (input.region.length > REGION_MAX_LENGTH) {
    errors.region = `منطقه حداکثر ${REGION_MAX_LENGTH} کاراکتر است.`;
  }

  // اعتبارسنج‌های مشترک با product-specs.ts؛ کلیدهای خطا همنام فیلدهای فرم‌اند.
  addError(errors, "features", featuresError(input.features));
  addError(errors, "length", dimensionError(input.length, "طول"));
  addError(errors, "width", dimensionError(input.width, "عرض"));
  addError(errors, "connectionTypes", connectionTypesError(input.connectionTypes));

  if (input.images.length > IMAGES_MAX_COUNT) {
    errors.images = `حداکثر ${IMAGES_MAX_COUNT} تصویر مجاز است.`;
  } else if (input.images.some((image) => !isValidImageValue(image.trim()))) {
    errors.images =
      "آدرس تصویر نامعتبر است؛ هر تصویر باید با http:// یا https:// یا یک مسیر با «/» شروع شود و حداکثر ۵۰۰ کاراکتر باشد.";
  }

  return errors;
}

function addError(
  errors: ProductFieldErrors,
  field: keyof ProductFieldErrors,
  message: string | undefined,
): void {
  if (message !== undefined) {
    errors[field] = message;
  }
}

/** Integer field: plain digits within [min, max]; empty only when not required. */
function integerError(
  raw: string,
  label: string,
  min: number,
  max: number,
  required: boolean,
): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return required ? `${label} الزامی است.` : undefined;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return `${label} باید عدد صحیح باشد.`;
  }
  const value = Number.parseInt(trimmed, 10);
  return value < min || value > max
    ? `${label} باید بین ${min} و ${max} باشد.`
    : undefined;
}

/**
 * Price field: separators and Persian/Arabic digits are stripped first
 * (parsePriceInput) and only then is the plain integer range-checked.
 */
function priceError(
  raw: string,
  label: string,
  min: number,
  max: number,
  required: boolean,
): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return required ? `${label} الزامی است.` : undefined;
  }
  const value = parsePriceInput(trimmed);
  if (Number.isNaN(value)) {
    return `${label} باید عدد صحیح باشد.`;
  }
  return value < min || value > max
    ? `${label} باید بین ${min} و ${max} باشد.`
    : undefined;
}

/**
 * تایپ محصول فعلی فیلد costPrice ندارد؛ اگر سرور روزی آن را برگرداند بدون تغییر
 * تایپ DTO خوانده می‌شود. مقدار غیرعددی -> undefined.
 */
function readCostPrice(product?: AdminProductDetail): number | null | undefined {
  const value: unknown = (
    product as (AdminProductDetail & { costPrice?: unknown }) | undefined
  )?.costPrice;
  return typeof value === "number" || value === null ? value : undefined;
}

/** Decimal field (weight): a plain number within [min, max]; empty is allowed. */
function numberError(
  raw: string,
  label: string,
  min: number,
  max: number,
): string | undefined {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return `${label} باید عدد باشد.`;
  }
  const value = Number.parseFloat(trimmed);
  return value < min || value > max
    ? `${label} باید بین ${min} و ${max} باشد.`
    : undefined;
}

/**
 * Seeds the form from the guarded product row (edit) or safe defaults (create).
 * Prices are prefilled thousands-grouped, dimensions normalized, and features /
 * connection types are read back out of the product's own specs keys.
 */
export function initialValues(product?: AdminProductDetail): ProductFormValues {
  const specs = product?.specs ?? {};
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    price: formatPriceValue(product?.price),
    compareAtPrice: formatPriceValue(product?.compareAtPrice),
    stock: product === undefined ? "" : String(product.stock),
    categoryId: product === undefined ? "" : String(product.categoryId),
    brand: product?.brand ?? "",
    sku: product?.sku ?? "",
    region: product?.region ?? "",
    portsCount: product?.portsCount == null ? "" : String(product.portsCount),
    weight: product?.weight == null ? "" : String(product.weight),
    length: formatDecimalInput(specs[SPEC_KEY_LENGTH] ?? ""),
    width: formatDecimalInput(specs[SPEC_KEY_WIDTH] ?? ""),
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    images: product?.images ?? [],
    genres: product?.genres ?? [],
    features: splitSpecList(specs[SPEC_KEY_FEATURES]),
    connectionTypes: splitConnectionTypes(specs[SPEC_KEY_CONNECTION]).selected,
    costPrice: formatPriceValue(readCostPrice(product)),
    specs,
  };
}

/**
 * Builds the exact POST/PATCH body. Only DTO-whitelisted keys are ever sent,
 * numbers stay real JSON numbers (prices are parsed through lib/price-input, so
 * "1,250,000" and Persian digits are accepted), empty optional fields are
 * omitted (never "" or NaN) and — on edit only — an empty compareAtPrice is
 * sent as null, which is how PATCH clears the field. images/genres ride along
 * unchanged; specs keep every unmanaged key and only the managed ones
 * (features, dimensions, connection types) are rewritten.
 */
export function buildPayload(
  values: ProductFormValues,
  mode: "create" | "edit",
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name.trim(),
    slug: values.slug.trim(),
    description: values.description.trim(),
    price: parsePriceInput(values.price.trim()),
    stock: Number.parseInt(values.stock.trim(), 10),
    categoryId: Number.parseInt(values.categoryId.trim(), 10),
    isActive: values.isActive,
    isFeatured: values.isFeatured,
    images: values.images
      .map((image) => image.trim())
      .filter((image) => image.length > 0),
    genres: values.genres,
    specs: buildSpecs(withoutManagedSpecs(values.specs), {
      features: values.features,
      length: values.length,
      width: values.width,
      connectionTypes: values.connectionTypes,
      // مقادیر ناشناختهٔ قبلی «نوع اتصال» حفظ می‌شوند تا ویرایش داده را پاک نکند.
      connectionTypesUnknown: splitConnectionTypes(
        values.specs[SPEC_KEY_CONNECTION],
      ).unknown,
    }),
  };

  if (values.compareAtPrice.trim().length > 0) {
    payload.compareAtPrice = parsePriceInput(values.compareAtPrice.trim());
  } else if (mode === "edit") {
    payload.compareAtPrice = null;
  }

  // قیمت تمام‌شده فقط وقتی ارسال می‌شود که مقدار داشته باشد؛ تایپ محصول فعلی این
  // فیلد را ندارد، پس برای محصول‌های موجود عملاً هرگز به بدنه اضافه نمی‌شود.
  if (values.costPrice.trim().length > 0) {
    payload.costPrice = parsePriceInput(values.costPrice.trim());
  }

  const brand = values.brand.trim();
  if (brand.length > 0) payload.brand = brand;

  const sku = values.sku.trim();
  if (sku.length > 0) payload.sku = sku;

  const region = values.region.trim();
  if (region.length > 0) payload.region = region;

  if (values.portsCount.trim().length > 0) {
    payload.portsCount = Number.parseInt(values.portsCount.trim(), 10);
  }

  if (values.weight.trim().length > 0) {
    payload.weight = Number.parseFloat(values.weight.trim());
  }

  return payload;
}
