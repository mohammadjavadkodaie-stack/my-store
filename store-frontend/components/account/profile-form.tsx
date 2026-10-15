"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthField } from "@/components/auth/auth-field";
import { isApiError } from "@/lib/api/error";
import { updateProfile } from "@/lib/auth/client";
import {
  NAME_MAX_LENGTH,
  validateFirstName,
  validateLastName,
} from "@/lib/auth/validation";

/** Same primary button as every other auth action in the app. */
const SUBMIT_BUTTON_CLASSNAME =
  "rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60";

interface ProfileFormProps {
  /** Current first name of the signed-in user, read server-side by the page. */
  firstName: string;
  /** Current last name of the signed-in user, read server-side by the page. */
  lastName: string;
  /** Read-only: the backend's UpdateProfileDto has no phone field at all. */
  phone: string;
}

interface ProfileFieldErrors {
  firstName?: string;
  lastName?: string;
}

/** Result of the last submit: one short Persian notice, success or failure. */
type ProfileNotice = { kind: "success" | "error"; message: string };

/**
 * Message shown for a failed PATCH /auth/profile.
 *
 * The backend's own message is displayed as-is (the profile DTO returns Persian
 * field messages), with one exception: a 401 from the JWT guard carries NestJS's
 * untranslated "Unauthorized", so that status gets a fixed Persian text.
 * Anything that is not an ApiError falls back to a generic text.
 */
function describeProfileError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) {
      return "نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.";
    }
    return error.message;
  }
  return "خطایی رخ داد. لطفاً دوباره تلاش کنید.";
}

/**
 * Edit form of the account profile: first and last name only.
 *
 * Validation mirrors the backend DTO (update-profile.dto.ts, @Length(2, 50)
 * after trim) so the visitor gets instant Persian feedback, but the backend
 * stays the authority. Only { firstName, lastName } is sent — the phone number
 * is rendered as a disabled, read-only field because neither the DTO nor the
 * endpoint accepts it.
 *
 * `method="post"` is kept: a native submit before hydration must never put the
 * entered names into the URL. A successful save re-renders the current route
 * with `router.refresh()`, so the header (which reads the user server-side)
 * shows the new name.
 */
export function ProfileForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  phone,
}: ProfileFormProps) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [notice, setNotice] = useState<ProfileNotice | null>(null);
  const [pending, setPending] = useState(false);

  function clearFieldError(field: keyof ProfileFieldErrors) {
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

    const nextFieldErrors: ProfileFieldErrors = {
      firstName: validateFirstName(firstName),
      lastName: validateLastName(lastName),
    };
    setFieldErrors(nextFieldErrors);
    setNotice(null);

    const valid = Object.values(nextFieldErrors).every(
      (message) => message === undefined,
    );
    if (!valid) {
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    setPending(true);
    try {
      // Exactly the UpdateProfileDto fields; the backend whitelist rejects extras.
      await updateProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });
      // The field shows what was actually stored (the backend trims as well).
      setFirstName(trimmedFirstName);
      setLastName(trimmedLastName);
      setNotice({
        kind: "success",
        message: "اطلاعات حساب شما با موفقیت ذخیره شد.",
      });
      // Re-renders this route on the server, so the header — which reads the
      // user through getCurrentUser — picks up the new name right away.
      router.refresh();
    } catch (error) {
      setNotice({ kind: "error", message: describeProfileError(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action="/account/profile"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {notice !== null && (
        <p
          role={notice.kind === "success" ? "status" : "alert"}
          aria-live="polite"
          className={`rounded-2xl border p-4 text-sm leading-6 ${
            notice.kind === "success"
              ? "border-border bg-primary/5 text-foreground"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </p>
      )}

      <AuthField
        label="نام"
        name="firstName"
        type="text"
        autoComplete="given-name"
        maxLength={NAME_MAX_LENGTH}
        value={firstName}
        onChange={(event) => {
          setFirstName(event.target.value);
          clearFieldError("firstName");
          setNotice(null);
        }}
        error={fieldErrors.firstName}
      />
      <AuthField
        label="نام خانوادگی"
        name="lastName"
        type="text"
        autoComplete="family-name"
        maxLength={NAME_MAX_LENGTH}
        value={lastName}
        onChange={(event) => {
          setLastName(event.target.value);
          clearFieldError("lastName");
          setNotice(null);
        }}
        error={fieldErrors.lastName}
      />

      {/* Phone: never editable — the backend DTO has no phone field, so the
          value is displayed disabled (and therefore never submitted). */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="profile-phone"
          className="text-sm font-medium text-foreground"
        >
          شماره موبایل
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          dir="ltr"
          readOnly
          disabled
          aria-describedby="profile-phone-hint"
          className="w-full cursor-not-allowed rounded-lg border border-border bg-foreground/5 px-3 py-2 text-sm text-foreground/60 focus-visible:outline-none"
        />
        <p
          id="profile-phone-hint"
          className="text-xs leading-5 text-foreground/50"
        >
          شماره موبایل قابل تغییر نیست.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className={SUBMIT_BUTTON_CLASSNAME}
      >
        {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
