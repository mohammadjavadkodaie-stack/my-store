/**
 * Facts mirrored from the backend kill switch (store-backend/src/site-status) —
 * the backend is the source of truth; these constants only keep this frontend
 * in sync. Nothing here reveals who the owner is.
 */

/**
 * Backend path of the global site switch (backend: SITE_STATUS_PATH).
 * GET is public and answers even while the site is stopped; POST is owner-only.
 */
export const SITE_STATUS_PATH = "/site-status";

/**
 * Unlinked route where the owner signs in while the site is stopped
 * (security rule F4). It is never linked from any page, and `proxy.ts` keeps it
 * reachable while every other route is closed.
 */
export const OWNER_LOGIN_PATH = "/owner-login";

/**
 * Hard timeout of the two server-side checks `proxy.ts` performs. Short on
 * purpose: a slow or dead backend must fail closed quickly instead of hanging
 * every request.
 */
export const SITE_STATUS_TIMEOUT_MS = 1_500;
