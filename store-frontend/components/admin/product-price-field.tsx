"use client";

import { useId } from "react";
import { formatPriceInput } from "@/lib/price-input";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

interface ProductPriceFieldProps {
  label: string;
  /** رشتهٔ قالب‌بندی‌شده («1,250,000») که در state فرم می‌ماند. */
  value: string;
  onChange: (next: string) => void;
  /** خطای اعتبارسنجی همین فیلد (فارسی). */
  error?: string;
  disabled?: boolean;
}

/**
 * ورودی قیمت به‌صورت متن (نه number) با جداکنندهٔ هزارگان زنده: رقم‌های
 * فارسی/عربی به ASCII تبدیل و جداکننده‌ها خودکار درج می‌شوند
 * (formatPriceInput در lib/price-input.ts). مقدار state همان رشتهٔ
 * قالب‌بندی‌شده است و تبدیل نهایی به عدد در buildPayload انجام می‌شود.
 */
export function ProductPriceField({
  label,
  value,
  onChange,
  error,
  disabled = false,
}: ProductPriceFieldProps) {
  const inputId = useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        dir="ltr"
        value={value}
        disabled={disabled}
        aria-invalid={error !== undefined}
        placeholder="۰"
        onChange={(event) => onChange(formatPriceInput(event.target.value))}
        className={INPUT_CLASS}
      />
      {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
    </div>
  );
}
