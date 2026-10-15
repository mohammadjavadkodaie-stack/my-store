/**
 * ابزارهای نرمال‌سازی ورودی‌های احراز هویت مبتنی بر موبایل.
 *
 * فقط تبدیل متن است و هیچ وابستگی خارجی ندارد تا هم در DTOها (با @Transform)
 * و هم در seed قابل استفاده باشد.
 */

/** تبدیل ارقام فارسی/عربی به ارقام ASCII */
function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    // ارقام فارسی ۰..۹ در U+06F0..U+06F9 و ارقام عربی ٠..٩ در U+0660..U+0669
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/**
 * نرمال‌سازی شماره موبایل ایران:
 * 1) تبدیل ارقام فارسی/عربی به ASCII
 * 2) حذف فاصله و خط تیره
 * 3) تبدیل پیشوند +98 / 0098 / 98 به 0
 * اعتبارسنجی قالب (^09\d{9}$) جداگانه در DTO انجام می‌شود.
 */
export function normalizePhone(value: string): string {
  const ascii = toAsciiDigits(value).replace(/[\s-]/g, '');
  return ascii.replace(/^(\+98|0098|98)/, '0');
}

/** تبدیل ارقام فارسی/عربی کد تأیید به ASCII (بدون نرمال‌سازی دیگر) */
export function normalizeCode(value: string): string {
  return toAsciiDigits(value);
}
