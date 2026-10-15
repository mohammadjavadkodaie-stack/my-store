import { ApiError } from "./error";
import { buildApiPath, request } from "./request";
import type { ApiCallOptions } from "./request";

/**
 * Prefix the browser uses for every backend call. next.config.ts rewrites
 * `/api/:path*` to the NestJS origin, so this layer never needs to know the
 * backend host — the origin lives only in next.config.ts and in ./server.ts
 * (server-side fetches cannot use relative URLs).
 */
export const API_PREFIX = "/api";

/**
 * Calls a backend endpoint from the browser (Client Component) using a relative
 * `/api/...` URL, so the request stays on this origin and the httpOnly auth
 * cookie is sent because every request sets `credentials: "include"`.
 *
 * The token itself is never read, stored or returned by this code: it stays
 * server-managed in the cookie (never in localStorage/sessionStorage).
 *
 * Server Components, Server Functions and Route Handlers must use
 * `serverFetch` from "./server" instead: on the server there is no browser to
 * resolve a relative URL and the incoming request's cookies are NOT forwarded
 * automatically.
 *
 * @param path backend-relative path, e.g. "/products" (the "/api" prefix is added here)
 */
export async function apiFetch<T>(
  path: string,
  options: ApiCallOptions = {},
): Promise<T> {
  if (typeof window === "undefined") {
    throw new ApiError({
      status: 0,
      url: path,
      code: "CLIENT_ONLY",
      message:
        "apiFetch فقط در مرورگر کار می‌کند؛ در سمت سرور از serverFetch استفاده کنید.",
    });
  }
  const { query, ...fetchOptions } = options;
  return request<T>(`${API_PREFIX}${buildApiPath(path, query)}`, fetchOptions, {
    credentials: "include",
  });
}
