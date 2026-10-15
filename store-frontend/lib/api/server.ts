import { cookies } from "next/headers";
import { BACKEND_ORIGIN } from "./origin";
import { buildApiPath, request } from "./request";
import type { ApiCallOptions } from "./request";
import type { DiscountBandSettings, HeroSlide } from "./types";

/**
 * Absolute origin of the NestJS backend, used by server-side calls only.
 *
 * Why this exists: a Server Component / Route Handler runs in Node, where
 * `fetch` cannot resolve a relative URL, and the next.config.ts rewrite applies
 * to *incoming browser* requests — not to fetches the server makes itself. So
 * server-side code talks to the backend directly. The value lives in ./origin
 * (a module without `next/headers`, so `proxy.ts` can share it) and is
 * re-exported here for the existing import sites.
 */
export { BACKEND_ORIGIN };

/**
 * Calls a backend endpoint from the server (Server Component, Server Function
 * or Route Handler) and forwards the incoming request's cookies.
 *
 * Unlike the browser, a server-side fetch does NOT carry the visitor's cookie
 * header: without copying it the backend would see an anonymous visitor and
 * protected endpoints would answer 401. The httpOnly auth cookie is read from
 * `next/headers` and copied onto the outgoing request, so the token still never
 * reaches application code or the browser.
 *
 * Responses are uncached by default (`cache: "no-store"`) because prices and
 * stock change; pass `cache` or `next` explicitly to opt into caching.
 *
 * @param path backend-relative path, e.g. "/products" (the origin is added here)
 */
export async function serverFetch<T>(
  path: string,
  options: ApiCallOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const headers = new Headers(options.headers);
  if (cookieHeader.length > 0) {
    headers.set("cookie", cookieHeader);
  }

  const useDefaultNoStore =
    options.cache === undefined && options.next === undefined;
  const { query, ...fetchOptions } = options;

  return request<T>(
    `${BACKEND_ORIGIN}${buildApiPath(path, query)}`,
    { ...fetchOptions, headers },
    {
      credentials: "include",
      ...(useDefaultNoStore ? { cache: "no-store" as RequestCache } : {}),
    },
  );
}

/**
 * Home-page slides of GET /slides, for the hero carousel of the home page.
 *
 * Always uncached (`cache: "no-store"`): the endpoint is edited from the admin
 * panel, and an edited slide must show up on the very next page load — a cached
 * response would keep serving the old slides.
 *
 * Best-effort, exactly like the home product rows: a non-2xx response, a
 * network failure or a payload that is not a list of slides all degrade to an
 * empty array, so the caller renders its static slides instead. Only
 * shape-valid rows survive; a malformed entry is dropped rather than rendered.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const payload = await serverFetch<unknown>("/slides", {
      cache: "no-store",
    });
    return parseHeroSlides(payload);
  } catch {
    return [];
  }
}

/**
 * Reads the raw GET /slides payload. A bare array is the documented shape; a
 * `{ items: [...] }` envelope is also accepted so a paginated variant of the
 * endpoint keeps working. Anything else yields an empty list.
 */
function parseHeroSlides(payload: unknown): HeroSlide[] {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : [];

  const slides: HeroSlide[] = [];
  for (const row of rows) {
    const slide = parseHeroSlide(row);
    if (slide !== null) {
      slides.push(slide);
    }
  }
  return slides;
}

/** One slide row; `null` when `id` or `imageUrl` is missing/invalid. */
function parseHeroSlide(row: unknown): HeroSlide | null {
  if (!isRecord(row)) {
    return null;
  }
  const id =
    typeof row.id === "number" && Number.isInteger(row.id) ? row.id : null;
  const imageUrl = readText(row.imageUrl);
  if (id === null || imageUrl === null) {
    return null;
  }
  return {
    id,
    imageUrl,
    title: readText(row.title),
    subtitle: readText(row.subtitle),
    buttonLabel: readText(row.buttonLabel),
    linkPath: readText(row.linkPath),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Trims a text field; anything that is not a non-empty string becomes `null`. */
function readText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Default band state used whenever the settings cannot be read. */
const DEFAULT_DISCOUNT_BAND = {
  bandEnabled: true,
  timerEnabled: false,
  timerEndsAt: null,
} as const;

/**
 * Discount band settings of GET /settings/discount-band, for the home page.
 *
 * Always uncached (`cache: "no-store"`): the band is toggled from the admin
 * panel and a change must show up on the very next page load.
 *
 * Best-effort, like every other home-page fetch: a non-2xx response, a network
 * failure or a malformed payload degrades to the "band on, no timer" default, so
 * the band still renders. A disabled band is only ever reported by a well-formed
 * payload whose `bandEnabled` is exactly `false`.
 */
export async function getDiscountBandSettings(): Promise<DiscountBandSettings> {
  try {
    const payload = await serverFetch<unknown>("/settings/discount-band", {
      cache: "no-store",
    });
    return parseDiscountBandSettings(payload);
  } catch {
    return { ...DEFAULT_DISCOUNT_BAND, serverNow: new Date().toISOString() };
  }
}

/**
 * Reads the raw GET /settings/discount-band payload. Booleans are only trusted
 * when they really are booleans and the two timestamps only when they are
 * non-empty strings; everything else falls back to the default (band on, no
 * timer) instead of rendering a half-configured band.
 */
function parseDiscountBandSettings(payload: unknown): DiscountBandSettings {
  if (!isRecord(payload)) {
    return { ...DEFAULT_DISCOUNT_BAND, serverNow: new Date().toISOString() };
  }
  return {
    bandEnabled:
      typeof payload.bandEnabled === "boolean" ? payload.bandEnabled : true,
    timerEnabled:
      typeof payload.timerEnabled === "boolean" ? payload.timerEnabled : false,
    timerEndsAt: readText(payload.timerEndsAt),
    serverNow: readText(payload.serverNow) ?? new Date().toISOString(),
  };
}
