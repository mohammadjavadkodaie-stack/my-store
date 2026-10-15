"use client";

import { useId, type ChangeEvent } from "react";

interface AuthFieldProps {
  /** Visible Persian label. */
  label: string;
  /** Submitted field name — mirrors the backend DTO property. */
  name: string;
  /** "tel" for the phone/code inputs; "text" for the Persian name fields. */
  type: "text" | "tel";
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** e.g. "tel", "given-name", "family-name", "one-time-code". */
  autoComplete?: string;
  /** "ltr" for the latin-digit phone/code inputs; Persian fields inherit rtl. */
  dir?: "ltr";
  /** "numeric" on the phone/code inputs: number pad on mobile keyboards. */
  inputMode?: "numeric";
  maxLength?: number;
  minLength?: number;
  placeholder?: string;
  /** Client-side Persian validation message, wired to aria-describedby/aria-invalid. */
  error?: string;
  /**
   * "default" (unchanged) puts the label above the input — register/account.
   * "floating" renders the input first and the label inside it, so the login
   * page can float the label up with its own CSS Module (`input ~ label`).
   */
  variant?: "default" | "floating";
  /** Extra classes for the input — used by the redesigned login page only. */
  className?: string;
  /** Extra classes for the label — floating variant only. */
  labelClassName?: string;
  /** Extra classes for the wrapper — floating variant only. */
  containerClassName?: string;
  /** Extra classes for the error message — floating variant only. */
  errorClassName?: string;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Small labeled input shared by the auth forms: Persian label, stable id via
 * useId, an optional field-level error (described by aria-describedby and
 * signalled with aria-invalid) and the same visible focus ring as every other
 * control in the app.
 */
export function AuthField({
  label,
  name,
  type,
  value,
  onChange,
  autoComplete,
  dir,
  inputMode,
  maxLength,
  minLength,
  placeholder,
  error,
  variant = "default",
  className,
  labelClassName,
  containerClassName,
  errorClassName,
}: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const isFloating = variant === "floating";

  const inputClassName =
    className ??
    `w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/50 focus-visible:outline-none ${FOCUS_RING} ${
      error === undefined ? "border-border" : "border-foreground/50"
    }`;

  const input = (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      dir={dir}
      inputMode={inputMode}
      maxLength={maxLength}
      minLength={minLength}
      // A single space keeps :placeholder-shown working for the floating label
      // (the label itself carries the hint in that variant).
      placeholder={isFloating ? " " : placeholder}
      aria-invalid={error === undefined ? undefined : true}
      aria-describedby={error === undefined ? undefined : errorId}
      className={inputClassName}
    />
  );

  return (
    <div className={isFloating ? containerClassName : "flex flex-col gap-1.5"}>
      {isFloating ? (
        <>
          {input}
          <label htmlFor={id} className={labelClassName}>
            {label}
          </label>
        </>
      ) : (
        <>
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
          {input}
        </>
      )}
      {error !== undefined && (
        <p
          id={errorId}
          className={
            isFloating ? errorClassName : "text-xs leading-5 text-foreground/70"
          }
        >
          {error}
        </p>
      )}
    </div>
  );
}
