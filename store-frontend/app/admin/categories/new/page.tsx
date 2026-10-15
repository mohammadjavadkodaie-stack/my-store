import Link from "next/link";
import { CategoryForm } from "@/components/admin/category-form";

/**
 * Admin create-category page. A Server Component wrapper around the shared
 * client CategoryForm; the actual POST /categories happens in the form with
 * the admin's cookie (the endpoint is @Roles(ADMIN) on the backend).
 */
export default function NewAdminCategoryPage() {
  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">
        افزودن دسته‌بندی
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        دسته‌بندی جدید برای محصولات فروشگاه بسازید.
      </p>

      <div className="mt-6">
        <CategoryForm mode="create" />
      </div>

      <Link
        href="/admin/categories"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        بازگشت به فهرست دسته‌بندی‌ها
      </Link>
    </section>
  );
}
