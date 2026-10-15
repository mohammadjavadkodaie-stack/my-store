"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  saveAdminDiscountBand,
  type DiscountBandConfig,
} from "@/lib/api/admin-discount-band";
import { apiFetch } from "@/lib/api/client";
import { isApiError } from "@/lib/api/error";
import {
  JALALI_MONTH_NAMES,
  gregorianToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
} from "@/lib/jalali";

/** Input style copied from the category/slide admin forms. */
const INPUT_CLASS =
  "mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

/** Primary submit button copied from the category/slide admin forms. */
const SUBMIT_BUTTON_CLASS =
  "rounded-md bg-primary px-4 py-2 text-sm font-bold text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const ERROR_CLASS = "mt-1 text-xs font-medium text-red-700";
const HINT_CLASS = "mt-1 text-sm text-foreground/70";

/** Persian date + time for the saved end of the timer (Persian calendar). */
const faDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Result of the last submit: one short Persian notice, success or failure. */
type Notice = { kind: "success" | "error"; message: string };

interface DiscountBandSettingsCardProps {
  /** Guarded settings loaded server-side; null when they could not be read. */
  settings: DiscountBandConfig | null;
}

/** The five Jalali numbers the timer-end picker edits (browser local time). */
interface JalaliMoment {
  jy: number;
  jm: number;
  jd: number;
  hour: number;
  minute: number;
}

/** Persian digits without grouping, for year/month/day option labels. */
const faDigits = new Intl.NumberFormat("fa-IR", { useGrouping: false });

/** Persian digits padded to two, for hour/minute option labels (9 -> "۰۹"). */
const faDigits2 = new Intl.NumberFormat("fa-IR", {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

/** One hour in milliseconds — the fallback end when nothing is saved. */
const ONE_HOUR_MS = 60 * 60 * 1000;

/** Local-time Date -> the five Jalali numbers of the picker. */
function toJalaliMoment(date: Date): JalaliMoment {
  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return { jy, jm, jd, hour: date.getHours(), minute: date.getMinutes() };
}

/**
 * Initial picker state: the saved ISO timestamp converted to the browser's
 * local time and then to Jalali, or one hour from now when nothing is saved
 * (or the saved value cannot be parsed).
 */
function initialMoment(iso: string | null): JalaliMoment {
  if (iso !== null) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return toJalaliMoment(date);
    }
  }
  return toJalaliMoment(new Date(Date.now() + ONE_HOUR_MS));
}

/** The five Jalali numbers -> a local Date (seconds and milliseconds zeroed). */
function jalaliMomentToDate({ jy, jm, jd, hour, minute }: JalaliMoment): Date {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, hour, minute, 0, 0);
}

/** True when every picker part is a real, in-range integer. */
function isCompleteMoment({ jy, jm, jd, hour, minute }: JalaliMoment): boolean {
  return (
    Number.isInteger(jy) &&
    Number.isInteger(jm) &&
    jm >= 1 &&
    jm <= 12 &&
    Number.isInteger(jd) &&
    jd >= 1 &&
    jd <= jalaliMonthLength(jy, jm) &&
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59
  );
}

/**
 * Validates the picker while the timer is on: all five parts required, the
 * date parsable and strictly in the future. Returns the Persian message, or
 * null when valid.
 */
function validateTimerEnd(moment: JalaliMoment): string | null {
  if (!isCompleteMoment(moment)) {
    return "زمان پایان تایمر را وارد کنید.";
  }
  const date = jalaliMomentToDate(moment);
  if (Number.isNaN(date.getTime())) {
    return "زمان پایان تایمر نامعتبر است.";
  }
  if (date.getTime() <= Date.now()) {
    return "زمان پایان تایمر باید در آینده باشد.";
  }
  return null;
}

/** Persian date + time of a saved ISO timestamp; unparsable values show "—". */
function formatSavedEnd(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : faDateTimeFormatter.format(date);
}

/**
 * Maps a failed request to one fixed Persian message per status. The backend's
 * own text is never rendered — it may leak internal or user data.
 */
function describeApiError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 400) {
      return "داده‌های ارسالی نامعتبر است؛ مقادیر را بررسی کنید.";
    }
    if (error.status === 401) {
      return "اعتبار ورود منقضی شده است؛ لطفاً دوباره وارد شوید.";
    }
    if (error.status === 403) {
      return "شما به این بخش دسترسی ندارید.";
    }
    if (error.isNetworkError) {
      return "ارتباط با سرور برقرار نشد؛ لطفاً دوباره تلاش کنید.";
    }
  }
  return "خطایی رخ داد؛ لطفاً دوباره تلاش کنید.";
}

/** One labelled on/off switch (a button with role="switch", RTL aware). */
function Switch({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? "justify-end border-primary bg-primary"
            : "justify-start border-border bg-foreground/10"
        }`}
      >
        <span
          aria-hidden="true"
          className="mx-0.5 inline-block size-4 rounded-full bg-background shadow"
        />
      </button>
    </div>
  );
}

/** One number <select> of the Jalali picker (RTL, Persian-digit labels). */
function JalaliSelect({
  id,
  label,
  value,
  disabled,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <div className="min-w-0 flex-1">
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={INPUT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Admin card for the home discount band (top of /admin/slides): the band and
 * timer switches, the timer end (a Jalali date-time picker that is enabled only
 * while the timer is on) and a Save button.
 *
 * The current values are loaded server-side from GET /settings/discount-band
 * and handed down as `settings`; saving PATCHes /admin/settings/discount-band
 * through `apiFetch` with the admin's cookie. While the timer is on the end time
 * is required and must be in the future (Persian client validation); the Jalali
 * picker value is converted to a local Date and sent as an ISO-8601 string.
 */
export function DiscountBandSettingsCard({
  settings,
}: DiscountBandSettingsCardProps) {
  const [bandEnabled, setBandEnabled] = useState(settings?.bandEnabled ?? true);
  const [timerEnabled, setTimerEnabled] = useState(
    settings?.timerEnabled ?? false,
  );
  const [moment, setMoment] = useState<JalaliMoment>(() =>
    initialMoment(settings?.timerEndsAt ?? null),
  );
  const [savedEndsAt, setSavedEndsAt] = useState<string | null>(
    settings?.timerEndsAt ?? null,
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Applies a picker change, clamping the day to the new month's length. */
  function updateMoment(patch: Partial<JalaliMoment>): void {
    setMoment((current) => {
      const next = { ...current, ...patch };
      next.jd = Math.min(next.jd, jalaliMonthLength(next.jy, next.jm));
      return next;
    });
    setFieldError(null);
    setNotice(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    setNotice(null);

    // The end is only required while the timer is on; off means "no timer".
    let timerEndsAtIso: string | null = null;
    if (timerEnabled) {
      const error = validateTimerEnd(moment);
      if (error !== null) {
        setFieldError(error);
        return;
      }
      timerEndsAtIso = jalaliMomentToDate(moment).toISOString();
    }
    setFieldError(null);

    setSubmitting(true);
    try {
      await saveAdminDiscountBand(
        { bandEnabled, timerEnabled, timerEndsAt: timerEndsAtIso },
        apiFetch,
      );
      setSavedEndsAt(timerEndsAtIso);
      setNotice({ kind: "success", message: "تنظیمات باند تخفیف ذخیره شد." });
    } catch (error) {
      setNotice({ kind: "error", message: describeApiError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  if (settings === null) {
    return (
      <section className="rounded-lg border border-border bg-background p-8">
        <h2 className="text-lg font-extrabold text-foreground">باند تخفیف</h2>
        <p className="mt-4 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground/70">
          دریافت تنظیمات باند تخفیف ممکن نشد؛ لطفاً دوباره تلاش کنید.
        </p>
      </section>
    );
  }

  const currentJalaliYear = toJalaliMoment(new Date()).jy;
  const years = [currentJalaliYear, currentJalaliYear + 1, currentJalaliYear + 2];
  const dayCount = jalaliMonthLength(moment.jy, moment.jm);
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);
  const pickerDisabled = !timerEnabled || submitting;

  return (
    <section className="rounded-lg border border-border bg-background p-8">
      <h2 className="text-lg font-extrabold text-foreground">باند تخفیف</h2>
      <p className="mt-2 text-sm text-foreground/60">
        نمایش نوار تخفیف صفحه‌ی اصلی و تایمر آن را از اینجا مدیریت کنید.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 flex max-w-xl flex-col gap-5"
      >
        <Switch
          id="discount-band-enabled"
          label="نمایش باند تخفیف"
          checked={bandEnabled}
          disabled={submitting}
          onChange={(next) => {
            setBandEnabled(next);
            setNotice(null);
          }}
        />

        <Switch
          id="discount-band-timer-enabled"
          label="نمایش تایمر"
          checked={timerEnabled}
          disabled={submitting}
          onChange={(next) => {
            setTimerEnabled(next);
            setFieldError(null);
            setNotice(null);
          }}
        />

        <div>
          <span
            id="discount-band-timer-label"
            className="block text-sm font-medium text-foreground"
          >
            پایان تایمر
          </span>
          <div
            dir="rtl"
            role="group"
            aria-labelledby="discount-band-timer-label"
            aria-invalid={fieldError !== null}
            aria-describedby={
              fieldError !== null
                ? "discount-band-timer-error discount-band-timer-saved"
                : "discount-band-timer-saved"
            }
            className="flex flex-row items-start gap-2"
          >
            <JalaliSelect
              id="discount-band-timer-year"
              label="سال"
              value={moment.jy}
              disabled={pickerDisabled}
              onChange={(jy) => updateMoment({ jy })}
              options={years.map((year) => ({
                value: year,
                label: faDigits.format(year),
              }))}
            />
            <JalaliSelect
              id="discount-band-timer-month"
              label="ماه"
              value={moment.jm}
              disabled={pickerDisabled}
              onChange={(jm) => updateMoment({ jm })}
              options={JALALI_MONTH_NAMES.map((name, index) => ({
                value: index + 1,
                label: name,
              }))}
            />
            <JalaliSelect
              id="discount-band-timer-day"
              label="روز"
              value={moment.jd}
              disabled={pickerDisabled}
              onChange={(jd) => updateMoment({ jd })}
              options={days.map((day) => ({
                value: day,
                label: faDigits.format(day),
              }))}
            />
            <JalaliSelect
              id="discount-band-timer-hour"
              label="ساعت"
              value={moment.hour}
              disabled={pickerDisabled}
              onChange={(hour) => updateMoment({ hour })}
              options={hours.map((hour) => ({
                value: hour,
                label: faDigits2.format(hour),
              }))}
            />
            <JalaliSelect
              id="discount-band-timer-minute"
              label="دقیقه"
              value={moment.minute}
              disabled={pickerDisabled}
              onChange={(minute) => updateMoment({ minute })}
              options={minutes.map((minute) => ({
                value: minute,
                label: faDigits2.format(minute),
              }))}
            />
          </div>
          {fieldError !== null ? (
            <p
              id="discount-band-timer-error"
              role="alert"
              className={ERROR_CLASS}
            >
              {fieldError}
            </p>
          ) : null}
          <p id="discount-band-timer-saved" className={HINT_CLASS}>
            زمان پایان ذخیره‌شده:{" "}
            <span className="font-medium text-foreground">
              {savedEndsAt !== null ? formatSavedEnd(savedEndsAt) : "تنظیم نشده"}
            </span>
          </p>
        </div>

        {notice !== null ? (
          <p
            role={notice.kind === "success" ? "status" : "alert"}
            aria-live="polite"
            className={`rounded-md border px-4 py-3 text-sm font-medium ${
              notice.kind === "success"
                ? "border-green-600/30 bg-green-600/10 text-green-700"
                : "border-red-600/40 bg-red-600/10 text-red-700"
            }`}
          >
            {notice.message}
          </p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className={SUBMIT_BUTTON_CLASS}
          >
            {submitting ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </form>
    </section>
  );
}

