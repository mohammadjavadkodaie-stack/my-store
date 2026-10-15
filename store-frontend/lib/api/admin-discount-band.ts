import type { ApiFetcher } from "./request";

/**
 * Discount-band settings as the admin card loads and edits them
 * (GET /settings/discount-band): the two switches plus the timer end.
 *
 * `timerEndsAt` is an ISO-8601 timestamp, or null when no end is stored.
 */
export interface DiscountBandConfig {
  /** false hides the whole band on the home page. */
  bandEnabled: boolean;
  timerEnabled: boolean;
  timerEndsAt: string | null;
}

/**
 * Input of PATCH /admin/settings/discount-band: the whole editable settings
 * object. `timerEndsAt` is an ISO-8601 string while the timer is on and null
 * when it is off (a disabled timer has no end).
 */
export interface DiscountBandInput {
  bandEnabled: boolean;
  timerEnabled: boolean;
  timerEndsAt: string | null;
}

/**
 * Loads the discount-band settings from GET /settings/discount-band.
 *
 * Returns null for any failure — 401/403/5xx, an unreachable backend, or a
 * payload whose switches are not real booleans — letting the caller show one
 * generic Persian message. Backend error text is neither rendered nor logged.
 */
export async function getAdminDiscountBand(
  fetcher: ApiFetcher,
): Promise<DiscountBandConfig | null> {
  try {
    const payload = await fetcher<unknown>("/settings/discount-band");
    return parseDiscountBandSettings(payload);
  } catch {
    return null;
  }
}

/**
 * Saves the discount-band settings (PATCH /admin/settings/discount-band,
 * admin-only on the backend). A failed request throws its ApiError; the caller
 * maps it to one fixed Persian message.
 */
export async function saveAdminDiscountBand(
  input: DiscountBandInput,
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<unknown>("/admin/settings/discount-band", {
    method: "PATCH",
    body: input,
  });
}

/**
 * Runtime guard for the untrusted GET /settings/discount-band payload: both
 * switches must really be booleans and `timerEndsAt` a non-empty string or null;
 * anything else is rejected instead of rendering a half-configured card.
 */
function parseDiscountBandSettings(
  payload: unknown,
): DiscountBandConfig | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const raw = payload as Record<string, unknown>;
  if (
    typeof raw.bandEnabled !== "boolean" ||
    typeof raw.timerEnabled !== "boolean"
  ) {
    return null;
  }
  return {
    bandEnabled: raw.bandEnabled,
    timerEnabled: raw.timerEnabled,
    timerEndsAt: readText(raw.timerEndsAt),
  };
}

/** Trims a text field; anything that is not a non-empty string becomes null. */
function readText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
