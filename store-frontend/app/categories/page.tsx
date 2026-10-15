import type { Metadata } from "next";
import { CategoryList } from "@/components/categories/category-list";
import { getCategories } from "@/lib/api/categories";
import { serverFetch } from "@/lib/api/server";
import type { Category } from "@/lib/api/types";

export const metadata: Metadata = { title: "دسته‌بندی‌ها" };

/**
 * Fetches the active categories, best-effort exactly like the home page: the
 * public GET /categories already returns only active categories in backend
 * order, so the payload is used as-is. A failure — a non-2xx response, an
 * unreachable backend or a malformed payload — degrades to an empty list so
 * the page shows a short Persian message instead of an error. The backend caps
 * `limit` at 50, the largest page that still fits one request.
 */
async function fetchCategories(): Promise<Category[]> {
  try {
    const { items } = await getCategories({ limit: 50 }, serverFetch);
    return items;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-foreground">
          دسته‌بندی‌ها
        </h1>
      </header>

      {categories.length === 0 ? (
        <div
          role="status"
          className="rounded-2xl border border-border bg-primary/5 p-6 text-center"
        >
          <p className="text-base font-bold text-foreground">
            دسته‌بندی‌ای برای نمایش وجود ندارد
          </p>
        </div>
      ) : (
        // Full-width horizontal rows instead of the home page's circular grid.
        <CategoryList categories={categories} />
      )}
    </div>
  );
}
