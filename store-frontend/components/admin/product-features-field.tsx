"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  FEATURES_MAX_COUNT,
  FEATURE_MAX_LENGTH,
} from "@/components/admin/product-specs";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const BUTTON_CLASS =
  "rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

interface ProductFeaturesFieldProps {
  /** فهرست قابلیت‌ها؛ هر ردیف یک مقدار متنی آزاد. */
  value: string[];
  onChange: (next: string[]) => void;
  /** خطای اعتبارسنجی همین فیلد (فارسی). */
  error?: string;
  disabled?: boolean;
}

/**
 * ویرایش فهرست «قابلیت‌ها»: افزودن با دکمه یا Enter و حذف هر ردیف با دکمهٔ
 * خودش. متن ردیف‌ها فقط به‌صورت متن رندر می‌شود (بدون HTML) و سقف تعداد/طول
 * پیش از افزودن بررسی می‌شود.
 */
export function ProductFeaturesField({
  value,
  onChange,
  error,
  disabled = false,
}: ProductFeaturesFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function add(): void {
    const item = draft.trim();
    if (item.length === 0) {
      return;
    }
    if (value.length >= FEATURES_MAX_COUNT) {
      setNotice(`حداکثر ${FEATURES_MAX_COUNT} قابلیت مجاز است.`);
      return;
    }
    if (item.length > FEATURE_MAX_LENGTH) {
      setNotice(`هر قابلیت حداکثر ${FEATURE_MAX_LENGTH} کاراکتر است.`);
      return;
    }
    if (value.includes(item)) {
      setNotice("این قابلیت قبلاً افزوده شده است.");
      return;
    }
    setNotice(null);
    setDraft("");
    onChange([...value, item]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    // Enter داخل فرم باید ردیف را اضافه کند، نه فرم را بفرستد.
    if (event.key === "Enter") {
      event.preventDefault();
      add();
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        قابلیت‌ها
      </label>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <li
              key={`${index}-${item}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground"
            >
              <span>{item}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}
                className={BUTTON_CLASS}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          maxLength={FEATURE_MAX_LENGTH}
          disabled={disabled}
          placeholder="مثلاً ضد آب"
          onChange={(event) => {
            setNotice(null);
            setDraft(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          className={`${INPUT_CLASS} flex-1 disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <button type="button" disabled={disabled} onClick={add} className={BUTTON_CLASS}>
          افزودن
        </button>
      </div>

      {error !== undefined ? <p className={ERROR_CLASS}>{error}</p> : null}
      {notice !== null ? <p className={ERROR_CLASS}>{notice}</p> : null}
    </div>
  );
}
