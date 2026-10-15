/**
 * Absolute origin of the NestJS backend, used by every server-side call.
 *
 * Why this is its own module: `./server` forwards the visitor's cookies through
 * `next/headers`, which cannot be imported from `proxy.ts` — the global site
 * kill-switch gate needs the origin without pulling that dependency in. The
 * value lives here once and is re-exported by `./server` for existing callers.
 *
 * Set API_ORIGIN to override (e.g. a Docker service name); the default matches
 * the rewrite in next.config.ts.
 */
export const BACKEND_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";
