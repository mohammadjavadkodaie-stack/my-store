"use client";

import { useId, useState } from "react";
import type { ChangeEvent } from "react";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";

/** سقف حجم و فرمت‌های مجاز بارگذاری (uploads.controller.ts). */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT = ACCEPTED_TYPES.join(",");
const UPLOAD_PATH = "/admin/uploads/images";

const FILE_LABEL_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary";
const GENERIC_UPLOAD_ERROR =
  "بارگذاری تصویر ناموفق بود؛ لطفاً دوباره تلاش کنید.";

/** پیام ثابت فارسی هر وضعیت؛ متن خطای سرور هرگز نمایش داده نمی‌شود. */
const UPLOAD_ERRORS: Readonly<Record<number, string>> = {
  400: "فایل انتخاب‌شده معتبر نیست؛ فقط تصویر JPG، PNG یا WebP مجاز است.",
  401: "اعتبار ورود منقضی شده است؛ لطفاً دوباره وارد شوید.",
  403: "شما به این بخش دسترسی ندارید.",
  413: "حجم تصویر بیش از حد مجاز است؛ حداکثر ۲ مگابایت.",
  415: "فایل انتخاب‌شده معتبر نیست؛ فقط تصویر JPG، PNG یا WebP مجاز است.",
  429: "تعداد بارگذاری‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
};

function describeUploadError(error: unknown): string {
  if (!isApiError(error)) {
    return GENERIC_UPLOAD_ERROR;
  }
  if (error.isNetworkError) {
    return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
  }
  return UPLOAD_ERRORS[error.status] ?? GENERIC_UPLOAD_ERROR;
}

/** آدرس تصویر را از پاسخ نامطمئن سرور بیرون می‌کشد. */
function readUploadedUrl(value: unknown): string | null {
  const url = (value as Record<string, unknown> | null)?.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

interface ImageUploaderProps {
  /** آدرس تصویر ذخیره‌شده روی سرور. */
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

/**
 * بارگذاری تصویر با POST /admin/uploads/images (multipart، فیلد «file»).
 * بررسی نوع و حجم سمت کلاینت فقط برای راحتی کاربر است؛ اعتبار نهایی با سرور
 * است و تا پایان بارگذاری ورودی غیرفعال می‌ماند.
 */
export function ImageUploader({
  onUploaded,
  disabled = false,
}: ImageUploaderProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = uploading || disabled;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // انتخاب دوباره‌ی همان فایل پس از خطا ممکن بماند
    if (file === undefined || busy) {
      return;
    }
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("فقط تصویر JPG، PNG یا WebP مجاز است.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("حجم تصویر بیش از حد مجاز است؛ حداکثر ۲ مگابایت.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      // FormData دست‌نخورده ارسال می‌شود؛ هدر Content-Type دستی ست نمی‌شود.
      const response = await apiFetch<unknown>(UPLOAD_PATH, {
        method: "POST",
        body,
      });
      const url = readUploadedUrl(response);
      if (url === null) {
        setError(GENERIC_UPLOAD_ERROR);
        return;
      }
      onUploaded(url);
    } catch (uploadError) {
      setError(describeUploadError(uploadError));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="inline-flex flex-wrap items-center gap-3 rounded-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background">
        <label htmlFor={inputId} className={`${FILE_LABEL_CLASS} ${busy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
          انتخاب تصویر
        </label>
        <input id={inputId} type="file" accept={ACCEPT} onChange={handleChange} disabled={busy} className="sr-only" />
        {uploading ? <span className="text-xs font-medium text-foreground/60">در حال بارگذاری…</span> : null}
      </div>
      <p className="mt-1 text-xs text-foreground/50">JPG، PNG یا WebP؛ حداکثر ۲ مگابایت.</p>
      {error !== null ? <p role="alert" className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
