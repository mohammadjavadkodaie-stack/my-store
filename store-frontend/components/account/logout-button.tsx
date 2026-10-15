"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth/client";

/**
 * Logout action of the account dashboard (the header no longer carries one).
 *
 * Same flow the header button used: POST /auth/logout through lib/auth/client
 * (the backend clears the httpOnly cookie — never a GET), then back to the home
 * page with a refresh, which re-renders the layout/header as a guest and lets
 * CartProvider swap the server cart for guest storage.
 *
 * A failure is swallowed on purpose — the cookie may already be gone, and the
 * refresh always shows the real server-side state. Nothing technical is ever
 * displayed, and the button is disabled while the request is in flight.
 */
export function AccountLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick(): Promise<void> {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await logout();
    } catch {
      // Ignored: the refresh below re-reads the session from the server.
    } finally {
      router.replace("/");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "در حال خروج..." : "خروج از حساب"}
    </button>
  );
}
