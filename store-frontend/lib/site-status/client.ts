import { apiFetch } from "@/lib/api/client";
import { SITE_STATUS_PATH } from "./constants";

/**
 * Browser calls for the global site switch.
 *
 * Both go through `apiFetch`, i.e. through the same-origin "/api" rewrite with
 * `credentials: "include"`, so the httpOnly auth cookie travels with them and
 * the backend's session handling stays untouched. The backend also requires a
 * same-origin `Origin` header on the POST: the browser adds it for every
 * same-origin non-GET request, and setting it by hand is not allowed (forbidden
 * header name) — nothing to do here.
 *
 * No owner check happens in this file: only the backend decides (it answers 403
 * when the site is on and the visitor is not the owner, 503 while it is off).
 */

/** Body of GET/POST /site-status — exactly `{ enabled }`. */
export interface SiteStatus {
  enabled: boolean;
}

/** GET /site-status — public, works in both states. */
export function getSiteStatus(): Promise<SiteStatus> {
  return apiFetch<SiteStatus>(SITE_STATUS_PATH);
}

/** POST /site-status — owner only; body must be a real JSON boolean. */
export function setSiteStatus(enabled: boolean): Promise<SiteStatus> {
  return apiFetch<SiteStatus>(SITE_STATUS_PATH, {
    method: "POST",
    body: { enabled },
  });
}
