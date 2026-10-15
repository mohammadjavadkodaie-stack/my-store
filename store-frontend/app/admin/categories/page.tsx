import Link from "next/link";
import {
  getAdminCategories,
  platformLabel,
  type AdminCategory,
} from "@/lib/api/admin-categories";
import { serverFetch } from "@/lib/api/server";

/** Same link style as the quick links on the dashboard. */
const ACTION_LINK_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Small in-row action link. */
const ROW_LINK_CLASS =
  "text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Active/inactive pill; green for active, muted for inactive. */
function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full border border-green-600/30 bg-green-600/10 px-2.5 py-0.5 text-xs font-bold text-green-700">
      فعال
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-border bg-foreground/5 px-2.5 py-0.5 text-xs font-bold text-foreground/60">
      غیرفعال
    </span>
  );
}

/** One row; every cell renders only runtime-guarded (untrusted) text. */
function CategoryRow({ category }: { category: AdminCategory }) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-3 py-3 font-medium text-foreground">{category.name}</td>
      <td className="px-3 py-3" dir="ltr">
        <span className="font-mono text-xs text-foreground/70">
          {category.slug}
        </span>
      </td>
      <td className="px-3 py-3 text-foreground/80">
        {platformLabel(category.platform)}
      </td>
      <td className="px-3 py-3">
        <StatusBadge active={category.isActive} />
      </td>
      <td className="px-3 py-3 text-end">
        <Link
          href={`/admin/categories/${category.id}/edit`}
          className={ROW_LINK_CLASS}
        >
          ویرایش
        </Link>
      </td>
    </tr>
  );
}

/**
 * Admin category list: the active categories with name, slug, platform and
 * status, plus links to create and edit.
 *
 * Server Component: the rows come from the backend's @Roles(ADMIN) endpoint
 * GET /admin/categories through serverFetch, so the calls carry the admin's
 * cookie. Deactivated ("deleted") categories are filtered out by
 * getAdminCategories, so they never reach this table. Any failure or untrusted
 * payload collapses to one generic Persian message — never a raw server message
 * or status code. There is no delete action anywhere.
 */
export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories(serverFetch);

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">
            دسته‌بندی‌ها
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            فهرست دسته‌بندی‌های فعال؛ دسته‌بندی حذف‌شده در پنل و سایت پنهان
            می‌شود.
          </p>
        </div>
        <Link href="/admin/categories/new" className={ACTION_LINK_CLASS}>
          افزودن دسته‌بندی
        </Link>
      </div>

      {categories === null ? (
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت فهرست دسته‌بندی‌ها ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
      ) : categories.length === 0 ? (
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دسته‌بندی‌ای یافت نشد.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-start text-foreground/60">
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  نام
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  اسلاگ
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  پلتفرم
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  وضعیت
                </th>
                <th scope="col" className="px-3 py-2 text-start font-medium">
                  <span className="sr-only">عملیات</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

