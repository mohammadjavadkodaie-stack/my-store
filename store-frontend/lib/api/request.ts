import { ApiError } from "./error";

/** Scalar / array values accepted as query params. */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

export type QueryParams = Record<string, QueryValue>;

export interface ApiRequestOptions
  extends Omit<RequestInit, "method" | "body" | "credentials"> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /**
   * JSON-encoded automatically; BodyInit values (FormData, string, ...) are
   * passed through untouched.
   */
  body?: unknown;
}

/**
 * Options accepted by the two fetch helpers and by the endpoint functions.
 * `query` is a URL concern: the helpers serialize it with `buildApiPath` and
 * never forward it to `fetch`.
 */
export interface ApiCallOptions extends ApiRequestOptions {
  /** Backend-relative query params, serialized with URLSearchParams. */
  query?: QueryParams;
}

/**
 * Signature implemented by both fetch helpers (`apiFetch` for the browser,
 * `serverFetch` for the server), so endpoint functions can run in either
 * environment: `getProducts(query, serverFetch)` inside a Server Component.
 */
export type ApiFetcher = <T>(
  path: string,
  options?: ApiCallOptions,
) => Promise<T>;

/**
 * Builds a backend-relative path, e.g. `buildApiPath("/products", { page: 2 })`
 * returns "/products?page=2". Callers of `apiFetch` get the "/api" proxy prefix
 * added by that helper, callers of `serverFetch` get the backend origin.
 */
export function buildApiPath(path: string, query?: QueryParams): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${normalized}${buildQueryString(query)}`;
}

/** Serializes query params; arrays become repeated keys, empty values are skipped. */
export function buildQueryString(query?: QueryParams): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          search.append(key, String(item));
        }
      }
      continue;
    }
    search.set(key, String(value));
  }
  const serialized = search.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

/**
 * The single fetch implementation shared by `apiFetch` and `serverFetch`.
 *
 * It sends JSON, converts every non-2xx response into an ApiError and never
 * logs nor exposes a response body (bodies may contain user data). `init` is
 * what makes the two helpers different: credentials, forwarded cookie header
 * and caching policy.
 */
export async function request<T>(
  url: string,
  options: ApiRequestOptions,
  init: RequestInit = {},
): Promise<T> {
  const { method = "GET", body, headers, cache, ...rest } = options;

  const finalHeaders = new Headers(init.headers);
  new Headers(headers).forEach((value, key) => finalHeaders.set(key, value));
  if (!finalHeaders.has("accept")) {
    finalHeaders.set("accept", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      ...rest,
      method,
      headers: finalHeaders,
      body: toBodyInit(body, finalHeaders),
      cache: cache ?? init.cache,
      credentials: init.credentials ?? "include",
    });
  } catch (cause) {
    throw ApiError.network(url, cause);
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response, url);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    // The body is intentionally kept out of the error message.
    throw new ApiError({
      status: response.status,
      url,
      code: "INVALID_RESPONSE",
      message: "پاسخ سرور قابل خواندن نبود.",
      cause,
    });
  }
}

function toBodyInit(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return JSON.stringify(body);
}
