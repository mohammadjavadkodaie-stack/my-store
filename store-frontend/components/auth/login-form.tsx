"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login, requestOtp } from "@/lib/auth/client";
import { authErrorMessages } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import {
  OTP_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  PHONE_PREFIX,
  normalizeCode,
  normalizePhone,
  sanitizeOtpInput,
  sanitizePhoneInput,
  validateOtpCode,
  validatePhone,
} from "@/lib/auth/validation";
import { mergeGuestCart } from "@/lib/cart/merge";
import { AuthField } from "./auth-field";
import styles from "./login-form.module.css";

interface LoginFormProps {
  /** Post-login destination — already sanitized by the page (safeNextPath). */
  next: string;
}

interface LoginFieldErrors {
  phone?: string;
  code?: string;
}

/** "phone" = asking for the code, "code" = verifying it. */
type LoginStep = "phone" | "code";

/**
 * Two-step phone + OTP login.
 *
 * Step "phone": the visitor enters a phone number and requests a code
 * (POST /auth/otp/request). A registered phone moves on to the code step; a
 * phone without an account is sent to /register with the number prefilled.
 *
 * Step "code": the 6-digit code is verified with POST /auth/login, which sets
 * the httpOnly auth cookie. There is deliberately no resend button and no
 * countdown — no SMS provider is wired up yet.
 *
 * `method="post"` is kept on both forms: a native submit before hydration must
 * never put the entered phone/code into the URL.
 */
export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("phone");
  // The fixed "09" prefix is prefilled and cannot be deleted or edited.
  const [phone, setPhone] = useState(PHONE_PREFIX);
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  // Visual only (source design): a failed client-side validation shakes the
  // form. Two identical animations alternate so the class name changes on
  // every failure — that restarts the animation without remounting inputs.
  const [shakeCount, setShakeCount] = useState(0);
  const shakeClass =
    shakeCount === 0 ? "" : shakeCount % 2 === 1 ? styles.shakeA : styles.shakeB;

  function triggerShake() {
    setShakeCount((count) => count + 1);
  }

  function clearFieldError(field: keyof LoginFieldErrors) {
    if (fieldErrors[field] !== undefined) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  /** Step 1 — ask the backend whether this phone already has an account. */
  async function handleRequestOtp(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (pending) {
      return; // The disabled button already blocks this; keep it airtight.
    }

    const phoneError = validatePhone(phone);
    setFieldErrors({ phone: phoneError });
    setSubmitErrors([]);
    if (phoneError !== undefined) {
      triggerShake();
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    setPending(true);
    try {
      const { registered } = await requestOtp({ phone: normalizedPhone });
      if (registered) {
        setPhone(normalizedPhone);
        setStep("code");
        return;
      }
      // No account yet: continue on the register page with the phone prefilled.
      router.replace(
        `/register?phone=${encodeURIComponent(normalizedPhone)}&next=${encodeURIComponent(
          safeNextPath(next),
        )}`,
      );
    } catch (error) {
      setSubmitErrors(authErrorMessages(error));
    } finally {
      setPending(false);
    }
  }

  /** Step 2 — verify the code; success sets the httpOnly cookie. */
  async function handleLogin(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) {
      return; // The disabled button already blocks this; keep it airtight.
    }

    const codeError = validateOtpCode(code);
    setFieldErrors({ code: codeError });
    setSubmitErrors([]);
    if (codeError !== undefined) {
      setCode(""); // A rejected code never stays on screen.
      triggerShake();
      return;
    }

    setPending(true);
    try {
      await login({ phone: normalizePhone(phone), code: normalizeCode(code) });
      // Merge a guest cart into the fresh account before the redirect —
      // best-effort by design: it never throws and never blocks navigation.
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
    <>
      {submitErrors.length > 0 && (
        <div role="alert" aria-live="polite" className={styles.alert}>
          {submitErrors.length === 1 ? (
            <p>{submitErrors[0]}</p>
          ) : (
            <ul className={styles.alertList}>
              {submitErrors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === "phone" ? (
        <form
          method="post"
          action="/login"
          noValidate
          onSubmit={handleRequestOtp}
          className={`${styles.form} ${shakeClass}`}
        >
          <AuthField
            variant="floating"
            containerClassName={styles.field}
            className={styles.input}
            labelClassName={styles.label}
            errorClassName={styles.error}
            label="شماره موبایل"
            name="phone"
            type="tel"
            dir="ltr"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={PHONE_MAX_LENGTH}
            value={phone}
            onChange={(event) => {
              // Digits only, "09" prefix locked, Persian/Arabic digits become
              // ASCII — applied on change so paste and mobile keyboards work.
              setPhone(sanitizePhoneInput(event.target.value));
              clearFieldError("phone");
            }}
            error={fieldErrors.phone}
          />

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={styles.submit}
          >
            {pending && <span className={styles.spinner} aria-hidden="true" />}
            {pending ? "در حال ارسال..." : "دریافت کد تأیید"}
          </button>
        </form>
      ) : (
        <form
          method="post"
          action="/login"
          noValidate
          onSubmit={handleLogin}
          className={`${styles.form} ${shakeClass}`}
        >
          <p className={styles.phoneRow}>
            شماره موبایل:{" "}
            <span dir="ltr" className={styles.phoneValue}>
              {phone}
            </span>
          </p>

          <AuthField
            variant="floating"
            containerClassName={styles.field}
            className={styles.input}
            labelClassName={styles.label}
            errorClassName={styles.error}
            label="کد تأیید"
            name="code"
            type="text"
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_MAX_LENGTH}
            value={code}
            onChange={(event) => {
              // Digits only (Persian/Arabic digits become ASCII), at most 6.
              setCode(sanitizeOtpInput(event.target.value));
              clearFieldError("code");
            }}
            error={fieldErrors.code}
          />

          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className={styles.submit}
          >
            {pending && <span className={styles.spinner} aria-hidden="true" />}
            {pending ? "در حال ورود..." : "ورود"}
          </button>
        </form>
      )}
    </>
  );
}
