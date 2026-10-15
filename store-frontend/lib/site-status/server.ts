import { BACKEND_ORIGIN } from "@/lib/api/origin";
import { AUTH_ME_PATH } from "@/lib/auth/constants";
import { SITE_STATUS_PATH, SITE_STATUS_TIMEOUT_MS } from "./constants";

/**
 * Server-side helpers of the global site kill switch (security rule F3).
 *
 * Deliberately free of `next/headers`/React imports so the exact same module can
 * be used by `proxy.ts`, by Server Components (the owner banner) and by Server
 * Functions. Every failure mode resolves to the closed state (`false`): an
 * unreachable backend, a non-2xx answer, an unexpected payload or a timeout all
 * mean "the site is not usable" — never "assume it is open". Nothing is logged
 * and no cookie value ever leaves this module.
 */

/** Single fetch used by both checks: JSON, uncached, hard timeout. */
async function fetchBackend(
  path: string,
  cookieHeader?: string | null,
): Promise<Response | null> {
  try {
    return await fetch(`${BACKEND_ORIGIN}${path}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        // The visitor's own cookie header is forwarded verbatim; the token is
        // never read, stored or logged here.
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(SITE_STATUS_TIMEOUT_MS),
    });
  } catch {
    // Timeout, connection refused, DNS failure, ... — caller fails closed.
    return null;
  }
}

/**
 * GET /site-status — is the site enabled?
 *
 * The endpoint is public and stays reachable while the site is stopped, so this
 * call answers in both states. Only a literal `{ enabled: true }` counts as
 * open; everything else (including an unreachable backend) is `false`.
 */
export async function getSiteStatusEnabled(): Promise<boolean> {
  const response = await fetchBackend(SITE_STATUS_PATH);
  if (response === null || !response.ok) {
    return false;
  }
  const body = await readJson(response);
  return isRecord(body) && body.enabled === true;
}

/**
 * Is this request carrying a valid *owner* session?
 *
 * The decision is made server-side and by the backend: the incoming cookie
 * header is forwarded to GET /auth/me, which answers with the current user
 * (including `isOwner`, computed in the backend from the owner phone in .env).
 * The owner phone itself never exists in this frontend, and a non-2xx answer
 * (including the backend's 503 while the site is stopped) means "not the owner".
 *
 * @param cookieHeader raw `cookie` header of the incoming request
 */
export async function isOwnerSessionCookie(
  cookieHeader: string | null,
): Promise<boolean> {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) {
    return false;
  }

  const response = await fetchBackend(AUTH_ME_PATH, cookieHeader);
  if (response === null || !response.ok) {
    return false;
  }
  const body = await readJson(response);
  return isRecord(body) && body.isOwner === true;
}

/** Reads a JSON body; an unparsable body becomes `undefined`. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
