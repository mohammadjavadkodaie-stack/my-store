"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Address } from "@/lib/api/addresses";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";
import { PROVINCES } from "@/lib/addresses/provinces";
import {
  ADDRESS_LINE_MAX_LENGTH,
  CITY_MAX_LENGTH,
  POSTAL_CODE_LENGTH,
  RECIPIENT_NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  buildAddressPayload,
  normalizePostalCode,
  validateAddressFields,
  type AddressField,
  type AddressFieldErrors,
  type AddressFormValues,
} from "@/lib/addresses/validation";

/** Same primary button as the profile form and every other account action. */
const SUBMIT_BUTTON_CLASSNAME =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Same control look as the account profile fields. */
const INPUT_CLASSNAME = `w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 ${FOCUS_RING}`;

const LABEL_CLASSNAME = "text-sm font-medium text-foreground";

const HINT_CLASSNAME = "text-xs leading-5 text-foreground/50";

const FIELD_ERROR_CLASSNAME = "text-xs leading-5 text-foreground/70";

const ERROR_TEXT_CLASSNAME =
  "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700";

/** Red star appended to the label of a required field. */
const REQUIRED_MARK = (
  <span aria-hidden="true" className="text-red-600">
    {" *"}
  </span>
);

/**
 * Message shown for a failed /addresses call.
 *
 * The backend's own message is displayed as-is (the address endpoints answer in
 * Persian, e.g. "آدرس یافت نشد" or "حداکثر ۳ آدرس می‌توانید ثبت کنید."), with one
 * exception: a 401 from the JWT guard carries NestJS's untranslated
 * "Unauthorized", so that status gets a fixed Persian text. Anything that is not
 * an ApiError falls back to a generic text.
 */
function describeAddressError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.";
    }
    return error.message;
  }
  return "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
}

interface AddressFieldProps {
  /** Visible Persian label. */
  label: string;
  /** Submitted field name — mirrors the backend DTO property. */
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  maxLength: number;
  /** Marks the label with a red star and sets aria-required. */
  required?: boolean;
  /** "ltr" for the latin-digit postal code; Persian fields inherit rtl. */
  dir?: "ltr";
  /** "numeric" on the postal-code input: number pad on mobile keyboards. */
  inputMode?: "numeric";
  autoComplete?: string;
  placeholder?: string;
  /** Client-side Persian validation message, wired to aria-describedby. */
  error?: string;
}

/**
 * One labeled text input of the address form: Persian label, stable id via
 * useId, and an optional field-level error shown exactly like the profile
 * form's fields (aria-invalid + aria-describedby, muted text).
 */
function AddressField({
  label,
  name,
  value,
  onChange,
  maxLength,
  required,
  dir,
  inputMode,
  autoComplete,
  placeholder,
  error,
}: AddressFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASSNAME}>
        {label}
        {required === true && REQUIRED_MARK}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        dir={dir}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-required={required === true ? true : undefined}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
        className={`${INPUT_CLASSNAME} ${
          error === undefined ? "border-border" : "border-foreground/50"
        }`}
      />
      {error !== undefined && (
        <p id={errorId} className={FIELD_ERROR_CLASSNAME}>
          {error}
        </p>
      )}
    </div>
  );
}

interface AddressFormProps {
  /**
   * Read-only account phone, read server-side by the page. It belongs to the
   * account, not to an address, so it is only displayed and never submitted.
   */
  phone: string;
  /** Edit mode: the address loaded and guarded by the server page. */
  address?: Address;
  /** Create mode: initial recipient name — the account holder's full name. */
  defaultRecipientName?: string;
}

/**
 * The one form shared by /account/addresses/new and
 * /account/addresses/[id]/edit.
 *
 * It POSTs /addresses in create mode and PATCHes /addresses/:id in edit mode
 * through `apiFetch`, with a body made of exactly the allowed DTO fields
 * (trimmed text, ASCII postal-code digits, isDefault only when it is true):
 * phone, userId and id are never sent — the backend derives the owner from the
 * httpOnly cookie. Validation mirrors the DTOs for instant Persian feedback, but
 * the backend stays the authority and its message is shown in the alert box.
 *
 * `method="post"` is kept: a native submit before hydration must never put the
 * entered address into the URL. A successful save returns to the list and
 * refreshes it, so the new/edited row is visible right away.
 */
export function AddressForm({
  phone,
  address,
  defaultRecipientName,
}: AddressFormProps) {
  const router = useRouter();
  const fieldId = useId();
  const provinceId = `${fieldId}-province`;
  const provinceErrorId = `${provinceId}-error`;
  const addressLineId = `${fieldId}-address-line`;
  const addressLineErrorId = `${addressLineId}-error`;
  const isDefaultId = `${fieldId}-is-default`;
  const phoneId = `${fieldId}-phone`;
  const phoneHintId = `${phoneId}-hint`;

  const [title, setTitle] = useState(address?.title ?? "");
  const [recipientName, setRecipientName] = useState(
    address?.recipientName ?? defaultRecipientName ?? "",
  );
  const [province, setProvince] = useState(address?.province ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [addressLine, setAddressLine] = useState(address?.addressLine ?? "");
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? "");
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);
  const [fieldErrors, setFieldErrors] = useState<AddressFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * The address endpoints only accept `isDefault: true`, so the current default
   * cannot be unset from here: its box is checked and locked, and the hint below
   * points at the list, where another address can be made the default.
   */
  const defaultLocked = address?.isDefault === true;

  function clearFieldError(field: AddressField) {
    if (fieldErrors[field] !== undefined) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (pending) {
      return; // The disabled button already blocks this; keep it airtight.
    }

    const values: AddressFormValues = {
      title,
      recipientName,
      province,
      city,
      addressLine,
      postalCode,
      isDefault,
    };
    const errors = validateAddressFields(values);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPending(true);
    try {
      // Only the DTO fields, trimmed; the backend rejects anything extra.
      const body = buildAddressPayload(values);
      if (address === undefined) {
        await apiFetch<Address>("/addresses", { method: "POST", body });
      } else {
        await apiFetch<Address>(`/addresses/${address.id}`, {
          method: "PATCH",
          body,
        });
      }
      router.push("/account/addresses");
      router.refresh();
    } catch (error) {
      setFormError(describeAddressError(error));
      // Staying on the form: the visitor can fix the values and try again.
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action="/account/addresses"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {/* The backend's own Persian message (e.g. the 3-address limit). */}
      {formError !== null && (
        <p role="alert" aria-live="polite" className={ERROR_TEXT_CLASSNAME}>
          {formError}
        </p>
      )}

      <AddressField
        label="عنوان (اختیاری)"
        name="title"
        value={title}
        maxLength={TITLE_MAX_LENGTH}
        autoComplete="off"
        placeholder="خانه"
        onChange={(event) => {
          setTitle(event.target.value);
          clearFieldError("title");
          setFormError(null);
        }}
        error={fieldErrors.title}
      />

      <AddressField
        label="نام گیرنده"
        name="recipientName"
        value={recipientName}
        maxLength={RECIPIENT_NAME_MAX_LENGTH}
        required
        autoComplete="name"
        onChange={(event) => {
          setRecipientName(event.target.value);
          clearFieldError("recipientName");
          setFormError(null);
        }}
        error={fieldErrors.recipientName}
      />

      {/* Phone: read-only and disabled, so it is never submitted — it belongs to
          the account, not to the address (neither DTO has a phone field). */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={phoneId} className={LABEL_CLASSNAME}>
          شماره موبایل
        </label>
        <input
          id={phoneId}
          type="tel"
          value={phone}
          dir="ltr"
          readOnly
          disabled
          aria-describedby={phoneHintId}
          className="w-full cursor-not-allowed rounded-lg border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground/60 focus-visible:outline-none"
        />
        <p id={phoneHintId} className={HINT_CLASSNAME}>
          موبایل گیرنده همان شماره‌ی حساب شماست.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={provinceId} className={LABEL_CLASSNAME}>
          استان
          {REQUIRED_MARK}
        </label>
        <select
          id={provinceId}
          name="province"
          value={province}
          aria-required={true}
          aria-invalid={fieldErrors.province === undefined ? undefined : true}
          aria-describedby={
            fieldErrors.province === undefined ? undefined : provinceErrorId
          }
          onChange={(event) => {
            setProvince(event.target.value);
            clearFieldError("province");
            setFormError(null);
          }}
          className={`${INPUT_CLASSNAME} ${
            fieldErrors.province === undefined
              ? "border-border"
              : "border-foreground/50"
          }`}
        >
          <option value="" disabled>
            انتخاب کنید
          </option>
          {/* Exactly the backend's fixed list — anything else is a 400. */}
          {PROVINCES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {fieldErrors.province !== undefined && (
          <p id={provinceErrorId} className={FIELD_ERROR_CLASSNAME}>
            {fieldErrors.province}
          </p>
        )}
      </div>

      <AddressField
        label="شهر"
        name="city"
        value={city}
        maxLength={CITY_MAX_LENGTH}
        required
        autoComplete="address-level2"
        onChange={(event) => {
          setCity(event.target.value);
          clearFieldError("city");
          setFormError(null);
        }}
        error={fieldErrors.city}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={addressLineId} className={LABEL_CLASSNAME}>
          نشانی
          {REQUIRED_MARK}
        </label>
        <textarea
          id={addressLineId}
          name="addressLine"
          value={addressLine}
          rows={3}
          maxLength={ADDRESS_LINE_MAX_LENGTH}
          aria-required={true}
          aria-invalid={fieldErrors.addressLine === undefined ? undefined : true}
          aria-describedby={
            fieldErrors.addressLine === undefined ? undefined : addressLineErrorId
          }
          onChange={(event) => {
            setAddressLine(event.target.value);
            clearFieldError("addressLine");
            setFormError(null);
          }}
          className={`${INPUT_CLASSNAME} resize-y ${
            fieldErrors.addressLine === undefined
              ? "border-border"
              : "border-foreground/50"
          }`}
        />
        {fieldErrors.addressLine !== undefined && (
          <p id={addressLineErrorId} className={FIELD_ERROR_CLASSNAME}>
            {fieldErrors.addressLine}
          </p>
        )}
      </div>

      <AddressField
        label="کد پستی"
        name="postalCode"
        value={postalCode}
        maxLength={POSTAL_CODE_LENGTH}
        required
        dir="ltr"
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder="1234567890"
        onChange={(event) => {
          // Persian/Arabic digits become ASCII as they are typed, so the value
          // sent to the backend always matches /^\d{10}$/.
          setPostalCode(normalizePostalCode(event.target.value));
          clearFieldError("postalCode");
          setFormError(null);
        }}
        error={fieldErrors.postalCode}
      />

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2">
          <input
            id={isDefaultId}
            name="isDefault"
            type="checkbox"
            checked={isDefault}
            disabled={defaultLocked}
            onChange={(event) => {
              setIsDefault(event.target.checked);
              setFormError(null);
            }}
            className={`h-4 w-4 accent-primary ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-60`}
          />
          <label htmlFor={isDefaultId} className={LABEL_CLASSNAME}>
            این آدرس پیش‌فرض باشد
          </label>
        </span>
        {defaultLocked && (
          <p className={HINT_CLASSNAME}>
            این آدرس پیش‌فرض حساب شماست؛ برای تغییر آن از فهرست آدرس‌ها استفاده
            کنید.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className={SUBMIT_BUTTON_CLASSNAME}
      >
        {pending
          ? "در حال ذخیره..."
          : address === undefined
            ? "ذخیره آدرس"
            : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
