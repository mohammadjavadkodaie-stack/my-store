/**
 * Jalali (Persian) calendar <-> Gregorian calendar conversion.
 *
 * Pure, dependency-free implementation of the standard Jalali arithmetic (the
 * well-known 33-year-cycle algorithm used by Persian date libraries). Every
 * function is total and side-effect free — no clock, DOM or global state — so
 * it runs identically during SSR and in the browser.
 *
 * Month lengths follow the calendar rule: months 1-6 have 31 days, 7-11 have
 * 30, and month 12 (اسفند) has 29 days, or 30 in a leap year.
 */

/** Names of the twelve Jalali months, in calendar order (فروردین … اسفند). */
export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/** A Gregorian calendar date. */
export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

/** A Jalali (Persian) calendar date. */
export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/** Days elapsed before the first of each Gregorian month (non-leap year). */
const GREGORIAN_DAYS_BEFORE = [
  0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334,
];

/** Gregorian month lengths; February's 28 becomes 29 in a leap year. */
const GREGORIAN_MONTH_LENGTHS = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];

/** True for Gregorian leap years (the rule the Gregorian calendar uses). */
function isGregorianLeapYear(gy: number): boolean {
  return (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
}

/**
 * Converts a Jalali date to the matching Gregorian date. `jm` is 1..12 and `jd`
 * is 1..31; the classic algorithm needs no bounds check for valid inputs.
 */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): GregorianDate {
  // Years from 979 on share one epoch; earlier years sit in a second epoch.
  const epochOffset = jy > 979 ? 1600 : 621;
  const years = jy > 979 ? jy - 979 : jy;

  // Days from the epoch to the first of the month, then on to `jd`.
  const monthDays = jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186;
  let days =
    365 * years +
    Math.floor(years / 33) * 8 +
    Math.floor(((years % 33) + 3) / 4) +
    78 +
    jd +
    monthDays;
  let gy = epochOffset;

  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    days -= 1;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) {
      days += 1;
    }
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let gd = days + 1;
  let gm = 12;
  for (let month = 1; month <= 12; month += 1) {
    const length =
      month === 2 && isGregorianLeapYear(gy)
        ? 29
        : GREGORIAN_MONTH_LENGTHS[month - 1];
    if (gd <= length) {
      gm = month;
      break;
    }
    gd -= length;
  }
  return { gy, gm, gd };
}

/**
 * Converts a Gregorian date to the matching Jalali date. `gm` is 1..12 and `gd`
 * is 1..31; the classic algorithm needs no bounds check for valid inputs.
 */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): JalaliDate {
  // Years from 1601 on share one epoch; earlier years sit in a second epoch.
  let jy = gy > 1600 ? 979 : 0;
  const years = gy > 1600 ? gy - 1600 : gy - 621;

  // The Gregorian year whose length the day count must follow.
  const gy2 = gm > 2 ? years + 1 : years;
  let days =
    365 * years +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    GREGORIAN_DAYS_BEFORE[gm - 1];

  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/** Julian Day Number of a Gregorian date; used only for the leap-year check. */
function gregorianDayNumber(gy: number, gm: number, gd: number): number {
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  return (
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * True when the Jalali year `jy` is a leap year (اسفند has 30 days). Derived
 * from the conversion itself: the gap between two consecutive Nowruz dates is
 * 366 days in a leap year and 365 otherwise.
 */
export function isJalaliLeapYear(jy: number): boolean {
  const start = jalaliToGregorian(jy, 1, 1);
  const next = jalaliToGregorian(jy + 1, 1, 1);
  const startDay = gregorianDayNumber(start.gy, start.gm, start.gd);
  const nextDay = gregorianDayNumber(next.gy, next.gm, next.gd);
  return nextDay - startDay === 366;
}

/**
 * Number of days in Jalali month `jm` of year `jy`: 31 for months 1-6, 30 for
 * 7-11 and 29 or 30 for month 12 depending on the leap year.
 */
export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) {
    return 31;
  }
  if (jm <= 11) {
    return 30;
  }
  return isJalaliLeapYear(jy) ? 30 : 29;
}
