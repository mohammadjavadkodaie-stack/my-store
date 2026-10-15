import type { ApiFetcher } from "./request";
import type { Paginated, Platform } from "./types";

/**
 * Admin view of one category (GET /admin/categories): the public fields plus
 * the admin-only `sortOrder` and `isActive`.
 *
 * Only rows with `isActive: true` reach the UI: "deleting" a category means
 * hiding it (PATCH `{ isActive: false }`), so inactive rows disappear from the
 * management table, the edit page and the product-form category list. The
 * backend's query-categories.dto.ts exposes no `isActive` filter, so inactive
 * rows are dropped here after loading.
 *
 * `platform` stays a plain string on purpose: rows are runtime-validated (see
 * isCategoryItem) and an unknown enum value must still render (as "—") instead
 * of silently dropping a category from the table.
 */
export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  platform: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Persian labels for every backend `Platform` enum value (prisma/schema.prisma). */
export const PLATFORM_LABELS: Readonly<Record<Platform, string>> = {
  PS5: "پلی‌استیشن ۵",
  PS4: "پلی‌استیشن ۴",
  PS3: "پلی‌استیشن ۳",
  PS2: "پلی‌استیشن ۲",
  XBOX_SERIES: "ایکس‌باکس سریز",
  XBOX_ONE: "ایکس‌باکس وان",
  SWITCH: "نینتندو سوییچ",
  SWITCH_LITE: "نینتندو سوییچ لایت",
  PC: "کامپیوتر",
  STEAM_DECK: "استیم دک",
  PS_VR: "پلی‌استیشن وی‌آر",
  XBOX: "ایکس‌باکس",
  ACCESSORY: "لوازم جانبی",
  GIFT_CARD: "کارت هدیه",
};

/** Every valid `platform` value, for <select> options and client validation. */
export const PLATFORM_VALUES: readonly Platform[] = Object.keys(
  PLATFORM_LABELS,
) as Platform[];

/** Type guard for the `Platform` union, safe on untrusted strings. */
export function isPlatform(value: unknown): value is Platform {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(PLATFORM_LABELS, value)
  );
}

/** Persian label of a platform value; unknown values render as "—". */
export function platformLabel(value: string): string {
  return isPlatform(value) ? PLATFORM_LABELS[value] : "—";
}

/** Backend page-size cap for every list endpoint (query-categories.dto.ts). */
const PAGE_SIZE = 50;

/** Defensive cap on paginated loads so an untrusted `total` cannot spin forever. */
const MAX_PAGES = 100;

/**
 * Loads every ACTIVE category from GET /admin/categories, page by page (the
 * backend caps `limit` at 50), so the management table, the edit page and the
 * product-form category list all hide deactivated rows.
 *
 * Returns null for any failure — 401/403/5xx, unreachable backend, or a
 * payload that fails validation — letting the caller show one generic Persian
 * message. Backend error text is neither rendered nor logged.
 */
export async function getAdminCategories(
  fetcher: ApiFetcher,
): Promise<AdminCategory[] | null> {
  try {
    const first = await fetcher<Paginated<unknown>>("/admin/categories", {
      query: { page: 1, limit: PAGE_SIZE },
    });
    const total = readTotal(first);
    const firstItems = readItems(first);
    if (total === null || firstItems === null) {
      return null;
    }

    const categories = collectCategories(firstItems);

    const pageCount = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
    const remainingPages = Array.from(
      { length: Math.max(0, pageCount - 1) },
      (_, index) => index + 2,
    );
    const remaining = await Promise.all(
      remainingPages.map((page) =>
        fetcher<Paginated<unknown>>("/admin/categories", {
          query: { page, limit: PAGE_SIZE },
        }),
      ),
    );
    for (const envelope of remaining) {
      const items = readItems(envelope);
      if (items === null) {
        return null;
      }
      collectCategories(items, categories);
    }

    return [...categories.values()];
  } catch {
    return null;
  }
}

/**
 * Validates one envelope's items into ACTIVE AdminCategory rows, keyed by id:
 * a deactivated ("deleted") category is skipped, so it never reaches the UI.
 */
function collectCategories(
  items: unknown[],
  into = new Map<number, AdminCategory>(),
): Map<number, AdminCategory> {
  for (const item of items) {
    if (isCategoryItem(item) && item.isActive && !into.has(item.id)) {
      into.set(item.id, item);
    }
  }
  return into;
}

/** Reads a trustworthy `total` out of a list envelope (may be undefined/204). */
function readTotal(envelope: Paginated<unknown> | undefined): number | null {
  const total = envelope?.total;
  return typeof total === "number" && Number.isInteger(total) && total >= 0
    ? total
    : null;
}

function readItems(envelope: Paginated<unknown> | undefined): unknown[] | null {
  return Array.isArray(envelope?.items) ? (envelope.items as unknown[]) : null;
}

/**
 * Runtime guard for one GET /admin/categories row: the payload is untrusted,
 * so every rendered field is checked (same defensive stance as the dashboard).
 */
function isCategoryItem(value: unknown): value is AdminCategory {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === "number" &&
    Number.isInteger(raw.id) &&
    raw.id > 0 &&
    typeof raw.name === "string" &&
    raw.name.length > 0 &&
    typeof raw.slug === "string" &&
    raw.slug.length > 0 &&
    typeof raw.platform === "string" &&
    raw.platform.length > 0 &&
    (raw.image === null || typeof raw.image === "string") &&
    typeof raw.sortOrder === "number" &&
    Number.isInteger(raw.sortOrder) &&
    raw.sortOrder >= 0 &&
    typeof raw.isActive === "boolean"
  );
}
