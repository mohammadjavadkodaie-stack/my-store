import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/account/profile-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "ویرایش پروفایل",
  robots: { index: false, follow: false },
};

/**
 * Profile page (Server Component). requireUser redirects anonymous visitors to
 * /login?next=/account/profile, so the form only ever renders for a real
 * session; the current name values are read server-side and prefill it.
 */
export default async function AccountProfilePage() {
  const user = await requireUser("/account/profile");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/account"
        className="inline-block rounded-md text-sm font-bold text-primary hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        بازگشت به حساب کاربری
      </Link>

      <h1 className="mt-4 text-2xl font-extrabold text-foreground">
        ویرایش پروفایل
      </h1>

      <section className="mt-6 rounded-2xl border border-border bg-background p-6">
        <ProfileForm
          firstName={user.firstName}
          lastName={user.lastName}
          phone={user.phone}
        />
      </section>
    </div>
  );
}
