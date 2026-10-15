"use client";

import { useState } from "react";
import Link from "next/link";
import { digitsOnly } from "@/lib/price-input";
import type { ProductFilterOptions } from "@/lib/api/filters";
import type { ProductQuery, ProductSort } from "@/lib/api/types";
import { splitFilterValues } from "@/lib/products-query";

/**
 * Filter panel: a plain `<form method="get" action="/products">` that the browser
 * submits itself. The two price fields are the only interactive part (they turn
 * Persian/Arabic digits and stray characters into plain ASCII digits), which is
 * why this is a Client Component that still works without JS.
 *
 * On mobile it collapses into a native `<details>`; on desktop it is a sidebar
 * column. Both variants render their own `<form>` (sharing {@link FiltersForm}),
 * which keeps hidden inputs from being submitted twice.
 *
 * The brand/genre/region groups only exist when the backend answered
 * GET /products/filters: `options` is null when that call failed, and the panel
 * then falls back to the filters that need no option list.
 */

type ProductFiltersProps = {
  query: ProductQuery;
  /** Option lists from GET /products/filters; null when unavailable. */
  options?: ProductFilterOptions | null;
};

const SORT_OPTIONS: ReadonlyArray<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "جدیدترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
  { value: "best_selling", label: "پرفروش‌ترین" },
  { value: "discount", label: "بیشترین تخفیف" },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const FIELD_CLASS = `w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ${FOCUS_RING}`;

const CHECKBOX_CLASS = `size-4 rounded border-border text-primary ${FOCUS_RING}`;

const RADIO_CLASS = `size-4 border-border text-primary ${FOCUS_RING}`;

/** Option lists can be long, so every group scrolls instead of stretching. */
const OPTION_LIST_CLASS = "flex max-h-48 flex-col gap-2 overflow-y-auto pe-1";

const OPTION_LABEL_CLASS = "flex items-start gap-2 text-sm text-foreground/80";

const OPTION_TEXT_CLASS = "min-w-0 break-words";

const BUTTON_CLASS = `rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS_RING}`;

const RESET_CLASS = `rounded-xl border border-border px-4 py-2 text-center text-sm font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_RING}`;

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

/** Checkbox group (brand or genre); renders nothing without options. */
function CheckboxGroup({
  legend,
  name,
  values,
  selected,
}: {
  legend: string;
  name: "brand" | "genre";
  values: string[];
  selected: ReadonlySet<string>;
}) {
  if (values.length === 0) {
    return null;
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold text-foreground">{legend}</legend>
      <div className={OPTION_LIST_CLASS}>
        {values.map((value) => (
          <label key={value} className={OPTION_LABEL_CLASS}>
            <input
              type="checkbox"
              name={name}
              value={value}
              defaultChecked={selected.has(value)}
              className={CHECKBOX_CLASS}
            />
            <span className={OPTION_TEXT_CLASS}>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Single-choice region group. The "همه" radio submits an empty `region`, which
 * the parser drops, so choosing it clears the filter.
 */
function RegionGroup({
  values,
  selected,
}: {
  values: string[];
  selected: string | undefined;
}) {
  if (values.length === 0) {
    return null;
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-bold text-foreground">ریجن</legend>
      <div className={OPTION_LIST_CLASS}>
        <label className={OPTION_LABEL_CLASS}>
          <input
            type="radio"
            name="region"
            value=""
            defaultChecked={selected === undefined}
            className={RADIO_CLASS}
          />
          <span className={OPTION_TEXT_CLASS}>همه</span>
        </label>
        {values.map((value) => (
          <label key={value} className={OPTION_LABEL_CLASS}>
            <input
              type="radio"
              name="region"
              value={value}
              defaultChecked={selected === value}
              className={RADIO_CLASS}
            />
            <span className={OPTION_TEXT_CLASS}>{value}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const PRICE_INPUT_MAX_DIGITS = 10;

/**
 * Manual price input: `type="text"` so no spinner arrows are rendered. Digits
 * typed or pasted are converted to ASCII and every non-digit is dropped, capped
 * at {@link PRICE_INPUT_MAX_DIGITS} characters, so the submitted value is always
 * plain English digits (digitsOnly in lib/price-input.ts).
 */
function PriceInput({
  name,
  defaultValue,
  placeholder,
}: {
  name: "minPrice" | "maxPrice";
  defaultValue: string | number | undefined;
  placeholder: string | undefined;
}) {
  const [value, setValue] = useState(() =>
    defaultValue === undefined ? "" : String(defaultValue),
  );

  return (
    <input
      type="text"
      inputMode="numeric"
      dir="ltr"
      name={name}
      value={value}
      onChange={(event) =>
        setValue(digitsOnly(event.target.value).slice(0, PRICE_INPUT_MAX_DIGITS))
      }
      placeholder={placeholder}
      className={FIELD_CLASS}
    />
  );
}

/** The actual filter fields; rendered once per responsive variant. */
function FiltersForm({ query, options }: ProductFiltersProps) {
  const selectedBrands = new Set(splitFilterValues(query.brand));
  const selectedGenres = new Set(splitFilterValues(query.genre));
  // Placeholders only; the real range comes from the backend option lists.
  const pricePlaceholder = options
    ? {
        min: faNumberFormatter.format(options.price.min),
        max: faNumberFormatter.format(options.price.max),
      }
    : null;

  return (
    <form method="get" action="/products" className="flex flex-col gap-5">
      {query.platform !== undefined && (
        <input type="hidden" name="platform" value={query.platform} />
      )}
      {query.q !== undefined && <input type="hidden" name="q" value={query.q} />}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">وضعیت کالا</p>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            name="inStock"
            value="true"
            defaultChecked={query.inStock === "true"}
            className={CHECKBOX_CLASS}
          />
          فقط کالاهای موجود
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            name="onSale"
            value="true"
            defaultChecked={query.onSale === "true"}
            className={CHECKBOX_CLASS}
          />
          فقط تخفیف‌دار
        </label>
      </div>

      {options && (
        <>
          <CheckboxGroup
            legend="برند"
            name="brand"
            values={options.brands}
            selected={selectedBrands}
          />
          <CheckboxGroup
            legend="ژانر"
            name="genre"
            values={options.genres}
            selected={selectedGenres}
          />
          <RegionGroup values={options.regions} selected={query.region} />
        </>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-foreground">محدوده قیمت</p>
        <label className="flex flex-col gap-1 text-sm text-foreground/80">
          حداقل قیمت (تومان)
          <PriceInput
            name="minPrice"
            placeholder={pricePlaceholder?.min}
            defaultValue={query.minPrice}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground/80">
          حداکثر قیمت (تومان)
          <PriceInput
            name="maxPrice"
            placeholder={pricePlaceholder?.max}
            defaultValue={query.maxPrice}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-foreground/80">
        ترتیب نمایش
        <select
          name="sort"
          defaultValue={query.sort ?? "newest"}
          className={FIELD_CLASS}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <button type="submit" className={BUTTON_CLASS}>
          اعمال فیلتر
        </button>
        <Link href="/products" className={RESET_CLASS}>
          حذف فیلترها
        </Link>
      </div>
    </form>
  );
}

export function ProductFilters({ query, options }: ProductFiltersProps) {
  return (
    <>
      <details className="rounded-2xl border border-border bg-background lg:hidden">
        <summary className={`cursor-pointer px-4 py-3 text-sm font-bold text-foreground ${FOCUS_RING}`}>
          فیلترها
        </summary>
        <div className="overflow-x-auto border-t border-border p-4">
          <FiltersForm query={query} options={options} />
        </div>
      </details>

      <aside aria-label="فیلترها" className="hidden lg:block">
        <div className="rounded-2xl border border-border bg-background p-4">
          <h2 className="mb-4 text-sm font-bold text-foreground">فیلترها</h2>
          <FiltersForm query={query} options={options} />
        </div>
      </aside>
    </>
  );
}
