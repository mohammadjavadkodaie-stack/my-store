"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/auth/client";

/**
 * Ends the session: calls POST /auth/logout (the backend clears the httpOnly
 * cookie) and then re-syncs the UI.
 *
 * A failure is swallowed on purpose — the cookie may already be gone, and the
 * refresh always shows the real server-side state. Nothing technical is ever
 * displayed, and the button is disabled while the request is in flight.
 */
export function LogoutButton() {
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
      className="rounded-md border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "در حال خروج..." : "خروج"}
    </button>
  );
}
