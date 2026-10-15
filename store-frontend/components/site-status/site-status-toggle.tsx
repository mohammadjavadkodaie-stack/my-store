"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/error";
import { getSiteStatus, setSiteStatus } from "@/lib/site-status/client";

/**
 * Owner-only ON/OFF control of the global site kill switch.
 *
 * This component never decides whether the visitor is the owner: it is only
 * rendered by owner-only call sites (the account menu, gated by the server-side
 * `isOwner` flag of GET /auth/me, and the stopped-site banner). Turning the site
 * OFF asks for confirmation first; turning it back ON does not, because that is
 * the recovery action.
 *
 * The call itself is a plain POST /site-status through `apiFetch`: the backend
 * checks the owner session and the same-origin `Origin` header, so a wrong or
 * expired session simply surfaces as an error message. No token is ever read or
 * logged, and the current status is read from the public endpoint (or passed in
 * by a caller that already knows it) — never assumed.
 */

type SiteStatusToggleProps = {
  /** Styling of the button — each call site keeps its own row/button style. */
  className: string;
  /** Icon drawn at the inline start of the button. */
  icon?: ReactNode;
  /** Extra node at the inline end (e.g. the chevron of the menu rows). */
  trailing?: ReactNode;
  /** Marks the button as a row of a `role="menu"` container. */
  menuItem?: boolean;
  /**
   * Current status when the caller already knows it (the server-rendered
   * banner passes `false`), which skips the client-side GET /site-status.
   */
  knownEnabled?: boolean;
};

export function SiteStatusToggle({
  className,
  icon,
  trailing,
  menuItem = false,
  knownEnabled,
}: SiteStatusToggleProps) {
  const router = useRouter();
  const dialogTitleId = useId();
  // null = the current status is not known yet (the button stays disabled).
  const [enabled, setEnabled] = useState<boolean | null>(knownEnabled ?? null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The menu rows do not know the status server-side, so they read it once from
  // the public endpoint; the banner passes it in and skips this call.
  useEffect(() => {
    if (knownEnabled !== undefined) {
      return;
    }
    let active = true;
    getSiteStatus()
      .then((status) => {
        if (active) {
          setEnabled(status.enabled);
        }
      })
      .catch(() => {
        // Unreadable status: the control stays disabled rather than guessing.
        if (active) {
          setEnabled(null);
        }
      });
    return () => {
      active = false;
    };
  }, [knownEnabled]);

  // While the confirmation dialog is open, Escape closes it.
  useEffect(() => {
    if (!confirming) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setConfirming(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirming]);

  async function apply(nextEnabled: boolean): Promise<void> {
    if (pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const status = await setSiteStatus(nextEnabled);
      setEnabled(status.enabled);
      setConfirming(false);
      // Server Components re-read the new status (banner, header, pages).
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "تغییر وضعیت سایت انجام نشد.",
      );
    } finally {
      setPending(false);
    }
  }

  const label =
    enabled === null
      ? "وضعیت سایت..."
      : enabled
        ? "خاموش کردن سایت"
        : "روشن کردن سایت";

  return (
    <>
      <button
        type="button"
        {...(menuItem ? { role: "menuitem" } : {})}
        aria-busy={pending}
        disabled={pending || enabled === null}
        onClick={() => {
          setError(null);
          if (enabled === true) {
            setConfirming(true);
          } else if (enabled === false) {
            void apply(true);
          }
        }}
        className={`${className} disabled:pointer-events-none disabled:opacity-60`}
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-start">
          {pending ? "در حال اعمال..." : label}
        </span>
        {trailing}
      </button>

      {error !== null && !confirming && (
        <p role="alert" className="px-3 py-1 text-xs leading-6 text-red-600">
          {error}
        </p>
      )}

      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-white p-4 shadow-xl"
          >
            <h2
              id={dialogTitleId}
              className="text-sm font-extrabold text-slate-800"
            >
              خاموش کردن سایت
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              با خاموش کردن سایت، همه‌ی کاربران به‌جز شما صفحه‌ی «سایت متوقف شده
              است» را می‌بینند. مطمئن هستید؟
            </p>

            {error !== null && (
              <p role="alert" className="mt-2 text-xs leading-6 text-red-600">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void apply(false)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "در حال خاموش کردن..." : "خاموش کردن سایت"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
