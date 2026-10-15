import Link from "next/link";
import { serverFetch } from "@/lib/api/server";
import type { Paginated } from "@/lib/api/types";

/**
 * Persian-digit formatter for the card counts (1240 -> "۱٬۲۴۰"), mirroring the
 * private formatter in lib/format.ts, which only exports price/percent helpers.
 */
const faCountFormatter = new Intl.NumberFormat("fa-IR");

/**
 * The smallest page both admin list endpoints accept (the backend validates
 * limit as 1..50). Only the envelope's `total` is needed, so a single row is
 * requested and the returned item itself is never used.
 */
const SMALLEST_PAGE = { page: 1, limit: 1 };

/** Counts shown on the dashboard cards. */
interface DashboardStats {
  /** Every product, active and inactive. */
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  /** Every category, active and inactive. */
  categories: number;
}

/** A backend `total` must be a non-negative integer; anything else is untrusted. */
function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Reads a trustworthy `total` out of a list envelope, or null for anything
 * else. The envelope may also be undefined at runtime: an empty/204 body is
 * resolved as undefined by the shared request helper.
 */
function readTotal(envelope: Paginated<unknown> | undefined): number | null {
  const total = envelope?.total;
  return isCount(total) ? total : null;
}

/**
 * Loads the dashboard counts from the two existing admin list endpoints only:
 * GET /admin/products (once unfiltered, once with isActive=true) and
 * GET /admin/categories, each asked for the smallest possible page. Inactive
 * products are derived (total - active) so the three cards always add up.
 *
 * Every failure — 401/403/5xx, an unreachable backend, or a payload whose
 * `total` is not a trustworthy count — collapses to null: the page then shows
 * one short generic Persian message instead of numbers. Backend error text is
 * neither rendered nor logged (it may contain user data).
 */
async function loadDashboardStats(): Promise<DashboardStats | null> {
  try {
    const [allProductsEnvelope, activeProductsEnvelope, allCategoriesEnvelope] =
      await Promise.all([
        serverFetch<Paginated<unknown>>("/admin/products", {
          query: SMALLEST_PAGE,
        }),
        serverFetch<Paginated<unknown>>("/admin/products", {
          query: { ...SMALLEST_PAGE, isActive: "true" },
        }),
        serverFetch<Paginated<unknown>>("/admin/categories", {
          query: SMALLEST_PAGE,
        }),
      ]);

    const totalProducts = readTotal(allProductsEnvelope);
    const activeProducts = readTotal(activeProductsEnvelope);
    const categories = readTotal(allCategoriesEnvelope);

    if (
      totalProducts === null ||
      activeProducts === null ||
      categories === null
    ) {
      return null;
    }

    return {
      totalProducts,
      activeProducts,
      // Defensive: with untrusted numbers the card must never go negative.
      inactiveProducts: Math.max(0, totalProducts - activeProducts),
      categories,
    };
  } catch {
    return null;
  }
}

type StatCardProps = {
  label: string;
  value: number;
};

/** One stat card: a muted label over a large Persian-digit count. */
function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <dt className="text-sm font-medium text-foreground/60">{label}</dt>
      <dd className="mt-2 text-3xl font-extrabold text-foreground">
        {faCountFormatter.format(value)}
      </dd>
    </div>
  );
}

/** Same link style as the sidebar navigation in the admin layout. */
const QUICK_LINK_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Admin dashboard: overview cards (total/active/inactive products and the
 * number of categories), the placeholder orders card and quick links into the
 * two existing sections.
 *
 * Server Component: the counts come from the backend's own @Roles(ADMIN)
 * endpoints through serverFetch — the same request-scoped helper the auth
 * session uses — so the calls carry the admin's credentials. The admin layout
 * already forces dynamic rendering and serverFetch defaults to no-store, so
 * the numbers are always fresh.
 */
export default async function AdminDashboardPage() {
  const stats = await loadDashboardStats();

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h1 className="text-xl font-extrabold text-foreground">داشبورد</h1>
      <p className="mt-2 text-sm text-foreground/60">
        نمای کلی وضعیت محصولات و دسته‌بندی‌های فروشگاه.
      </p>

      {stats === null ? (
        // Any failed call (401/403/5xx, unreachable backend, untrusted
        // payload) shows this one short generic message — never a raw server
        // message or status code.
        <p className="mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت آمار داشبورد ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
      ) : (
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="کل محصولات" value={stats.totalProducts} />
          <StatCard label="محصولات فعال" value={stats.activeProducts} />
          <StatCard label="محصولات غیرفعال" value={stats.inactiveProducts} />
          <StatCard label="دسته‌بندی‌ها" value={stats.categories} />
        </dl>
      )}

      {/* Placeholder for the orders section: no data, no link — the dashed
          border and reduced opacity keep it visibly out of reach. */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dashed border-border p-4 opacity-60">
          <p className="text-sm font-medium text-foreground/60">سفارش‌ها</p>
          <p className="mt-2 text-lg font-extrabold text-foreground/60">
            به‌زودی
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-base font-bold text-foreground">دسترسی سریع</h2>
      <nav aria-label="دسترسی سریع" className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/categories" className={QUICK_LINK_CLASS}>
          مدیریت دسته‌بندی‌ها
        </Link>
        <Link href="/admin/products" className={QUICK_LINK_CLASS}>
          مدیریت محصولات
        </Link>
      </nav>
    </section>
  );
}

