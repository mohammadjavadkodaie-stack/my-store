import { ApiError } from "@/lib/api/error";

/**
 * Visitor-safe Persian texts for failed cart & order calls.
 *
 * Same policy as lib/auth/errors.ts: the backend's own message is never echoed
 * — every failure status maps to one fixed generic text, so a response can
 * never leak what the backend is doing internally.
 */

/** 400 — the request body / quantity did not pass backend validation. */
const INVALID_INPUT_MESSAGE = "درخواست معتبر نیست. لطفاً دوباره تلاش کنید.";

/** 401 — the session expired or the visitor is not signed in. */
const UNAUTHORIZED_MESSAGE = "برای این کار باید وارد حساب کاربری شوید.";

/** 404 — the product/order does not exist (or is not the visitor's). */
const NOT_FOUND_MESSAGE = "مورد نظر پیدا نشد.";

/** 429 — too many requests from this client. */
const RATE_LIMITED_MESSAGE = "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.";

/** 503 — the backend is not available. */
const SERVICE_UNAVAILABLE_MESSAGE = "سرویس در دسترس نیست. کمی بعد تلاش کنید.";

/** No HTTP response at all (offline, DNS, abort, ...). */
const NETWORK_FAILURE_MESSAGE =
  "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";

/** Anything else. */
const GENERIC_FAILURE_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

/**
 * Maps a failed cart/order call to the single generic message shown to the
 * visitor. Callers decide what a 401 means (redirect to /login, ...).
 */
export function cartErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return [INVALID_INPUT_MESSAGE];
      case 401:
        return [UNAUTHORIZED_MESSAGE];
      case 404:
        return [NOT_FOUND_MESSAGE];
      case 429:
        return [RATE_LIMITED_MESSAGE];
      case 503:
        return [SERVICE_UNAVAILABLE_MESSAGE];
      default:
        break;
    }
    if (error.isNetworkError) {
      return [NETWORK_FAILURE_MESSAGE];
    }
  }
  return [GENERIC_FAILURE_MESSAGE];
}
