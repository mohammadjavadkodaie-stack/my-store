import type { ApiFetcher } from "./request";
import type { AdminSlide } from "./types";

/**
 * Re-exported so the admin pages and row actions can import the row shape from
 * this module (same call site style as AdminCategory / AdminProduct).
 */
export type { AdminSlide };

/**
 * Loads every home-page slide from GET /admin/slides, in the order the backend
 * returns (it already sorts by `sortOrder`). Malformed rows are dropped instead
 * of failing the whole table.
 *
 * Returns null for any failure — 401/403/5xx, unreachable backend, or a payload
 * that is not a list — letting the caller show one generic Persian message.
 * Backend error text is neither rendered nor logged.
 */
export async function getAdminSlides(
  fetcher: ApiFetcher,
): Promise<AdminSlide[] | null> {
  try {
    const payload = await fetcher<unknown>("/admin/slides");
    const items = readSlides(payload);
    if (items === null) {
      return null;
    }
    return items.filter(isSlideItem);
  } catch {
    return null;
  }
}

/**
 * ورودی ساخت یک اسلاید (POST /admin/slides). فیلدهای اختیاری ممکن است خالی
 * باشند و در آن حالت اصلاً ارسال نمی‌شوند — هرگز به‌صورت رشته‌ی خالی نمی‌روند.
 *
 * `sortOrder` عمداً بخشی از این ورودی نیست: ترتیب نمایش فقط از راه
 * POST /admin/slides/reorder تعیین می‌شود.
 */
export interface SlideInput {
  imageUrl: string;
  title?: string | null;
  subtitle?: string | null;
  buttonLabel?: string | null;
  linkPath?: string | null;
  isActive: boolean;
}

/**
 * Creates one slide (POST /admin/slides, admin-only on the backend). Only
 * DTO-whitelisted keys are sent and `sortOrder` is never part of the body, so
 * the endpoint itself decides where the new slide lands.
 *
 * A failed request throws its ApiError (including the backend's own message,
 * e.g. the ten-slide limit); the caller maps it to a Persian message.
 */
export async function createSlide(
  input: SlideInput,
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<unknown>("/admin/slides", {
    method: "POST",
    body: buildSlideBody(input),
  });
}

/**
 * Builds the exact POST body: the required fields plus every optional field
 * that actually has text. An empty optional field is omitted instead of being
 * sent as "", and `sortOrder` can never leak in here.
 */
function buildSlideBody(input: SlideInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    imageUrl: input.imageUrl,
    isActive: input.isActive,
  };
  const optionalKeys = [
    "title",
    "subtitle",
    "buttonLabel",
    "linkPath",
  ] as const;
  for (const key of optionalKeys) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length > 0) {
      body[key] = value.trim();
    }
  }
  return body;
}

/**
 * Activates or deactivates one slide (PATCH /admin/slides/:id). Only `isActive`
 * is sent: the rest of the row is owned by the create/update form.
 *
 * A failed request throws its ApiError; the caller maps it to one fixed Persian
 * message (the backend's own text is never rendered).
 */
export async function setAdminSlideActive(
  id: number,
  isActive: boolean,
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<unknown>(`/admin/slides/${id}`, {
    method: "PATCH",
    body: { isActive },
  });
}

/** Deletes one slide (DELETE /admin/slides/:id); a failure throws its ApiError. */
export async function deleteAdminSlide(
  id: number,
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<unknown>(`/admin/slides/${id}`, { method: "DELETE" });
}

/**
 * Saves the whole display order (POST /admin/slides/reorder). The endpoint
 * expects every slide id, so `ids` must be the complete list in its new order —
 * the list page passes the ids exactly as it received them, with two swapped.
 */
export async function reorderAdminSlides(
  ids: readonly number[],
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<unknown>("/admin/slides/reorder", {
    method: "POST",
    body: { ids: [...ids] },
  });
}

/**
 * Reads the rows out of the payload: GET /admin/slides answers with a plain
 * array, but a `{ items: [...] }` envelope is tolerated too so an envelope
 * change cannot silently empty the table.
 */
function readSlides(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === "object" && payload !== null) {
    const items = (payload as { items?: unknown }).items;
    if (Array.isArray(items)) {
      return items;
    }
  }
  return null;
}

/**
 * Runtime guard for one GET /admin/slides row: the payload is untrusted, so
 * every rendered field is checked (same defensive stance as admin-categories).
 * `imageUrl` only has to be a string here — the table decides whether it can be
 * rendered as an image and falls back to a placeholder otherwise.
 */
function isSlideItem(value: unknown): value is AdminSlide {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "number" &&
    Number.isInteger(raw.id) &&
    raw.id > 0 &&
    typeof raw.imageUrl === "string" &&
    isNullableString(raw.title) &&
    isNullableString(raw.subtitle) &&
    isNullableString(raw.buttonLabel) &&
    isNullableString(raw.linkPath) &&
    typeof raw.isActive === "boolean" &&
    typeof raw.sortOrder === "number" &&
    Number.isInteger(raw.sortOrder) &&
    raw.sortOrder >= 0
  );
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}
