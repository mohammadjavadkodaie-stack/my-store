import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
// Reuses the login page shell (gradient scene, blobs, glass card, logo tile)
// instead of duplicating it — see app/login/login.module.css.
import styles from "../login/login.module.css";

export const metadata: Metadata = {
  title: "ثبت‌نام",
  robots: { index: false, follow: false },
};

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Register page (Server Component). searchParams is a Promise in Next.js 16,
 * so it is awaited first; the `next` value is sanitized with safeNextPath and
 * that safe value is the only one ever used in a redirect or a link. `phone`
 * is the number carried over from the login step and only pre-fills the form —
 * the register form normalizes and validates it again before submitting.
 */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const rawNext = params.next;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  const rawPhone = params.phone;
  const phone = Array.isArray(rawPhone) ? rawPhone[0] : rawPhone;

  // Already signed in: registering again is pointless.
  const user = await getCurrentUser();
  if (user !== null) {
    redirect(next);
  }

  const loginHref =
    next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className={styles.scene}>
      {/* Decorative blobs — CSS-only, so they animate before/without JS. */}
      <span className={`${styles.blob} ${styles.blob1}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blob2}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.blob3}`} aria-hidden="true" />

      <section className={styles.card}>
        <div className={styles.logoArea}>
          <span className={styles.logoIcon} aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </span>
        </div>

        <h1 className={styles.heading}>ثبت‌نام</h1>
        <p className={styles.subheading}>
          برای استفاده از سایت باید حساب کاربری داشته باشید. با ساخت حساب
          کاربری، خرید سریع‌تر و پیگیری سفارش‌ها ممکن می‌شود.
        </p>

        <RegisterForm next={next} initialPhone={phone ?? ""} />

        <p className={styles.registerRow}>
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href={loginHref} className={styles.registerLink}>
            ورود
          </Link>
        </p>
      </section>
    </div>
  );
}
