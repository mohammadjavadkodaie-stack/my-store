import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import {
  getAdminCategories,
  type AdminCategory,
} from "@/lib/api/admin-categories";
import { serverFetch } from "@/lib/api/server";

interface EditCategoryPageProps {
  /** Next 16: route params are a Promise. */
  params: Promise<{ id: string }>;
}

const BACK_LINK_CLASS =
  "mt-6 inline-block text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Admin edit-category page. The backend exposes no single-item admin endpoint,
 * so the category is located inside the full GET /admin/categories list (which
 * also contains inactive rows) and rendered by the shared client CategoryForm,
 * which PATCHes /categories/:id.
 */
export default async function EditCategoryPage({
  params,
}: EditCategoryPageProps) {
  const { id } = await params;

  // Mirror the backend's ParseIntPipe: only a positive integer id is valid.
  const categoryId = /^\d+$/.test(id) ? Number(id) : null;

  let failedToLoad = false;
  let category: AdminCategory | undefined;

  if (categoryId !== null) {
    const categories = await getAdminCategories(serverFetch);
    if (categories === null) {
      failedToLoad = true;
    } else {
      category = categories.find((item) => item.id === categoryId);
    }
  }

  if (failedToLoad) {
    return (
      <section className="rounded-lg border border-border bg-background p-8">
        <h1 className="text-xl font-extrabold text-foreground">
          ویرایش دسته‌بندی
        </h1>
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت اطلاعات دسته‌بندی ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
        <Link href="/admin/categories" className={BACK_LINK_CLASS}>
          بازگشت به فهرست دسته‌بندی‌ها
        </Link>
      </section>
    );
  }

  // Unknown, non-numeric or missing id => 404, like the backend.
  if (categoryId === null || category === undefined) {
    notFound();
  }

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">
        ویرایش دسته‌بندی
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        مشخصات دسته‌بندی «{category.name}» را ویرایش کنید.
      </p>

      <div className="mt-6">
        <CategoryForm mode="edit" category={category} />
      </div>

      <Link href="/admin/categories" className={BACK_LINK_CLASS}>
        بازگشت به فهرست دسته‌بندی‌ها
      </Link>
    </section>
  );
}
