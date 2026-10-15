/**
 * اینترفیس حداقلی فایل آپلودشده — جایگزین Express.Multer.File، چون
 * @types/multer نصب نیست و طبق قواعد پروژه بسته‌ی جدیدی هم نصب نمی‌شود.
 * mimetype و originalname عمداً تعریف نشده‌اند: داده‌ی کنترل‌نشده‌ی
 * کلاینت‌اند و هرگز برای تشخیص نوع یا نام‌گذاری فایل استفاده نمی‌شوند.
 */
export interface UploadedImageFile {
  /** محتوای کامل فایل در حافظه (memoryStorage) */
  buffer: Buffer;
  /** حجم فایل به بایت */
  size: number;
}
