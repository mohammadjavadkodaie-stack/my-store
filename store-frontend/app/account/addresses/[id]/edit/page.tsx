import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AddressForm } from "@/components/account/address-form";
import { getAddresses } from "@/lib/api/addresses";
import { serverFetch } from "@/lib/api/server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ویرایش آدرس",
  robots: { index: false, follow: false },
};

/** Same back link as the other account pages. */
const BACK_LINK_CLASS =
  "inline-block rounded-md text-sm font-bold text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface EditAddressPageProps {
  /** Next 16: route params are a Promise. */
  params: Promise<{ id: string }>;
}

/**
 * Edit-address page (Server Component). requireUser redirects anonymous
 * visitors to /login?next=<this path>, so the form only ever renders for a real
 * session.
 *
 * The backend exposes no GET /addresses/:id, so the row is located inside the
 * full GET /addresses list of the signed-in visitor. An id that is not a
 * positive integer, or that is not in that list (unknown or belonging to
 * somebody else — the backend scopes the list by cookie), gets the same
 * "آدرس یافت نشد" message: a foreign id must not reveal that the row exists.
 *
 * The phone shown by the form comes from the session; the PATCH itself is made
 * client-side by the shared AddressForm with the allowed fields only.
 */
export default async function EditAddressPage({
  params,
}: EditAddressPageProps) {
  const { id } = await params;
  const user = await requireUser(`/account/addresses/${id}/edit`);

  // Mirror the backend's ParseIntPipe: only a positive integer id is valid.
  const addressId = /^\d+$/.test(id) ? Number(id) : null;

  // An invalid id cannot match anything, so the list is not fetched for it.
  const addresses =
    addressId === null ? null : await getAddresses(serverFetch);
  const address =
    addresses?.find((item) => item.id === addressId) ?? undefined;

  let body: ReactNode;
  if (addresses === null && addressId !== null) {
    // Backend unreachable / unexpected payload — not "missing", so a retry hint
    // is more useful than "not found".
    body = (
      <p className="rounded-2xl border border-border bg-primary/5 p-4 text-sm leading-6 text-foreground/70">
        دریافت اطلاعات آدرس ممکن نشد؛ لطفاً دوباره تلاش کنید.
      </p>
    );
  } else if (address === undefined) {
    body = (
      <p className="rounded-2xl border border-border bg-primary/5 p-4 text-sm leading-6 text-foreground/70">
        آدرس یافت نشد.
      </p>
    );
  } else {
    body = <AddressForm phone={user.phone} address={address} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link href="/account/addresses" className={BACK_LINK_CLASS}>
        بازگشت به آدرس‌های من
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-foreground">
        ویرایش آدرس
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-background p-6">
        {body}
      </section>
    </div>
  );
}
