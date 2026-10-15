/**
 * Client-side validation and input normalization for the phone + OTP auth
 * flow, mirroring the backend DTOs (store-backend/src/auth/dto) and the
 * backend's phone.util.ts.
 *
 * The backend stays the authority: these checks only give instant Persian
 * feedback and avoid pointless requests. Persian/Arabic digits typed into the
 * phone or code inputs are converted to ASCII here before anything is sent.
 */

/** phone.util.ts: `@Matches(/^09\d{9}$/)` after normalization. */
const PHONE_PATTERN = /^09\d{9}$/;

/** login.dto.ts / register.dto.ts: `@Matches(/^\d{6}$/)` after normalization. */
const OTP_CODE_PATTERN = /^\d{6}$/;

/** register.dto.ts: `@Length(2, 50)` on firstName and lastName. */
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 50;

/** Fixed "09" prefix of every Iranian mobile number — it can never be edited. */
export const PHONE_PREFIX = "09";

/** 11 = the "09" prefix plus 9 more digits (phone.util.ts: ^09 + 9 digits). */
export const PHONE_MAX_LENGTH = 11;

/** login.dto.ts / register.dto.ts: exactly 6 digits. */
export const OTP_MAX_LENGTH = 6;

/** Persian (۰-۹, U+06F0-U+06F9) and Arabic (٠-٩, U+0660-U+0669) digits. */
const NON_ASCII_DIGITS = /[\u06f0-\u06f9\u0660-\u0669]/g;

/**
 * phone.util.ts: converts Persian/Arabic digits to ASCII ones, so the value
 * sent to the backend is always latin digits even if the visitor's keyboard
 * produced Persian ones.
 */
export function toAsciiDigits(value: string): string {
  return value.replace(NON_ASCII_DIGITS, (char) => {
    const code = char.charCodeAt(0);
    // Persian digits start at U+06F0, Arabic ones at U+0660.
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * phone.util.ts `normalizePhone`: ASCII digits, no spaces/dashes and the
 * +98 / 0098 / 98 prefix rewritten to a leading 0 — exactly what the backend
 * DTO does before its own format check.
 */
export function normalizePhone(value: string): string {
  const ascii = toAsciiDigits(value).replace(/[\s-]/g, "");
  return ascii.replace(/^(\+98|0098|98)/, "0");
}

/** phone.util.ts `normalizeCode`: ASCII digits only, no other change. */
export function normalizeCode(value: string): string {
  return toAsciiDigits(value);
}

/** Digits only: Persian/Arabic digits become ASCII first, everything else is dropped. */
function toDigitsOnly(value: string): string {
  return toAsciiDigits(value).replace(/\D/g, "");
}

/**
 * Sanitizes the phone field on every change (typing, paste, mobile keyboards):
 * ASCII digits only, the "09" prefix always restored, 11 characters at most.
 *
 * A value that already starts with "09" is kept as is: after the locked prefix
 * every digit is a valid body digit, 0 included ("0902…"), so the body is never
 * stripped of leading zeros. Only pasted or partially deleted values are
 * normalized here — that is what keeps the prefix locked and uneditable.
 */
export function sanitizePhoneInput(value: string): string {
  const maxBodyLength = PHONE_MAX_LENGTH - PHONE_PREFIX.length;
  const digits = toDigitsOnly(value);

  if (digits.startsWith(PHONE_PREFIX)) {
    return digits.slice(0, PHONE_MAX_LENGTH);
  }

  let body: string;
  if (digits.startsWith("0098")) {
    body = digits.slice(4);
  } else if (digits.startsWith("98")) {
    body = digits.slice(2);
  } else if (digits.startsWith("9")) {
    body = digits.slice(1);
  } else {
    // Empty value or a partly deleted prefix ("0", "8…"): the prefix is
    // restored and only what follows the first (up to) 2 characters is kept.
    body = digits.slice(2);
  }

  return `${PHONE_PREFIX}${body.slice(0, maxBodyLength)}`;
}

/** OTP field: ASCII digits only, 6 digits at most. */
export function sanitizeOtpInput(value: string): string {
  return toDigitsOnly(value).slice(0, OTP_MAX_LENGTH);
}

/** Phone rules shared by login and register (RequestOtpDto / LoginDto / RegisterDto). */
export function validatePhone(value: string): string | undefined {
  const phone = normalizePhone(value);
  if (phone.length === 0) {
    return "شماره موبایل الزامی است";
  }
  if (!PHONE_PATTERN.test(phone)) {
    return "شماره موبایل معتبر نیست";
  }
  return undefined;
}

/** 6-digit code rules shared by login and register (LoginDto / RegisterDto). */
export function validateOtpCode(value: string): string | undefined {
  const code = normalizeCode(value);
  if (code.length === 0) {
    return "کد تأیید الزامی است";
  }
  if (!OTP_CODE_PATTERN.test(code)) {
    return "کد تأیید باید ۶ رقم باشد";
  }
  return undefined;
}

/** register.dto.ts: firstName — @IsNotEmpty + @Length(2, 50). */
export function validateFirstName(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0) {
    return "نام الزامی است";
  }
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return `نام باید بین ${NAME_MIN_LENGTH} تا ${NAME_MAX_LENGTH} کاراکتر باشد`;
  }
  return undefined;
}

/** register.dto.ts: lastName — @IsNotEmpty + @Length(2, 50). */
export function validateLastName(value: string): string | undefined {
  const name = value.trim();
  if (name.length === 0) {
    return "نام خانوادگی الزامی است";
  }
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return `نام خانوادگی باید بین ${NAME_MIN_LENGTH} تا ${NAME_MAX_LENGTH} کاراکتر باشد`;
  }
  return undefined;
}
