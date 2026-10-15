import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "ورود",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Login page (Server Component). searchParams is a Promise in Next.js 16, so
 * it is awaited first; the `next` value is sanitized with safeNextPath and that
 * safe value is the only one ever used in a redirect or a link.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawNext = params.next;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  // Already signed in: nothing to do on this page.
  const user = await getCurrentUser();
  if (user !== null) {
    redirect(next);
  }

  const registerHref =
    next === "/" ? "/register" : `/register?next=${encodeURIComponent(next)}`;

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

        <h1 className={styles.heading}>ورود</h1>
        <p className={styles.subheading}>
          برای خرید و پیگیری سفارش‌ها وارد حساب کاربری خود شوید.
        </p>

        <LoginForm next={next} />

        <p className={styles.registerRow}>
          حساب کاربری ندارید؟{" "}
          <Link href={registerHref} className={styles.registerLink}>
            ثبت‌نام
          </Link>
        </p>
      </section>
    </div>
  );
}
