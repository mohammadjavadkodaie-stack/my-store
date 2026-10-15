import { toAsciiDigits } from "@/lib/auth/validation";
import { isProvince } from "./provinces";

/**
 * Client-side validation and input normalization for the address form,
 * mirroring the backend DTOs (store-backend/src/addresses/dto).
 *
 * The backend stays the authority: these checks only give instant Persian
 * feedback and avoid pointless requests. Persian/Arabic digits typed into the
 * postal-code input are converted to ASCII digits here, because the backend
 * pattern (`POSTAL_CODE_PATTERN = /^\d{10}$/`) accepts latin digits only.
 *
 * Only the fields of the DTOs are ever built into a payload — phone and userId
 * do not exist in either DTO, and the backend's global whitelist answers 400
 * for any extra field.
 */

/** create-address.dto.ts: ADDRESS_TITLE_MAX_LENGTH. */
export const TITLE_MAX_LENGTH = 40;
/** create-address.dto.ts: ADDRESS_RECIPIENT_NAME_MAX_LENGTH. */
export const RECIPIENT_NAME_MAX_LENGTH = 80;
/** create-address.dto.ts: ADDRESS_CITY_MAX_LENGTH. */
export const CITY_MAX_LENGTH = 60;
/** create-address.dto.ts: ADDRESS_ADDRESS_LINE_MAX_LENGTH. */
export const ADDRESS_LINE_MAX_LENGTH = 300;
/** create-address.dto.ts: ADDRESS_POSTAL_CODE_LENGTH. */
export const POSTAL_CODE_LENGTH = 10;

/** create-address.dto.ts: POSTAL_CODE_PATTERN — exactly 10 ASCII digits. */
const POSTAL_CODE_PATTERN = /^\d{10}$/;

/** Field names of the address DTOs, used for per-field error messages. */
export type AddressField =
  | "title"
  | "recipientName"
  | "province"
  | "city"
  | "addressLine"
  | "postalCode";

export type AddressFieldErrors = Partial<Record<AddressField, string>>;

/** Exactly what the form holds in state: text as typed plus the checkbox. */
export interface AddressFormValues {
  title: string;
  recipientName: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

/**
 * Body of POST /addresses and PATCH /addresses/:id — the allowed fields only.
 *
 * `title` is always sent: null clears an existing title, which is what an empty
 * input means (both DTOs accept null for it). `isDefault` is omitted unless it
 * is true, because both DTOs reject `false`.
 */
export interface AddressPayload {
  title: string | null;
  recipientName: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault?: true;
}

/**
 * Persian/Arabic digits become ASCII digits, so a postal code typed on a
 * Persian keyboard still matches the backend's ASCII-only pattern.
 */
export function normalizePostalCode(value: string): string {
  return toAsciiDigits(value);
}

/**
 * Client mirror of the create/update DTO rules (trimmed lengths, fixed province
 * list, 10-digit postal code). Every message is Persian and matches the text the
 * backend returns for the same mistake.
 */
export function validateAddressFields(
  values: AddressFormValues,
): AddressFieldErrors {
  const errors: AddressFieldErrors = {};

  // Optional: only its length is limited (the DTO turns an empty value into null).
  if (values.title.trim().length > TITLE_MAX_LENGTH) {
    errors.title = `عنوان حداکثر ${TITLE_MAX_LENGTH} کاراکتر است`;
  }

  const recipientName = values.recipientName.trim();
  if (recipientName.length === 0) {
    errors.recipientName = "نام گیرنده الزامی است";
  } else if (recipientName.length > RECIPIENT_NAME_MAX_LENGTH) {
    errors.recipientName = `نام گیرنده باید حداکثر ${RECIPIENT_NAME_MAX_LENGTH} کاراکتر باشد`;
  }

  const province = values.province.trim();
  if (province.length === 0) {
    errors.province = "انتخاب استان الزامی است";
  } else if (!isProvince(province)) {
    errors.province = "استان انتخاب‌شده معتبر نیست";
  }

  const city = values.city.trim();
  if (city.length === 0) {
    errors.city = "شهر الزامی است";
  } else if (city.length > CITY_MAX_LENGTH) {
    errors.city = `شهر باید حداکثر ${CITY_MAX_LENGTH} کاراکتر باشد`;
  }

  const addressLine = values.addressLine.trim();
  if (addressLine.length === 0) {
    errors.addressLine = "نشانی الزامی است";
  } else if (addressLine.length > ADDRESS_LINE_MAX_LENGTH) {
    errors.addressLine = `نشانی باید حداکثر ${ADDRESS_LINE_MAX_LENGTH} کاراکتر باشد`;
  }

  const postalCode = normalizePostalCode(values.postalCode).trim();
  if (postalCode.length === 0) {
    errors.postalCode = "کد پستی الزامی است";
  } else if (!POSTAL_CODE_PATTERN.test(postalCode)) {
    errors.postalCode = `کد پستی باید ${POSTAL_CODE_LENGTH} رقم باشد`;
  }

  return errors;
}

/**
 * Builds the request body from validated form values: trimmed text, ASCII
 * digits, and `isDefault` only when the checkbox is on. Never adds phone, userId
 * or id — the backend derives the owner from the httpOnly cookie.
 */
export function buildAddressPayload(
  values: AddressFormValues,
): AddressPayload {
  const title = values.title.trim();
  const payload: AddressPayload = {
    // An empty title means "no title": null clears it on PATCH, and the create
    // DTO stores null as well (normalizeOptionalText).
    title: title.length > 0 ? title : null,
    recipientName: values.recipientName.trim(),
    province: values.province.trim(),
    city: values.city.trim(),
    addressLine: values.addressLine.trim(),
    postalCode: normalizePostalCode(values.postalCode).trim(),
  };
  if (values.isDefault) {
    payload.isDefault = true;
  }
  return payload;
}
