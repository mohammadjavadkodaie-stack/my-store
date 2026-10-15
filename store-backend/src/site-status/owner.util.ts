import { normalizePhone } from '../auth/phone.util';

/**
 * ابزارهای شناسایی «مالک» سایت (صاحب کلید سراسری روشن/خاموش).
 *
 * هویت مالک فقط از دو منبع تعیین می‌شود: شماره‌ی تأییدشده‌ی کاربر در دیتابیس
 * و متغیر محیطی OWNER_PHONE (فقط در .env بک‌اند). نه نقش کاربر و نه هیچ
 * ورودی کلاینتی در این تصمیم دخالت ندارد و مقدار OWNER_PHONE هرگز لاگ
 * یا در پاسخ API برگردانده نمی‌شود.
 */

/** قالب نهایی شماره‌ی موبایل ایران */
const IRAN_MOBILE_PATTERN = /^09\d{9}$/;

/**
 * شماره‌ی مالک به‌صورت نرمال‌شده، یا null اگر تنظیم نشده/نامعتبر باشد.
 * قالب‌های 09...، +989...، 00989...، 989... و ارقام فارسی یکسان‌سازی می‌شوند.
 */
export function getOwnerPhone(): string | null {
  const raw = process.env.OWNER_PHONE?.trim();
  if (!raw) {
    return null;
  }

  const normalized = normalizePhone(raw);
  return IRAN_MOBILE_PATTERN.test(normalized) ? normalized : null;
}

/** آیا OWNER_PHONE اصلاً تنظیم شده است؟ (بدون فاش‌کردن مقدار) */
export function isOwnerPhoneConfigured(): boolean {
  return (process.env.OWNER_PHONE ?? '').trim().length > 0;
}

/**
 * آیا این شماره (مثلاً شماره‌ی ردیف کاربر در دیتابیس) متعلق به مالک است؟
 * هر دو طرف نرمال می‌شوند. نبود/نامعتبر بودن OWNER_PHONE => همیشه false؛
 * یعنی در نبود پیکربندی، هیچ‌کس مالک شناخته نمی‌شود (fail-closed).
 */
export function isOwnerPhone(phone: string | null | undefined): boolean {
  if (typeof phone !== 'string' || phone.length === 0) {
    return false;
  }

  const ownerPhone = getOwnerPhone();
  if (ownerPhone === null) {
    return false;
  }

  return normalizePhone(phone) === ownerPhone;
}
