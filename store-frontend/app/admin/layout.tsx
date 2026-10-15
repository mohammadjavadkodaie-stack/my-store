import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

/** Sidebar entries: the dashboard plus one placeholder page per section. */
const ADMIN_NAV = [
  { href: "/admin", label: "داشبورد" },
  { href: "/admin/categories", label: "دسته‌بندی‌ها" },
  { href: "/admin/slides", label: "اسلایدها" },
  { href: "/admin/products", label: "محصولات" },
  { href: "/admin/orders", label: "سفارش‌ها" },
  { href: "/admin/reports", label: "گزارش مالی" },
] as const;

// The auth check below must run on every request: nothing under /admin may be
// cached or prerendered (the cookies() read inside getCurrentUser already
// opts these routes into dynamic rendering — this makes it explicit).
export const dynamic = "force-dynamic";

// Inherited by every child route: keep the whole panel out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * RTL layout for the admin panel: a sidebar with the section links (same
 * border/background/primary tokens as the site header) beside the content.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  // Same request-scoped, React-cached read the site header performs. The
  // helper awaits cookies() itself, so the visitor's auth cookie is forwarded
  // to the backend /me call automatically — no extra wiring needed here.
  const user = await getCurrentUser();

  // UI-only gating: hiding the panel from guests and non-admins is not a
  // security boundary — the real protection is the backend @Roles(ADMIN)
  // guard on every admin endpoint. Everyone else sees the regular 404 page.
  if (user === null || user.role !== "ADMIN") {
    notFound();
  }

  return (
    <div
      dir="rtl"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row"
    >
      <aside className="w-full shrink-0 lg:w-56">
        <nav
          aria-label="پنل مدیریت"
          className="flex flex-wrap gap-2 rounded-lg border border-border bg-background p-3 lg:flex-col"
        >
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
