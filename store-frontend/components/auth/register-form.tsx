"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { register } from "@/lib/auth/client";
import { authErrorMessages } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  NAME_MAX_LENGTH,
  OTP_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  normalizeCode,
  normalizePhone,
  sanitizeOtpInput,
  sanitizePhoneInput,
  validateFirstName,
  validateLastName,
  validateOtpCode,
  validatePhone,
} from "@/lib/auth/validation";
import { mergeGuestCart } from "@/lib/cart/merge";
import { AuthField } from "./auth-field";
// The login redesign skin is reused as-is (floating-label fields, alert,
// gradient submit button with spinner, shake). Only the two-name row layout is
// register-specific, so it lives in its own small module.
import formStyles from "./login-form.module.css";
import styles from "./register-form.module.css";

/**
 * Props shared by every field: the floating-label variant skinned by the login
 * form module, so the register inputs look exactly like the login ones.
 */
const FLOATING_FIELD_PROPS = {
  variant: "floating",
  className: formStyles.input,
  labelClassName: formStyles.label,
  containerClassName: formStyles.field,
  errorClassName: formStyles.error,
} as const;

interface RegisterFormProps {
  /** Post-register destination — already sanitized by the page (safeNextPath). */
  next: string;
  /** Phone carried over from /login?phone=... ("" when absent) — editable. */
  initialPhone: string;
}

interface RegisterFieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  code?: string;
}

/**
 * Phone + OTP registration: first name, last name, phone (prefilled from the
 * login step, editable) and the 6-digit code.
 *
 * `method="post"` is required: a native submit before hydration must never put
 * the entered values into the URL. A successful POST /auth/register sets the
 * httpOnly auth cookie, so the visitor is signed in automatically and goes
 * straight to `next`.
 */
export function RegisterForm({ next, initialPhone }: RegisterFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Prefilled from the login step ("09" when absent) and sanitized so the
  // fixed "09" prefix can never be deleted or edited.
  const [phone, setPhone] = useState(() =>
    sanitizePhoneInput(normalizePhone(initialPhone)),
  );
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  // Bumped on every failed client-side validation: the two identical shake
  // animations alternate, so the class name changes and the animation restarts
  // without remounting the inputs (same trick as the login form).
  const [shakeCount, setShakeCount] = useState(0);

  function clearFieldError(field: keyof RegisterFieldErrors) {
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

    const nextFieldErrors: RegisterFieldErrors = {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
      phone: validatePhone(phone),
      code: validateOtpCode(code),
    };
    setFieldErrors(nextFieldErrors);
    setSubmitErrors([]);

    const valid = Object.values(nextFieldErrors).every(
      (message) => message === undefined,
    );
    if (!valid) {
      setCode(""); // A rejected code never stays on screen.
      setShakeCount((count) => count + 1);
      return;
    }

    setPending(true);
    try {
      // Exactly the RegisterDto fields; the backend whitelist rejects extras.
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
        code: normalizeCode(code),
      });
      // Registration signs the visitor in (the backend sets the httpOnly
      // cookie), so they continue to `next` as a signed-in user.
      // A guest cart is merged into the fresh account first — best-effort
      // by design: it never throws and never blocks navigation.
      await mergeGuestCart();
      router.replace(safeNextPath(next));
      router.refresh();
    } catch (error) {
      setSubmitErrors(authErrorMessages(error));
      setCode(""); // A rejected code never stays on screen.
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action="/register"
      noValidate
      onSubmit={handleSubmit}
      className={`${formStyles.form} ${
        shakeCount === 0
          ? ""
          : shakeCount % 2 === 1
            ? formStyles.shakeA
            : formStyles.shakeB
      }`}
    >
      {submitErrors.length > 0 && (
        <div role="alert" aria-live="polite" className={formStyles.alert}>
          {submitErrors.length === 1 ? (
            <p>{submitErrors[0]}</p>
          ) : (
            <ul className={formStyles.alertList}>
              {submitErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Two name fields side by side on wide screens, stacked on mobile. */}
      <div className={styles.nameRow}>
        <AuthField
          {...FLOATING_FIELD_PROPS}
          label="نام"
          name="firstName"
          type="text"
          autoComplete="given-name"
          maxLength={NAME_MAX_LENGTH}
          value={firstName}
          onChange={(event) => {
            setFirstName(event.target.value);
            clearFieldError("firstName");
          }}
          error={fieldErrors.firstName}
        />
        <AuthField
          {...FLOATING_FIELD_PROPS}
          label="نام خانوادگی"
          name="lastName"
          type="text"
          autoComplete="family-name"
          maxLength={NAME_MAX_LENGTH}
          value={lastName}
          onChange={(event) => {
            setLastName(event.target.value);
            clearFieldError("lastName");
          }}
          error={fieldErrors.lastName}
        />
      </div>
      <AuthField
        {...FLOATING_FIELD_PROPS}
        label="شماره تلفن"
        name="phone"
        type="tel"
        dir="ltr"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={PHONE_MAX_LENGTH}
        placeholder="09123456789"
        value={phone}
        onChange={(event) => {
          // Digits only, "09" prefix locked, Persian/Arabic digits become
          // ASCII — applied on change so paste and mobile keyboards work.
          setPhone(sanitizePhoneInput(event.target.value));
          clearFieldError("phone");
        }}
        error={fieldErrors.phone}
      />
      <AuthField
        {...FLOATING_FIELD_PROPS}
        label="کد تأیید"
        name="code"
        type="text"
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_MAX_LENGTH}
        placeholder="123456"
        value={code}
        onChange={(event) => {
          // Digits only (Persian/Arabic digits become ASCII), at most 6.
          setCode(sanitizeOtpInput(event.target.value));
          clearFieldError("code");
        }}
        error={fieldErrors.code}
      />

      <button type="submit" disabled={pending} className={formStyles.submit}>
        {pending && <span className={formStyles.spinner} aria-hidden="true" />}
        {pending ? "در حال ارسال..." : "ثبت‌نام"}
      </button>
    </form>
  );
}
