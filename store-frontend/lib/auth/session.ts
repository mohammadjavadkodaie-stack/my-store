import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { AUTH_COOKIE_NAME, AUTH_ME_PATH } from "./constants";
import { safeNextPath } from "./redirect";
import type { AuthUser } from "./types";

/**
 * The signed-in visitor or null — Server Components / Server Functions only
 * (this module imports next/headers).
 *
 * React `cache`-wrapped, so the header and any page can await it in the same
 * request without a second backend round-trip. Never throws and never logs:
 * a missing cookie returns null without touching the backend, and anything
 * that goes wrong after that (401, unreachable backend, unexpected payload)
 * simply means "no known user".
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  // cookies() is awaited outside the try/catch on purpose: a dynamic-usage
  // error during static prerendering must reach the framework, not be caught.
  const cookieStore = await cookies();

  // No auth cookie -> anonymous visitor: the backend is not called at all.
  if (!cookieStore.has(AUTH_COOKIE_NAME)) {
    return null;
  }

  try {
    return await serverFetch<AuthUser>(AUTH_ME_PATH);
  } catch {
    // Expired/invalid token (401), unreachable backend, unexpected payload —
    // all of it just means "treat as anonymous".
    return null;
  }
});

/**
 * Server Component guard: returns the current user or redirects the visitor to
 * /login?next=<safe destination>, so they can continue after signing in.
 */
export async function requireUser(nextPath: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (user === null) {
    // redirect() never returns, so `user` is non-null below.
    redirect(`/login?next=${encodeURIComponent(safeNextPath(nextPath))}`);
  }
  return user;
}
