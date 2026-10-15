"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { AdminProductDetail } from "@/lib/api/admin-products";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";
import {
  buildPayload,
  describeProductError,
  generateSlug,
  initialValues,
  validateProduct,
  type ProductFieldErrors,
  type ProductFormValues,
} from "@/components/admin/product-form-helpers";
import { ProductImagesField } from "@/components/admin/product-images-field";
import { ProductPriceField } from "@/components/admin/product-price-field";
import { ProductTextField } from "@/components/admin/product-text-field";
import { ProductFeaturesField } from "@/components/admin/product-features-field";
import { ProductDimensionsField } from "@/components/admin/product-dimensions-field";
import { ProductConnectionTypesField } from "@/components/admin/product-connection-types-field";

interface ProductFormProps {
  mode: "create" | "edit";
  /** In edit mode: the guarded product row loaded by the server page. */
  product?: AdminProductDetail;
  /** Options of the category <select>; only id + name are used here. */
  categories: { id: number; name: string }[];
}

const INPUT_CLASS = "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";

/** اسلاگ تکراری: پاسخ ۴۰۹ یا ۴۰۰ که به slug اشاره می‌کند. */
function isDuplicateSlug(error: unknown): boolean {
  if (!isApiError(error)) {
    return false;
  }
  return (
    error.status === 409 ||
    (error.status === 400 &&
      /slug/i.test([error.code ?? "", ...(error.details ?? [])].join(" ")))
  );
}

/**
 * The one form shared by the create and edit admin pages: it submits only the
 * DTO-whitelisted fields through `apiFetch` (POST /products or PATCH
 * /products/:id, admin-only on the backend), then refreshes the route and
 * returns to the list. genres ride along unchanged; the slug is generated on
 * create and sent untouched on edit, and there is deliberately no delete
 * anywhere.
 */
export function ProductForm({ mode, product, categories }: ProductFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(() => initialValues(product));
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    const isCreate = mode === "create";
    const request =
      mode === "edit" && product !== undefined
        ? { path: `/products/${product.id}`, method: "PATCH" as const }
        : { path: "/products", method: "POST" as const };
    // اسلاگ ورودی ندارد: در ایجاد همین‌جا ساخته می‌شود و در ویرایش دست‌نخورده می‌ماند.
    let candidate: ProductFormValues = isCreate
      ? { ...values, slug: generateSlug() }
      : values;
    const fieldErrors = validateProduct(candidate);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setFormError(null);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await apiFetch<unknown>(request.path, {
          method: request.method,
          body: buildPayload(candidate, mode),
        });
        router.refresh();
        router.push("/admin/products");
        return;
      } catch (error) {
        // اسلاگ تکراری: یک بار با اسلاگ تازه دوباره تلاش می‌شود.
        if (!isCreate || attempt > 0 || !isDuplicateSlug(error)) {
          setFormError(describeProductError(error));
          setSubmitting(false);
          return;
        }
        candidate = { ...candidate, slug: generateSlug() };
        setValues(candidate);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? (
        <p className="rounded-md border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm font-medium text-red-700">{formError}</p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <ProductTextField label="نام محصول" name="name" values={values} errors={errors} onChange={update} />
        <ProductPriceField label="قیمت (تومان)" value={values.price} error={errors.price} onChange={(next) => update("price", next)} disabled={submitting} />
        <ProductPriceField label="قیمت پیش از تخفیف (تومان)" value={values.compareAtPrice} error={errors.compareAtPrice} onChange={(next) => update("compareAtPrice", next)} disabled={submitting} />
        <ProductTextField label="موجودی" name="stock" values={values} errors={errors} onChange={update} dir="ltr" numeric />
        <ProductTextField label="برند" name="brand" values={values} errors={errors} onChange={update} />
        <ProductTextField label="کد کالا (SKU)" name="sku" values={values} errors={errors} onChange={update} dir="ltr" />
        <ProductTextField label="وزن (کیلوگرم)" name="weight" values={values} errors={errors} onChange={update} dir="ltr" />
      </div>

      <ProductFeaturesField value={values.features} onChange={(next) => update("features", next)} error={errors.features} disabled={submitting} />

      <ProductDimensionsField
        value={{ length: values.length, width: values.width }}
        onChange={(next) => {
          update("length", next.length);
          update("width", next.width);
        }}
        error={errors.length ?? errors.width}
        disabled={submitting}
      />

      <ProductConnectionTypesField value={values.connectionTypes} onChange={(next) => update("connectionTypes", next)} error={errors.connectionTypes} disabled={submitting} />

      <ProductTextField label="توضیحات" name="description" values={values} errors={errors} onChange={update} multiline />

      <label className="block text-sm font-medium text-foreground">
        دسته‌بندی
        <select className={INPUT_CLASS} value={values.categoryId} onChange={(event) => update("categoryId", event.target.value)}>
          <option value="">انتخاب دسته‌بندی</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId !== undefined ? <p className={ERROR_CLASS}>{errors.categoryId}</p> : null}
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={values.isActive} onChange={(event) => update("isActive", event.target.checked)} />
          فعال باشد
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input type="checkbox" className="size-4 accent-primary" checked={values.isFeatured} onChange={(event) => update("isFeatured", event.target.checked)} />
          پیشنهاد ویژه باشد
        </label>
      </div>

      <ProductImagesField
        value={values.images}
        onChange={(next) => update("images", next)}
        error={errors.images}
        disabled={submitting}
      />

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "در حال ذخیره…" : mode === "create" ? "افزودن محصول" : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
