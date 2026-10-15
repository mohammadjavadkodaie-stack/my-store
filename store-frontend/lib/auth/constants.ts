/**
 * Auth facts mirrored from the backend (store-backend/src/auth) — the backend
 * code is the source of truth; these constants only keep this frontend in sync.
 */

/**
 * Name of the httpOnly JWT cookie set by POST /auth/login and cleared by
 * POST /auth/logout (backend: src/auth/jwt.constants.ts, AUTH_COOKIE_NAME).
 * Only its *name* is known here — its value never reaches this frontend's code.
 */
export const AUTH_COOKIE_NAME = "access_token";

/** GET /auth/me — the current user, or 401 when the cookie is missing/invalid. */
export const AUTH_ME_PATH = "/auth/me";
