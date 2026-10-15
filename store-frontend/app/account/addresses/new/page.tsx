import type { Metadata } from "next";
import Link from "next/link";
import { AddressForm } from "@/components/account/address-form";
import { getAddresses, MAX_ADDRESSES_PER_USER } from "@/lib/api/addresses";
import { serverFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "افزودن آدرس",
  robots: { index: false, follow: false },
};

/** Same back link as the other account pages. */
const BACK_LINK_CLASS =
  "inline-block rounded-md text-sm font-bold text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Add-address page (Server Component). requireUser redirects anonymous visitors
 * to /login?next=/account/addresses/new, so the form only ever renders for a
 * real session.
 *
 * The backend allows at most MAX_ADDRESSES_PER_USER addresses and answers 400
 * beyond that, so the list is checked here first: at the limit the form is
 * replaced by a short message instead of letting the visitor fill in a form that
 * cannot be saved. The list is read with the visitor's cookie (serverFetch), the
 * phone comes from the session, and the create call itself is made client-side by
 * the shared AddressForm.
 *
 * A failed list call (`null`) shows the form: the count is unknown, and the
 * backend's own Persian message appears in the form's alert box if the limit is
 * in fact reached.
 */
export default async function NewAddressPage() {
  const user = await requireUser("/account/addresses/new");
  const addresses = await getAddresses(serverFetch);
  const atLimit =
    addresses !== null && addresses.length >= MAX_ADDRESSES_PER_USER;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/account/addresses" className={BACK_LINK_CLASS}>
        بازگشت به آدرس‌های من
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-foreground">
        افزودن آدرس
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-background p-6">
        {atLimit ? (
          <p className="rounded-2xl border border-border bg-primary/5 p-4 text-sm leading-6 text-foreground/70">
            حداکثر {MAX_ADDRESSES_PER_USER} آدرس می‌توانید ثبت کنید؛ برای افزودن
            آدرس جدید یکی از آدرس‌های موجود را حذف کنید.
          </p>
        ) : (
          <AddressForm
            phone={user.phone}
            defaultRecipientName={`${user.firstName} ${user.lastName}`.trim()}
          />
        )}
      </section>
    </div>
  );
}
