import Link from "next/link";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { getAdminProducts, type AdminProduct } from "@/lib/api/admin-products";
import { formatPrice } from "@/lib/format";
import { serverFetch } from "@/lib/api/server";

/** Focus-ring + link styles copied from the category list. */
const RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const LINK_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary " +
  RING;
const ROW_LINK_CLASS = `text-sm font-medium text-primary hover:underline ${RING}`;
const FIELD_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground " +
  RING;
const DISABLED_CLASS =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground/40";
const TH_CLASS = "px-3 py-2 text-start font-medium";
const TD_CLASS = "px-3 py-3 text-foreground/80";
const MESSAGE_CLASS =
  "mt-6 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70";

/** Table columns rendered from one list; the action cell is separate. */
const COLUMNS = ["نام", "دسته‌بندی", "قیمت", "موجودی", "وضعیت"] as const;

/** Fixed page size and whitelist bounds for the query parameters. */
const LIMIT = 20;
const MAX_Q = 100;
const MAX_PAGE = 10000;

const faNumber = new Intl.NumberFormat("fa-IR");

type SearchParams = Record<string, string | string[] | undefined>;
type ActiveFilter = "true" | "false" | undefined;

/** First value of a repeated query parameter, or "" when absent. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return typeof value === "string" ? value : "";
}

/** `page` whitelist: integers in [1, MAX_PAGE]; anything else is page 1. */
function parsePage(value: string): number {
  if (!/^\d{1,5}$/.test(value)) {
    return 1;
  }
  return Math.min(Math.max(Number(value), 1), MAX_PAGE);
}

/** `q` is trimmed and capped at the backend's 100-character limit. */
function parseQuery(value: string): string {
  return value.trim().slice(0, MAX_Q);
}

/** `isActive` only ever leaves this page as "true" or "false". */
function parseIsActive(value: string): ActiveFilter {
  return value === "true" || value === "false" ? value : undefined;
}

/** Rebuilds a list URL from the whitelisted filters only. */
function listHref(page: number, q: string, isActive: ActiveFilter): string {
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
  }
  if (isActive) {
    params.set("isActive", isActive);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search ? `/admin/products?${search}` : "/admin/products";
}

/** Active filter pill: highlighted when selected, muted otherwise. */
function filterClass(active: boolean): string {
  const tone = active
    ? "border-primary/40 bg-primary/10 font-bold text-primary"
    : "border-border text-foreground/70 hover:bg-primary/10 hover:text-primary";
  return `rounded-md border px-3 py-1.5 text-sm font-medium ${RING} ${tone}`;
}

/** Active/inactive pill; green for active, muted for inactive. */
function StatusBadge({ active }: { active: boolean }) {
  const tone = active
    ? "border-green-600/30 bg-green-600/10 text-green-700"
    : "border-border bg-foreground/5 text-foreground/60";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`}
    >
      {active ? "فعال" : "غیرفعال"}
    </span>
  );
}

/** One row; every cell renders only runtime-guarded (untrusted) text. */
function ProductRow({ product }: { product: AdminProduct }) {
  return (
    <tr className="border-b border-border/60 last:border-b-0">
      <td className="px-3 py-3 font-medium text-foreground">{product.name}</td>
      <td className={TD_CLASS}>{product.category.name}</td>
      <td className={TD_CLASS}>{formatPrice(product.price)}</td>
      <td className={TD_CLASS}>{faNumber.format(product.stock)}</td>
      <td className="px-3 py-3">
        <StatusBadge active={product.isActive} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className={ROW_LINK_CLASS}
          >
            ویرایش
          </Link>
          <ProductRowActions product={product} />
        </div>
      </td>
    </tr>
  );
}

/**
 * Admin product list: name, category, price, stock and status for one page of
 * GET /admin/products, plus links to create and edit.
 *
 * Server Component: the rows come from the backend's @Roles(ADMIN) endpoint
 * through serverFetch, so the call carries the admin's cookie. Every query
 * parameter is whitelisted here (page, limit, q, isActive) — nothing is
 * forwarded verbatim, and any failure collapses to one fixed Persian message.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parsePage(firstValue(params.page));
  const q = parseQuery(firstValue(params.q));
  const isActive = parseIsActive(firstValue(params.isActive));

  const result = await getAdminProducts(serverFetch, {
    q: q || undefined,
    isActive,
    page,
    limit: LIMIT,
  });
  const totalPages =
    result === null ? 1 : Math.max(1, Math.ceil(result.total / LIMIT));

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">محصولات</h1>
          <p className="mt-2 text-sm text-foreground/60">
            فهرست محصولات، شامل فعال و غیرفعال.
          </p>
        </div>
        <Link href="/admin/products/new" className={LINK_CLASS}>
          افزودن محصول
        </Link>
      </div>

      <form
        method="get"
        action="/admin/products"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[220px] flex-1">
          <label htmlFor="q" className="mb-1 block text-sm text-foreground/70">
            جست‌وجو
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={MAX_Q}
            placeholder="نام محصول"
            className={FIELD_CLASS}
          />
        </div>
        {isActive ? (
          <input type="hidden" name="isActive" value={isActive} />
        ) : null}
        <button type="submit" className={LINK_CLASS}>
          جست‌وجو
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={listHref(1, q, undefined)}
          className={filterClass(!isActive)}
          aria-current={!isActive ? "page" : undefined}
        >
          همه
        </Link>
        <Link
          href={listHref(1, q, "true")}
          className={filterClass(isActive === "true")}
          aria-current={isActive === "true" ? "page" : undefined}
        >
          فعال
        </Link>
        <Link
          href={listHref(1, q, "false")}
          className={filterClass(isActive === "false")}
          aria-current={isActive === "false" ? "page" : undefined}
        >
          غیرفعال
        </Link>
      </div>

      {result === null ? (
        <p className={MESSAGE_CLASS}>
          دریافت فهرست محصولات ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
      ) : result.items.length === 0 ? (
        <p className={MESSAGE_CLASS}>محصولی یافت نشد.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-start text-foreground/60">
                  {COLUMNS.map((label) => (
                    <th key={label} scope="col" className={TH_CLASS}>
                      {label}
                    </th>
                  ))}
                  <th scope="col" className={TH_CLASS}>
                    <span className="sr-only">عملیات</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="صفحه‌بندی"
            className="mt-6 flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm text-foreground/60">
              مجموع {faNumber.format(result.total)} محصول — صفحه{" "}
              {faNumber.format(page)} از {faNumber.format(totalPages)}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <Link
                  href={listHref(page - 1, q, isActive)}
                  className={LINK_CLASS}
                >
                  قبلی
                </Link>
              ) : (
                <span aria-disabled="true" className={DISABLED_CLASS}>
                  قبلی
                </span>
              )}
              {page < totalPages ? (
                <Link
                  href={listHref(page + 1, q, isActive)}
                  className={LINK_CLASS}
                >
                  بعدی
                </Link>
              ) : (
                <span aria-disabled="true" className={DISABLED_CLASS}>
                  بعدی
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </section>
  );
}


