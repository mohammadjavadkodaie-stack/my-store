import type { Metadata } from "next";
import Link from "next/link";
import { AddressList } from "@/components/account/address-list";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "آدرس‌های من",
  robots: { index: false, follow: false },
};

/**
 * Addresses page (Server Component). requireUser redirects anonymous visitors to
 * /login?next=/account/addresses, so the list only ever renders for a real
 * session.
 *
 * The account phone is read server-side and passed down once: it belongs to the
 * account, not to an address (GET /addresses never returns a phone). The list
 * itself is fetched and mutated by the client component through the /api proxy.
 */
export default async function AccountAddressesPage() {
  const user = await requireUser("/account/addresses");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/account"
        className="inline-block rounded-md text-sm font-bold text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        بازگشت به حساب کاربری
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-foreground">
        آدرس‌های من
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-background p-6">
        <AddressList phone={user.phone} />
      </section>
    </div>
  );
}
