"use client";

import { useId } from "react";
import { formatDecimalInput } from "@/lib/price-input";
import { SPEC_KEY_LENGTH, SPEC_KEY_WIDTH } from "@/components/admin/product-specs";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

/** مقدار هر بُعد همان رشته‌ای است که در specs ذخیره می‌شود. */
export interface ProductDimensionsValue {
  length: string;
  width: string;
}

interface ProductDimensionsFieldProps {
  /** طول و عرض؛ هر دو رشتهٔ خام ورودی (تبدیل رقم‌ها در همین فیلد انجام می‌شود). */
  value: ProductDimensionsValue;
  onChange: (next: ProductDimensionsValue) => void;
  /** خطای اعتبارسنجی همین فیلد (فارسی). */
  error?: string;
  disabled?: boolean;
}

/**
 * دو ورودی عددی جدا برای ابعاد محصول. رقم‌های فارسی/عربی به ASCII تبدیل
 * می‌شوند و فقط رقم و یک نقطه پذیرفته می‌شود؛ علامت منفی در ورودی راه ندارد.
 * اعتبارسنجی نهایی (مثبت بودن و سقف) با product-specs.ts است.
 */
export function ProductDimensionsField({
  value,
  onChange,
  error,
  disabled = false,
}: ProductDimensionsFieldProps) {
  const lengthId = useId();
  const widthId = useId();
  const invalid = error !== undefined;

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={lengthId}
            className="block text-sm font-medium text-foreground"
          >
            {SPEC_KEY_LENGTH}
          </label>
          <input
            id={lengthId}
            type="text"
            inputMode="decimal"
            value={value.length}
            disabled={disabled}
            aria-invalid={invalid}
            placeholder="مثلاً ۲۵.۵"
            onChange={(event) =>
              onChange({
                ...value,
                length: formatDecimalInput(event.target.value),
              })
            }
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          />
        </div>

        <div>
          <label
            htmlFor={widthId}
            className="block text-sm font-medium text-foreground"
          >
            {SPEC_KEY_WIDTH}
          </label>
          <input
            id={widthId}
            type="text"
            inputMode="decimal"
            value={value.width}
            disabled={disabled}
            aria-invalid={invalid}
            placeholder="مثلاً ۱۵"
            onChange={(event) =>
              onChange({
                ...value,
                width: formatDecimalInput(event.target.value),
              })
            }
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          />
        </div>
      </div>

      {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
    </div>
  );
}
