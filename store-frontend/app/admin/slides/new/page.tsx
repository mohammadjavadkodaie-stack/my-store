import Link from "next/link";
import { SlideForm } from "@/components/admin/slide-form";
import { getAdminCategories } from "@/lib/api/admin-categories";
import { getAdminProducts } from "@/lib/api/admin-products";
import { serverFetch } from "@/lib/api/server";

const BACK_LINK_CLASS =
  "mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const NOTE_CLASS =
  "mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70";

/**
 * سقف گزینه‌های محصول در select مقصد: یک صفحه از فهرست ادمین، که خودِ بک‌اند
 * هم `limit` را روی ۵۰ می‌بندد (query-products.dto.ts).
 */
const PRODUCT_OPTION_LIMIT = 50;

const faNumber = new Intl.NumberFormat("fa-IR");

/**
 * Admin create-slide page. A Server Component wrapper that loads the category
 * and product options of the form's destination select and renders the shared
 * client SlideForm; the actual POST /admin/slides happens in the form with the
 * admin's cookie (the endpoint is @Roles(ADMIN) on the backend).
 *
 * Only the first page of ACTIVE products is offered, so the select stays small;
 * the form itself never sends `sortOrder`.
 */
export default async function NewAdminSlidePage() {
  const [categories, products] = await Promise.all([
    getAdminCategories(serverFetch),
    getAdminProducts(serverFetch, {
      isActive: "true",
      page: 1,
      limit: PRODUCT_OPTION_LIMIT,
    }),
  ]);

  if (categories === null) {
    return (
      <section className="rounded-lg border border-border bg-background p-8">
        <h1 className="text-xl font-extrabold text-foreground">
          افزودن اسلاید
        </h1>
        <p className={NOTE_CLASS}>
          دریافت فهرست دسته‌بندی‌ها ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
        <Link href="/admin/slides" className={BACK_LINK_CLASS}>
          بازگشت به فهرست اسلایدها
        </Link>
      </section>
    );
  }

  const productOptions =
    products?.items.map(({ id, name, slug }) => ({ id, name, slug })) ?? [];
  const productsTruncated =
    products !== null && products.total > productOptions.length;

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">افزودن اسلاید</h1>
      <p className="mt-2 text-sm text-foreground/60">
        اسلاید جدید صفحه‌ی اصلی را بسازید؛ تصویر الزامی است و برچسب دکمه و مقصد
        باید با هم پر شوند یا هر دو خالی بمانند.
      </p>

      {categories.length === 0 ? (
        <p className={NOTE_CLASS}>
          دسته‌بندی فعالی وجود ندارد؛ فقط مقصدهای ثابت، محصولات و مسیر سفارشی
          قابل انتخاب‌اند.
        </p>
      ) : null}

      {products === null ? (
        <p className={NOTE_CLASS}>
          دریافت فهرست محصولات ممکن نشد؛ گزینه‌ی محصول در دسترس نیست.
        </p>
      ) : null}

      {productsTruncated ? (
        <p className={NOTE_CLASS}>
          برای انتخاب محصول فقط {faNumber.format(PRODUCT_OPTION_LIMIT)} محصول
          فعال اول نمایش داده می‌شود.
        </p>
      ) : null}

      <div className="mt-6">
        <SlideForm
          mode="create"
          categories={categories.map(({ id, name, platform }) => ({
            id,
            name,
            platform,
          }))}
          products={productOptions}
        />
      </div>

      <Link href="/admin/slides" className={BACK_LINK_CLASS}>
        بازگشت به فهرست اسلایدها
      </Link>
    </section>
  );
}
