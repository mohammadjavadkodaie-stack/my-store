"use client";

import { useId } from "react";
import { CONNECTION_TYPES, SPEC_KEY_CONNECTION } from "@/components/admin/product-specs";

const CHIP_CLASS =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const CHIP_OFF_CLASS = "border-border text-foreground hover:bg-primary/10 hover:text-primary";
const CHIP_ON_CLASS = "border-primary bg-primary/10 text-primary";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

interface ProductConnectionTypesFieldProps {
  /** برچسب‌های انتخاب‌شده از فهرست ثابت؛ ترتیب نهایی همان ترتیب CONNECTION_TYPES است. */
  value: string[];
  onChange: (next: string[]) => void;
  /** خطای اعتبارسنجی همین فیلد (فارسی). */
  error?: string;
  disabled?: boolean;
}

/**
 * انتخاب چندگانهٔ «نوع اتصال» به‌صورت چیپ‌های قابل کلیک؛ تعداد انتخاب محدود
 * نیست. هر چیپ یک دکمه با aria-pressed است و برچسب‌ها فقط از CONNECTION_TYPES
 * می‌آیند، پس مقدار نامعتبر ساخته نمی‌شود. مقادیر ناشناختهٔ قبلی محصول اینجا
 * نمایش داده نمی‌شوند و در product-specs.ts جداگانه حفظ می‌شوند.
 */
export function ProductConnectionTypesField({
  value,
  onChange,
  error,
  disabled = false,
}: ProductConnectionTypesFieldProps) {
  const labelId = useId();

  function toggle(label: string): void {
    // ترتیب فهرست ثابت حفظ می‌شود تا مقدار ذخیره‌شده پایدار بماند.
    onChange(
      CONNECTION_TYPES.filter((item) =>
        item === label ? !value.includes(item) : value.includes(item),
      ),
    );
  }

  return (
    <div className="space-y-2">
      <span id={labelId} className="block text-sm font-medium text-foreground">
        {SPEC_KEY_CONNECTION}
      </span>

      <div
        role="group"
        aria-labelledby={labelId}
        aria-invalid={error !== undefined}
        className="flex flex-wrap gap-2"
      >
        {CONNECTION_TYPES.map((item) => {
          const selected = value.includes(item);
          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(item)}
              className={`${CHIP_CLASS} ${selected ? CHIP_ON_CLASS : CHIP_OFF_CLASS}`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
    </div>
  );
}
