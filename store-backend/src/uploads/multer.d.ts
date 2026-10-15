/**
 * تعریف محیطی (ambient) حداقلی برای ماژول «multer» — @types/multer نصب نیست
 * و طبق قواعد پروژه بسته‌ی جدیدی هم نصب نمی‌شود؛ فقط اعضایی که این پروژه
 * استفاده می‌کند تعریف می‌شوند تا FileInterceptor تایپ‌سیف کامپایل شود.
 */
declare module 'multer' {
  /** موتور ذخیره‌سازی multer — جزئیات داخلی برای این پروژه بی‌اهمیت است */
  export interface StorageEngine {
    _handleFile: unknown;
    _removeFile: unknown;
  }

  /** محدودیت‌های پارس multipart — فقط فیلدهای استفاده‌شده در این پروژه */
  export interface Limits {
    fileSize?: number | false;
    files?: number;
    fields?: number;
  }

  /** گزینه‌های multer — این پروژه فقط storage و limits را تنظیم می‌کند */
  export interface Options {
    storage?: StorageEngine;
    limits?: Limits;
  }

  /** موتور ذخیره‌سازی در حافظه — فایل‌ها به‌صورت Buffer نگه داشته می‌شوند */
  export function memoryStorage(): StorageEngine;
}
