import type { Metadata } from "next";
import Link from "next/link";
import { AccountLogoutButton } from "@/components/account/logout-button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "حساب کاربری",
  robots: { index: false, follow: false },
};

/**
 * Surface of one dashboard tile: the same border/background/padding tokens the
 * admin dashboard cards use (app/admin/page.tsx), only sized as a square tile
 * so two of them sit side by side instead of stretching full width. Compact on
 * phones (a full-width square would waste a whole screen), square from `sm` up.
 */
const TILE_CLASS =
  "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 text-center text-base font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:aspect-square sm:min-h-0";

/** Primary action link, same style the other account pages use. */
const PRIMARY_LINK_CLASS =
  "inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type InfoRowProps = {
  label: string;
  value: string;
  /** Phone-like values are always rendered left-to-right. */
  ltr?: boolean;
};

/** One labelled row of the account details card. */
function InfoRow({ label, value, ltr = false }: InfoRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-foreground/60">{label}</dt>
      <dd
        dir={ltr ? "ltr" : undefined}
        className="text-sm font-medium text-foreground"
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Account page (Server Component). requireUser redirects anonymous visitors to
 * /login?next=/account, so the page body only ever renders for a real session.
 *
 * Laid out like the admin dashboard: one full-width details card with the
 * labelled account rows and the edit action, then the square tiles grid, and
 * the logout block at the very bottom.
 */
export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold text-foreground">حساب کاربری</h1>

      {/* Full-width account details: the read-only rows plus the one edit
          entry point (/account/profile). */}
      <section className="mt-6 rounded-lg border border-border bg-background p-6">
        <h2 className="text-base font-bold text-foreground">اطلاعات کاربری</h2>
        <dl className="mt-4 flex flex-col gap-3">
          <InfoRow label="نام" value={user.firstName} />
          <InfoRow label="نام خانوادگی" value={user.lastName} />
          <InfoRow label="شماره موبایل" value={user.phone} ltr />
        </dl>
        <Link href="/account/profile" className={`mt-5 ${PRIMARY_LINK_CLASS}`}>
          ویرایش
        </Link>
      </section>

      {/* Same responsive grid as the admin dashboard cards, two square tiles
          side by side from `sm` up. */}
      <nav
        aria-label="بخش‌های حساب کاربری"
        className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Link href="/orders" className={TILE_CLASS}>
          سفارش‌های من
        </Link>
        <Link href="/account/addresses" className={TILE_CLASS}>
          آدرس‌ها
        </Link>
      </nav>

      {/* Last block of the page: the only logout entry point, deliberately
          separated from the account details above. */}
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-base font-bold text-foreground">خروج از حساب</h2>
        <p className="mt-2 text-sm text-foreground/70">
          برای پایان دادن به نشست خود از دکمه زیر استفاده کنید.
        </p>
        <div className="mt-4">
          <AccountLogoutButton />
        </div>
      </section>
    </div>
  );
}
