import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminCategories } from "@/lib/api/admin-categories";
import { serverFetch } from "@/lib/api/server";

const BACK_LINK_CLASS =
  "mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Admin create-product page. A Server Component wrapper that loads the category
 * options of the form's select and renders the shared client ProductForm; the
 * actual POST /products happens in the form with the admin's cookie (the
 * endpoint is @Roles(ADMIN) on the backend).
 */
export default async function NewAdminProductPage() {
  const categories = await getAdminCategories(serverFetch);

  if (categories === null) {
    return (
      <section className="rounded-lg border border-border bg-background p-8">
        <h1 className="text-xl font-extrabold text-foreground">
          افزودن محصول
        </h1>
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت فهرست دسته‌بندی‌ها ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
        <Link href="/admin/products" className={BACK_LINK_CLASS}>
          بازگشت به فهرست محصولات
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">
        افزودن محصول
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        محصول جدید فروشگاه را بسازید؛ تصاویر، ژانرها و مشخصات در گام‌های بعدی
        افزوده می‌شوند.
      </p>

      {categories.length === 0 ? (
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          برای ساختن محصول ابتدا باید حداقل یک دسته‌بندی بسازید.
        </p>
      ) : null}

      <div className="mt-6">
        <ProductForm mode="create" categories={categories} />
      </div>

      <Link href="/admin/products" className={BACK_LINK_CLASS}>
        بازگشت به فهرست محصولات
      </Link>
    </section>
  );
}