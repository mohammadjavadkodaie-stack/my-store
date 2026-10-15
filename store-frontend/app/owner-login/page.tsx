import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import styles from "@/app/login/login.module.css";

/**
 * Unlinked owner sign-in route (security rule F4).
 *
 * While the site is stopped, `proxy.ts` answers every page with the maintenance
 * document *except* this one, so the owner still has a way back in. Two rules
 * make it a dead end for everyone else, and both are enforced outside this file:
 *
 * 1. Nothing links here — no header item, no footer item, no menu row, no
 *    sitemap entry. The address is simply not discoverable by browsing.
 * 2. The backend's own site-status guard only lets the owner's *phone* through
 *    the login/OTP endpoints while the site is off, so a stranger who guessed
 *    the URL could not sign in anyway — and once signed in as a non-owner they
 *    would still be sent back to the maintenance page.
 *
 * The page deliberately reuses the ordinary `LoginForm` (normal phone + OTP
 * flow, httpOnly cookie) instead of any special owner credential: the owner is
 * just a user whose phone matches OWNER_PHONE on the backend.
 */
export const metadata: Metadata = {
  title: "ورود",
  // Never indexed and never followed: the route stays out of search results.
  robots: { index: false, follow: false },
};

type OwnerLoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OwnerLoginPage({
  searchParams,
}: OwnerLoginPageProps) {
  const params = await searchParams;
  const rawNext = params.next;
  // After a successful sign-in the owner lands back on the site itself; a
  // `next` value is honoured only after safeNextPath has sanitized it.
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  // Already signed in: the gate decides what this visitor may see.
  const user = await getCurrentUser();
  if (user !== null) {
    redirect(next);
  }

  return (
    <div className={styles.scene}>
      {/* Decorative blobs — the same CSS-only animation as /login. */}
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
          برای دسترسی به سایت در حالت خاموش، وارد حساب کاربری خود شوید.
        </p>

        {/* No link to registration or anywhere else: this page is a dead end. */}
        <LoginForm next={next} />
      </section>
    </div>
  );
}
