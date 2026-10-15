"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  PLATFORM_LABELS,
  PLATFORM_VALUES,
  isPlatform,
  type AdminCategory,
} from "@/lib/api/admin-categories";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";
import type { Platform } from "@/lib/api/types";
import { ImageUploader } from "@/components/admin/image-uploader";

/** Limits and rules mirrored from the backend DTOs (create/update-category.dto.ts). */
const NAME_MAX_LENGTH = 200;
const SLUG_MAX_LENGTH = 120;
/** حروف کوچک انگلیسی، عدد و خط تیره (SLUG_PATTERN در بک‌اند). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** فقط مسیر ریشه‌دار یا URL کامل https برای پیش‌نمایش بی‌خطر است. */
const PREVIEWABLE_IMAGE_PATTERN = /^(?:\/|https:\/\/)\S+$/;

type CategoryField = "name" | "slug" | "platform";
type FieldErrors = Partial<Record<CategoryField, string>>;

interface CategoryPayload {
  name: string;
  slug: string;
  platform: Platform;
  image?: string | null;
  isActive?: boolean;
}

interface CategoryFormProps {
  mode: "create" | "edit";
  /** In edit mode: the guarded category row loaded by the server page. */
  category?: AdminCategory;
}

/**
 * Maps a failed request to one fixed Persian message per status. The backend's
 * own message/details are never rendered — they may leak internal or user data.
 */
function describeApiError(error: unknown): string {
  if (isApiError(error)) {
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
      return "دسته‌بندی مورد نظر پیدا نشد.";
    }
    if (error.status === 409) {
      return "دسته‌بندی تکراری است؛ نام یا اسلاگ دیگری انتخاب کنید.";
    }
    if (error.isNetworkError) {
      return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
    }
  }
  return "خطایی رخ داد؛ لطفاً دوباره تلاش کنید.";
}

/** Client-side mirror of the create/update DTO rules; all messages in Persian. */
function validateFields(input: {
  name: string;
  slug: string;
  platform: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (input.name.trim().length === 0) {
    errors.name = "نام دسته‌بندی الزامی است.";
  } else if (input.name.length > NAME_MAX_LENGTH) {
    errors.name = `نام دسته‌بندی حداکثر ${NAME_MAX_LENGTH} کاراکتر است.`;
  }

  const trimmedSlug = input.slug.trim();
  if (trimmedSlug.length === 0) {
    errors.slug = "اسلاگ الزامی است.";
  } else if (input.slug.length > SLUG_MAX_LENGTH) {
    errors.slug = `اسلاگ حداکثر ${SLUG_MAX_LENGTH} کاراکتر است.`;
  } else if (!SLUG_PATTERN.test(trimmedSlug)) {
    errors.slug =
      "اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد.";
  }

  if (!isPlatform(input.platform)) {
    errors.platform = "انتخاب پلتفرم الزامی است.";
  }

  return errors;
}

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";

const PRIMARY_BUTTON_CLASS =
  "rounded-md bg-primary px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY_LINK_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const DANGER_BUTTON_CLASS =
  "rounded-md border border-red-600/40 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The one form shared by the create and edit admin pages. It only submits the
 * fields of the backend create/update DTOs through `apiFetch` (POST
 * /categories or PATCH /categories/:id, admin-only on the backend), then
 * refreshes the route and returns to the list.
 *
 * In edit mode a single hide action (the update DTO's optional `isActive`)
 * sits behind a confirm step and PATCHes `{ isActive: false }`; the backend has
 * no delete endpoint and none is called from here.
 */
export function CategoryForm({ mode, category }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const current = isEdit ? category : undefined;

  const [name, setName] = useState(current?.name ?? "");
  const [slug, setSlug] = useState(current?.slug ?? "");
  const [platform, setPlatform] = useState(current?.platform ?? "");
  const [image, setImage] = useState(current?.image ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hiding, setHiding] = useState(false);

  // تصویر بارگذاری‌شده یا آدرس فعلی؛ فقط مقادیر ریشه‌دار/https پیش‌نمایش می‌شوند.
  const trimmedImage = image.trim();
  const imagePreview =
    trimmedImage.length > 0 && PREVIEWABLE_IMAGE_PATTERN.test(trimmedImage)
      ? trimmedImage
      : null;

  function clearFieldError(field: CategoryField) {
    setFieldErrors((previous) => {
      if (previous[field] === undefined) {
        return previous;
      }
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || hiding) {
      return;
    }
    setFormError(null);

    const errors = validateFields({ name, slug, platform });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (isEdit && current === undefined) {
      setFormError("دسته‌بندی برای ویرایش یافت نشد.");
      return;
    }
    if (!isPlatform(platform)) {
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    const payload: CategoryPayload = {
      name: name.trim(),
      slug: slug.trim(),
      platform,
    };
    if (trimmedImage.length > 0) {
      payload.image = trimmedImage;
    } else if (isEdit && current?.image != null) {
      // ارسال null تصویر فعلی را پاک می‌کند (update DTO: image می‌تواند null باشد)
      payload.image = null;
    }
    if (!isEdit) {
      // دسته‌بندی تازه‌ساخته‌شده همیشه فعال است.
      payload.isActive = true;
    }

    const request =
      current !== undefined
        ? { path: `/categories/${current.id}`, method: "PATCH" as const }
        : { path: "/categories", method: "POST" as const };

    try {
      await apiFetch<unknown>(request.path, {
        method: request.method,
        body: payload,
      });
      router.refresh();
      router.push("/admin/categories");
    } catch (error) {
      setFormError(describeApiError(error));
      setSubmitting(false);
    }
  }

  /**
   * «حذف» در این پنل یعنی پنهان‌کردن: PATCH /categories/:id با { isActive: false }.
   * بک‌اند هیچ مسیر DELETE ندارد و از این‌جا هم فرستاده نمی‌شود.
   */
  async function handleHide() {
    if (current === undefined || submitting || hiding) {
      return;
    }
    const confirmed = window.confirm(
      "این دسته‌بندی از پنل و سایت پنهان می‌شود. ادامه می‌دهید؟",
    );
    if (!confirmed) {
      return;
    }

    setHiding(true);
    setFormError(null);
    try {
      await apiFetch<unknown>(`/categories/${current.id}`, {
        method: "PATCH",
        body: { isActive: false },
      });
      router.refresh();
      router.push("/admin/categories");
    } catch (error) {
      setFormError(describeApiError(error));
      setHiding(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        autoComplete="off"
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="category-name"
              className="block text-sm font-medium text-foreground"
            >
              نام دسته‌بندی{" "}
              <span aria-hidden="true" className="text-red-600">
                *
              </span>
            </label>
            <input
              id="category-name"
              name="name"
              type="text"
              value={name}
              dir="auto"
              aria-required="true"
              aria-invalid={fieldErrors.name !== undefined}
              aria-describedby={
                fieldErrors.name !== undefined
                  ? "category-name-error"
                  : undefined
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setName(event.target.value);
                clearFieldError("name");
              }}
              className={`${INPUT_CLASS} mt-1.5`}
            />
            {fieldErrors.name !== undefined ? (
              <p
                id="category-name-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="category-slug"
              className="block text-sm font-medium text-foreground"
            >
              اسلاگ{" "}
              <span aria-hidden="true" className="text-red-600">
                *
              </span>
            </label>
            <input
              id="category-slug"
              name="slug"
              type="text"
              value={slug}
              dir="ltr"
              placeholder="action-games"
              aria-required="true"
              aria-invalid={fieldErrors.slug !== undefined}
              aria-describedby={
                fieldErrors.slug !== undefined
                  ? "category-slug-error"
                  : undefined
              }
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setSlug(event.target.value);
                clearFieldError("slug");
              }}
              className={`${INPUT_CLASS} mt-1.5`}
            />
            <p className="mt-1 text-xs text-foreground/50">
              فقط حروف کوچک انگلیسی، عدد و خط تیره.
            </p>
            {fieldErrors.slug !== undefined ? (
              <p
                id="category-slug-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.slug}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="category-platform"
              className="block text-sm font-medium text-foreground"
            >
              پلتفرم{" "}
              <span aria-hidden="true" className="text-red-600">
                *
              </span>
            </label>
            <select
              id="category-platform"
              name="platform"
              value={platform}
              aria-required="true"
              aria-invalid={fieldErrors.platform !== undefined}
              aria-describedby={
                fieldErrors.platform !== undefined
                  ? "category-platform-error"
                  : undefined
              }
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                setPlatform(event.target.value);
                clearFieldError("platform");
              }}
              className={`${INPUT_CLASS} mt-1.5`}
            >
              <option value="" disabled>
                انتخاب کنید
              </option>
              {PLATFORM_VALUES.map((value) => (
                <option key={value} value={value}>
                  {PLATFORM_LABELS[value]}
                </option>
              ))}
            </select>
            {fieldErrors.platform !== undefined ? (
              <p
                id="category-platform-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {fieldErrors.platform}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <p className="block text-sm font-medium text-foreground">
              تصویر (اختیاری)
            </p>
            {imagePreview !== null ? (
              // eslint-disable-next-line @next/next/no-img-element -- تصویرهای آپلودشده با تگ ساده‌ی img نمایش داده می‌شوند
              <img
                src={imagePreview}
                alt="پیش‌نمایش تصویر دسته‌بندی"
                referrerPolicy="no-referrer"
                className="mt-1.5 h-24 w-24 rounded-md border border-border object-cover"
              />
            ) : null}
            <div className="mt-2">
              <ImageUploader
                onUploaded={setImage}
                disabled={submitting || hiding}
              />
            </div>
            {trimmedImage.length > 0 ? (
              <button
                type="button"
                onClick={() => setImage("")}
                disabled={submitting || hiding}
                className={`mt-2 ${DANGER_BUTTON_CLASS}`}
              >
                حذف تصویر
              </button>
            ) : null}
          </div>
        </div>

        {formError !== null ? (
          <p
            role="alert"
            className="rounded-md border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm font-medium text-red-700"
          >
            {formError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || hiding}
            className={PRIMARY_BUTTON_CLASS}
          >
            {submitting
              ? "در حال ذخیره…"
              : isEdit
                ? "ذخیره تغییرات"
                : "افزودن دسته‌بندی"}
          </button>
          <Link href="/admin/categories" className={SECONDARY_LINK_CLASS}>
            انصراف
          </Link>
        </div>
      </form>

      {isEdit ? (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground">حذف دسته‌بندی</p>
          <p className="mt-1 text-xs text-foreground/50">
            با حذف، این دسته‌بندی از پنل مدیریت و از فروشگاه پنهان می‌شود.
          </p>
          <button
            type="button"
            onClick={handleHide}
            disabled={submitting || hiding}
            className={`mt-3 ${DANGER_BUTTON_CLASS}`}
          >
            {hiding ? "در حال حذف…" : "حذف دسته‌بندی"}
          </button>
        </div>
      ) : null}
    </div>
  );
}





