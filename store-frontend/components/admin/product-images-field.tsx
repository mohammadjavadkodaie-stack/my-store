"use client";

import { useId, useState } from "react";
import { ImageUploader } from "@/components/admin/image-uploader";
import {
  IMAGES_MAX_COUNT,
  isValidImageValue,
} from "@/components/admin/product-form-helpers";

const ROW_INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ROW_BUTTON_CLASS =
  "rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";
const LIMIT_MESSAGE = "حداکثر ۱۰ تصویر مجاز است";
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toPersianDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

interface ProductImagesFieldProps {
  /** آدرس تصاویر؛ ردیف اول تصویر اصلی است. */
  value: string[];
  onChange: (next: string[]) => void;
  /** خطای اعتبارسنجی همین فیلد (فارسی). */
  error?: string;
  disabled?: boolean;
}

/**
 * ویرایش دستی ردیف‌های تصویر به‌همراه بارگذاری فایل. مقدار هر ردیف متن
 * نامطمئن است و فقط برای پیش‌نمایش از isValidImageValue استفاده می‌شود؛
 * پیش‌نمایش با img ساده و بدون ارجاع‌دهنده رندر می‌شود.
 */
export function ProductImagesField({
  value,
  onChange,
  error,
  disabled = false,
}: ProductImagesFieldProps) {
  const rowIdPrefix = useId();
  const [limitReached, setLimitReached] = useState(false);

  function replaceRow(index: number, next: string): void {
    onChange(value.map((row, rowIndex) => (rowIndex === index ? next : row)));
  }

  function removeRow(index: number): void {
    setLimitReached(false);
    onChange(value.filter((_, rowIndex) => rowIndex !== index));
  }

  function moveRowUp(index: number): void {
    if (index === 0) {
      return;
    }
    const next = [...value];
    const previous = next[index - 1] ?? "";
    next[index - 1] = next[index] ?? "";
    next[index] = previous;
    onChange(next);
  }

  function handleUploaded(url: string): void {
    if (value.length >= IMAGES_MAX_COUNT) {
      setLimitReached(true);
      return;
    }
    setLimitReached(false);
    onChange([...value, url]);
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-foreground">تصاویر محصول</span>

      {value.map((row, index) => (
        <div key={`${rowIdPrefix}-${index}`} className="space-y-2 rounded-md border border-border p-3">
          <label htmlFor={`${rowIdPrefix}-${index}`} className="block text-xs font-medium text-foreground/70">
            {index === 0 ? "تصویر اصلی" : `تصویر ${toPersianDigits(index + 1)}`}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`${rowIdPrefix}-${index}`}
              type="text"
              dir="ltr"
              value={row}
              disabled={disabled}
              onChange={(event) => replaceRow(index, event.target.value)}
              className={`${ROW_INPUT_CLASS} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
            />
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => moveRowUp(index)}
              className={ROW_BUTTON_CLASS}
            >
              بالا
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeRow(index)}
              className={ROW_BUTTON_CLASS}
            >
              حذف
            </button>
          </div>
          {isValidImageValue(row) ? (
            <img
              src={row}
              alt=""
              referrerPolicy="no-referrer"
              className="size-16 rounded-md border border-border object-cover"
            />
          ) : null}
        </div>
      ))}

      {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
      {limitReached ? <p className={ERROR_CLASS}>{LIMIT_MESSAGE}</p> : null}

      <ImageUploader onUploaded={handleUploaded} disabled={disabled} />
    </div>
  );
}
