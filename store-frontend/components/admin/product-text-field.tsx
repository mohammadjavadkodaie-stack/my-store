"use client";

import type { ChangeEvent } from "react";
import type {
  ProductFieldErrors,
  ProductFormValues,
} from "@/components/admin/product-form-helpers";
import { digitsOnly } from "@/lib/price-input";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

/** بیشترین تعداد رقم ورودی عددی: STOCK_MAX یعنی ۱٬۰۰۰٬۰۰۰ که هفت رقم است. */
const NUMERIC_MAX_DIGITS = 7;

/**
 * ورودی عددی ساده (بدون جداکنندهٔ هزارگان): ارقام فارسی/عربی به ASCII تبدیل و
 * هر کاراکتر غیررقمی — چه تایپ‌شده و چه paste‌شده — حذف می‌شود
 * (digitsOnly در lib/price-input.ts). مقدار state همیشه رقم خالص است و
 * تبدیل نهایی به عدد در buildPayload انجام می‌شود.
 */
function formatNumeric(value: string): string {
  return digitsOnly(value).slice(0, NUMERIC_MAX_DIGITS);
}

/** The text-ish keys the shared field component below can render. */
export type ProductTextFieldName =
  | "name"
  | "description"
  | "stock"
  | "brand"
  | "sku"
  | "weight";

interface ProductTextFieldProps {
  label: string;
  name: ProductTextFieldName;
  values: ProductFormValues;
  errors: ProductFieldErrors;
  onChange: (name: ProductTextFieldName, value: string) => void;
  dir?: "ltr";
  multiline?: boolean;
  /** ورودی عددی: فقط رقم (تبدیل ارقام فارسی/عربی) با حداکثر هفت رقم. */
  numeric?: boolean;
}

/** One labelled input/textarea plus its per-field Persian error underneath. */
export function ProductTextField({
  label,
  name,
  values,
  errors,
  onChange,
  dir,
  multiline,
  numeric,
}: ProductTextFieldProps) {
  const isNumeric = numeric === true;
  const common = {
    dir,
    inputMode: isNumeric ? ("numeric" as const) : undefined,
    className: INPUT_CLASS,
    value: values[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(name, isNumeric ? formatNumeric(event.target.value) : event.target.value),
  };
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      {multiline === true ? (
        <textarea rows={5} {...common} />
      ) : (
        <input type="text" {...common} />
      )}
      {errors[name] !== undefined ? (
        <p className={ERROR_CLASS}>{errors[name]}</p>
      ) : null}
    </label>
  );
}
