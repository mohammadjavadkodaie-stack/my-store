"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { platformLabel } from "@/lib/api/admin-categories";
import {
  createSlide,
  type AdminSlide,
  type SlideInput,
} from "@/lib/api/admin-slides";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";
import { ImageUploader } from "@/components/admin/image-uploader";

/** سقف طول فیلدهای متنی (mirrored from the backend slide DTOs). */
const TITLE_MAX_LENGTH = 120;
const SUBTITLE_MAX_LENGTH = 300;
const BUTTON_LABEL_MAX_LENGTH = 40;
const CUSTOM_PATH_MAX_LENGTH = 300;

/** مقصدهای ثابت؛ تنها مسیرهای عمومی‌ای که این فرانت‌اند واقعاً دارد. */
const HOME_DESTINATION = "home";
const PRODUCTS_DESTINATION = "products";
const CART_DESTINATION = "cart";
/** گزینه‌ی «مسیر سفارشی داخلی»؛ خالی گذاشتن آن یعنی اسلاید بدون دکمه. */
const CUSTOM_DESTINATION = "custom";
const CATEGORY_PREFIX = "category:";
const PRODUCT_PREFIX = "product:";

const HOME_PATH = "/";
/** مسیر واقعی فهرست محصولات (app/products/page.tsx). */
const PRODUCTS_PATH = "/products";
/** مسیر واقعی سبد خرید (app/cart/page.tsx). */
const CART_PATH = "/cart";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";
const HINT_CLASS = "mt-1 text-xs text-foreground/50";

/** مسیر داخلی معتبر: یک «/» ابتدایی، نه «//» و بدون فاصله. */
const INTERNAL_PATH_PATTERN = /^\/(?!\/)[^\s]*$/;

/**
 * تنها مقادیری که می‌توان به‌عنوان تصویر رندر کرد؛ هر چیز دیگر (رشته‌ی خالی،
 * data:، javascript:، ...) رد می‌شود (همان stance فهرست اسلایدها).
 */
function isRenderableImageSrc(src: string): boolean {
  return (
    src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")
  );
}

/**
 * آدرس واقعی یک دسته‌بندی در این فرانت‌اند. صفحه‌ی اختصاصی دسته‌بندی وجود
 * ندارد و فهرست محصولات هم فیلتر «categorySlug» را نمی‌شناسد، پس نزدیک‌ترین
 * آدرس درست، فهرست محصولات همان پلتفرم است (همان آدرسی که تب‌های پلتفرم
 * می‌سازند).
 */
function categoryPath(platform: string): string {
  return `${PRODUCTS_PATH}?platform=${encodeURIComponent(platform)}`;
}

/** مسیر واقعی صفحه‌ی یک محصول (app/products/[slug]/page.tsx). */
function productPath(slug: string): string {
  return `${PRODUCTS_PATH}/${encodeURIComponent(slug)}`;
}

/** وضعیت فرم؛ هر فیلد تا لحظه‌ی ارسال یک رشته می‌ماند. */
interface SlideFormValues {
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  /** "" یعنی «بدون مقصد» (اسلاید فقط تصویر دارد). */
  destination: string;
  customPath: string;
  isActive: boolean;
}

type SlideFieldName = "title" | "subtitle" | "buttonLabel" | "customPath";

type SlideFieldErrors = Partial<
  Record<SlideFieldName | "image" | "button", string>
>;

/** یک گزینه‌ی دسته‌بندی؛ فقط همان چیزی که برای ساختن آدرس لازم است. */
interface CategoryOption {
  id: number;
  name: string;
  platform: string;
}

/** یک گزینه‌ی محصول؛ کوتاه‌شده تا سقف فهرست ادمین. */
interface ProductOption {
  id: number;
  name: string;
  slug: string;
}

/**
 * آدرس نهایی لینک را از مقصد انتخابی می‌سازد. رشته‌ی خالی یعنی «بدون دکمه»؛
 * شناسه‌ی ناشناخته هم به رشته‌ی خالی می‌رسد تا هیچ آدرس ساختگی ساخته نشود.
 */
function resolveLinkPath(
  values: SlideFormValues,
  categories: readonly CategoryOption[],
  products: readonly ProductOption[],
): string {
  const { destination } = values;
  if (destination === HOME_DESTINATION) {
    return HOME_PATH;
  }
  if (destination === PRODUCTS_DESTINATION) {
    return PRODUCTS_PATH;
  }
  if (destination === CART_DESTINATION) {
    return CART_PATH;
  }
  if (destination === CUSTOM_DESTINATION) {
    return values.customPath.trim();
  }
  if (destination.startsWith(CATEGORY_PREFIX)) {
    const id = Number.parseInt(destination.slice(CATEGORY_PREFIX.length), 10);
    const category = categories.find((item) => item.id === id);
    return category === undefined ? "" : categoryPath(category.platform);
  }
  if (destination.startsWith(PRODUCT_PREFIX)) {
    const id = Number.parseInt(destination.slice(PRODUCT_PREFIX.length), 10);
    const product = products.find((item) => item.id === id);
    return product === undefined ? "" : productPath(product.slug);
  }
  return "";
}

/** نگاشت آدرس ذخیره‌شده به گزینه‌ی متناظر (برای صفحه‌ی ویرایش در آینده). */
function initialDestination(linkPath: string | null): string {
  if (linkPath === null) {
    return "";
  }
  if (linkPath === HOME_PATH) {
    return HOME_DESTINATION;
  }
  if (linkPath === PRODUCTS_PATH) {
    return PRODUCTS_DESTINATION;
  }
  if (linkPath === CART_PATH) {
    return CART_DESTINATION;
  }
  return CUSTOM_DESTINATION;
}

/** مقادیر اولیه: از اسلاید بارگذاری‌شده (ویرایش) یا پیش‌فرض‌های امن (ساخت). */
function initialValues(initial?: AdminSlide): SlideFormValues {
  return {
    imageUrl: initial?.imageUrl ?? "",
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    buttonLabel: initial?.buttonLabel ?? "",
    destination: initial === undefined ? "" : initialDestination(initial.linkPath),
    customPath: initial?.linkPath ?? "",
    isActive: initial?.isActive ?? true,
  };
}

/** آینه‌ی کلاینتی قواعد DTO؛ همه‌ی پیام‌ها فارسی و درون‌خطی هستند. */
function validate(
  values: SlideFormValues,
  categories: readonly CategoryOption[],
  products: readonly ProductOption[],
): SlideFieldErrors {
  const errors: SlideFieldErrors = {};

  const image = values.imageUrl.trim();
  if (image.length === 0) {
    errors.image = "تصویر اسلاید الزامی است.";
  } else if (!isRenderableImageSrc(image)) {
    errors.image = "آدرس تصویر معتبر نیست؛ لطفاً تصویر را دوباره بارگذاری کنید.";
  }

  if (values.title.length > TITLE_MAX_LENGTH) {
    errors.title = `عنوان حداکثر ${TITLE_MAX_LENGTH} کاراکتر است.`;
  }
  if (values.subtitle.length > SUBTITLE_MAX_LENGTH) {
    errors.subtitle = `زیرعنوان حداکثر ${SUBTITLE_MAX_LENGTH} کاراکتر است.`;
  }
  if (values.buttonLabel.length > BUTTON_LABEL_MAX_LENGTH) {
    errors.buttonLabel = `برچسب دکمه حداکثر ${BUTTON_LABEL_MAX_LENGTH} کاراکتر است.`;
  }

  if (values.destination === CUSTOM_DESTINATION) {
    const path = values.customPath.trim();
    if (path.length > CUSTOM_PATH_MAX_LENGTH) {
      errors.customPath = `مسیر حداکثر ${CUSTOM_PATH_MAX_LENGTH} کاراکتر است.`;
    } else if (path.length > 0 && !INTERNAL_PATH_PATTERN.test(path)) {
      errors.customPath =
        "مسیر باید داخلی باشد و با یک «/» شروع شود (مثلاً /products)؛ «//» و فاصله مجاز نیست.";
    }
  }

  // قاعده‌ی دکمه: برچسب و مقصد یا هر دو پر باشند یا هر دو خالی.
  const linkPath = resolveLinkPath(values, categories, products);
  const hasLabel = values.buttonLabel.trim().length > 0;
  if (hasLabel !== (linkPath.length > 0)) {
    errors.button =
      "برچسب دکمه و مقصد لینک باید هر دو پر شوند یا هر دو خالی بمانند.";
  }

  return errors;
}

/**
 * بدنه‌ی دقیق POST /admin/slides: فقط کلیدهای مجاز DTO، فیلدهای اختیاری خالی
 * حذف می‌شوند (هرگز "") و `sortOrder` هرگز فرستاده نمی‌شود.
 */
function buildPayload(values: SlideFormValues, linkPath: string): SlideInput {
  const payload: SlideInput = {
    imageUrl: values.imageUrl.trim(),
    isActive: values.isActive,
  };

  const title = values.title.trim();
  if (title.length > 0) payload.title = title;

  const subtitle = values.subtitle.trim();
  if (subtitle.length > 0) payload.subtitle = subtitle;

  const buttonLabel = values.buttonLabel.trim();
  if (buttonLabel.length > 0) payload.buttonLabel = buttonLabel;

  if (linkPath.length > 0) payload.linkPath = linkPath;

  return payload;
}

/**
 * پیام فارسی هر شکست. برای ۴۰۰/۴۰۹ پیام خود بک‌اند نمایش داده می‌شود (مثل
 * «حداکثر ۱۰ اسلاید») چون متن کاربرپسند است؛ بقیه‌ی وضعیت‌ها پیام ثابت دارند و
 * بدنه‌ی خام پاسخ هرگز رندر یا لاگ نمی‌شود.
 */
function describeSlideError(error: unknown): string {
  const fallback = "خطایی رخ داد؛ لطفاً دوباره تلاش کنید.";
  if (!isApiError(error)) {
    return fallback;
  }
  if (error.isNetworkError) {
    return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
  }
  if (error.status === 401) {
    return "اعتبار ورود منقضی شده است؛ لطفاً دوباره وارد شوید.";
  }
  if (error.status === 403) {
    return "شما به این بخش دسترسی ندارید.";
  }
  if (error.status === 400 || error.status === 409) {
    const message = typeof error.message === "string" ? error.message.trim() : "";
    return message.length > 0
      ? message
      : "داده‌های ارسالی نامعتبر است؛ مقادیر واردشده را بررسی کنید.";
  }
  return fallback;
}

interface TextFieldProps {
  label: string;
  name: SlideFieldName;
  values: SlideFormValues;
  errors: SlideFieldErrors;
  onChange: (name: SlideFieldName, value: string) => void;
  dir?: "ltr";
  multiline?: boolean;
}

/** یک ورودی/متن‌چندخطی برچسب‌دار به‌همراه خطای فارسی همان فیلد. */
function TextField({
  label,
  name,
  values,
  errors,
  onChange,
  dir,
  multiline,
}: TextFieldProps) {
  const common = {
    dir,
    className: INPUT_CLASS,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(name, event.target.value),
  };
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {multiline === true ? (
        <textarea rows={3} {...common} />
      ) : (
        <input type="text" {...common} />
      )}
      {errors[name] !== undefined ? (
        <p className={ERROR_CLASS}>{errors[name]}</p>
      ) : null}
    </label>
  );
}

const SECONDARY_BUTTON_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const SUBMIT_BUTTON_CLASS =
  "rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

interface SlideFormProps {
  /** Only "create" submits for now; "edit" is the future edit page. */
  mode: "create" | "edit";
  /** In edit mode: the guarded slide row loaded by the server page. */
  initial?: AdminSlide;
  /** دسته‌بندی‌های فعال، برای گزینه‌های مقصد. */
  categories: CategoryOption[];
  /** محصولات فعال (کوتاه‌شده توسط صفحه‌ی سروری)، برای گزینه‌های مقصد. */
  products: ProductOption[];
}

/**
 * فرم مشترک ساخت/ویرایش اسلاید. فقط فیلدهای مجاز DTO از راه `apiFetch`
 * فرستاده می‌شوند (POST /admin/slides؛ روی بک‌اند @Roles(ADMIN))، `sortOrder`
 * هرگز ارسال نمی‌شود و ترتیب نمایش فقط از راه صفحه‌ی فهرست تغییر می‌کند. پس از
 * موفقیت به فهرست اسلایدها برمی‌گردد و مسیر را تازه می‌کند.
 */
export function SlideForm({
  mode,
  initial,
  categories,
  products,
}: SlideFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SlideFormValues>(() =>
    initialValues(initial),
  );
  const [errors, setErrors] = useState<SlideFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const linkPath = resolveLinkPath(values, categories, products);
  const imagePreview = values.imageUrl.trim();

  function update<K extends keyof SlideFormValues>(
    field: K,
    value: SlideFormValues[K],
  ): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (mode !== "create") {
      setFormError("ویرایش اسلاید هنوز فعال نشده است.");
      return;
    }
    const fieldErrors = validate(values, categories, products);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createSlide(buildPayload(values, linkPath), apiFetch);
      router.push("/admin/slides");
      router.refresh();
    } catch (error) {
      setFormError(describeSlideError(error));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? (
        <p
          role="alert"
          className="rounded-md border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm font-medium text-red-700"
        >
          {formError}
        </p>
      ) : null}

      <div>
        <span className="block text-sm font-medium text-foreground">
          تصویر اسلاید
        </span>
        <div className="mt-1.5">
          <ImageUploader
            onUploaded={(url) => update("imageUrl", url)}
            disabled={submitting}
          />
        </div>
        {imagePreview.length > 0 && isRenderableImageSrc(imagePreview) ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- تصویر اسلاید از هر میزبان بک‌اندی می‌آید، پس به‌جای next/image از img ساده استفاده می‌شود */}
            <img
              src={imagePreview}
              alt="پیش‌نمایش تصویر اسلاید"
              referrerPolicy="no-referrer"
              className="h-24 w-40 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              onClick={() => update("imageUrl", "")}
              disabled={submitting}
              className={SECONDARY_BUTTON_CLASS}
            >
              حذف تصویر
            </button>
          </div>
        ) : null}
        {errors.image !== undefined ? (
          <p className={ERROR_CLASS}>{errors.image}</p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="عنوان"
          name="title"
          values={values}
          errors={errors}
          onChange={update}
        />
        <TextField
          label="زیرعنوان"
          name="subtitle"
          values={values}
          errors={errors}
          onChange={update}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="برچسب دکمه"
          name="buttonLabel"
          values={values}
          errors={errors}
          onChange={update}
        />
        <label className="block text-sm font-medium text-foreground">
          مقصد دکمه
          <select
            className={INPUT_CLASS}
            value={values.destination}
            onChange={(event) => update("destination", event.target.value)}
          >
            <option value="">بدون مقصد (اسلاید بدون دکمه)</option>
            <option value={HOME_DESTINATION}>صفحه اصلی</option>
            <option value={PRODUCTS_DESTINATION}>همه محصولات</option>
            <option value={CART_DESTINATION}>سبد خرید</option>
            {categories.length > 0 ? (
              <optgroup label="دسته‌بندی‌ها">
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={`${CATEGORY_PREFIX}${category.id}`}
                  >
                    {category.name} — {platformLabel(category.platform)}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {products.length > 0 ? (
              <optgroup label="محصولات">
                {products.map((product) => (
                  <option
                    key={product.id}
                    value={`${PRODUCT_PREFIX}${product.id}`}
                  >
                    {product.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <option value={CUSTOM_DESTINATION}>مسیر سفارشی داخلی</option>
          </select>
        </label>
      </div>

      {errors.button !== undefined ? (
        <p role="alert" className={ERROR_CLASS}>
          {errors.button}
        </p>
      ) : null}

      {values.destination === CUSTOM_DESTINATION ? (
        <div>
          <TextField
            label="مسیر سفارشی (داخلی)"
            name="customPath"
            values={values}
            errors={errors}
            onChange={update}
            dir="ltr"
          />
          <p className={HINT_CLASS}>
            مسیر باید با یک «/» شروع شود؛ خالی گذاشتن آن یعنی اسلاید بدون دکمه.
          </p>
        </div>
      ) : null}

      <p className="text-sm text-foreground/60">
        آدرس نهایی لینک:{" "}
        <span dir="ltr" className="font-mono text-xs text-foreground/80">
          {linkPath.length > 0 ? linkPath : "—"}
        </span>
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={values.isActive}
          onChange={(event) => update("isActive", event.target.checked)}
        />
        فعال باشد
      </label>

      <button
        type="submit"
        disabled={submitting}
        className={SUBMIT_BUTTON_CLASS}
      >
        {submitting
          ? "در حال ذخیره…"
          : mode === "create"
            ? "افزودن اسلاید"
            : "ذخیره تغییرات"}
      </button>
    </form>
  );
}

