import { ApiError } from "@/lib/api/error";

/**
 * Visitor-safe Persian texts for failed auth calls.
 *
 * The backend's own message is never echoed: every failure status maps to one
 * fixed generic text, so a response can never hint at whether an account
 * exists, which field was wrong, or what the backend is doing internally.
 */

/** 400 — the request body did not pass backend validation. */
const INVALID_INPUT_MESSAGE = "اطلاعات واردشده معتبر نیست. لطفاً دوباره تلاش کنید.";

/** 401 — wrong phone/code combination (same text for every login failure). */
const INVALID_CREDENTIALS_MESSAGE = "شماره یا کد تأیید نادرست است";

/** 409 — the phone already has an account. */
const PHONE_TAKEN_MESSAGE = "این شماره موبایل قبلاً ثبت شده";

/** 429 — too many attempts from this client. */
const RATE_LIMITED_MESSAGE = "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.";

/** 503 — the SMS/OTP provider is not available yet. */
const SERVICE_UNAVAILABLE_MESSAGE = "سرویس ارسال کد تأیید در دسترس نیست";

/** No HTTP response at all (offline, DNS, abort, ...). */
const NETWORK_FAILURE_MESSAGE =
  "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.";

/** Anything else. */
const GENERIC_FAILURE_MESSAGE = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

/**
 * Maps a failed auth call (requestOtp/login/register) to the single generic
 * message shown to the visitor. Returns an array to fit the forms' existing
 * error-list rendering.
 */
export function authErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        return [INVALID_INPUT_MESSAGE];
      case 401:
        return [INVALID_CREDENTIALS_MESSAGE];
      case 409:
        return [PHONE_TAKEN_MESSAGE];
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
