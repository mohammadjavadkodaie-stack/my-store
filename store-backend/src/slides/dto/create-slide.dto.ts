import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** سقف تعداد اسلایدهای هیرو (همه‌ی رکوردها: فعال و غیرفعال) */
export const MAX_SLIDES = 10;
export const SLIDE_IMAGE_MAX_LENGTH = 500;
export const SLIDE_TITLE_MAX_LENGTH = 120;
export const SLIDE_SUBTITLE_MAX_LENGTH = 300;
export const SLIDE_BUTTON_LABEL_MAX_LENGTH = 40;
export const SLIDE_LINK_PATH_MAX_LENGTH = 300;

/**
 * آدرس تصویر اسلاید: یا URL با http(s) یا مسیر نسبی با شروع '/'.
 * «//host» (protocol-relative)، javascript: و data: هرگز پذیرفته نمی‌شوند
 * و فاصله/بک‌اسلش هم در هیچ بخشی مجاز نیست.
 */
export const SLIDE_IMAGE_PATTERN = /^(https?:\/\/\S+|\/(?!\/)[^\s\\]*)$/;

/**
 * مسیر دکمه: فقط مسیر داخلی سایت (با شروع '/').
 * آدرس خارجی (http/https) یا «//host» پذیرفته نمی‌شود.
 */
export const SLIDE_LINK_PATH_PATTERN = /^\/(?!\/)[^\s\\]*$/;

/**
 * نرمال‌سازی متن‌های اختیاری: حذف فاصله‌های ابتدا/انتها و تبدیل رشته‌ی
 * خالی (یا فقط فاصله) به null تا پاک‌کردن مقدار با "" هم ممکن باشد.
 * مقادیر غیررشته‌ای دست‌نخورده می‌مانند تا اعتبارسنجی آن‌ها را رد کند.
 */
export function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * بدنه‌ی ساخت اسلاید (POST /admin/slides — فقط ADMIN).
 * sortOrder عمداً در DTO نیست: از کلاینت پذیرفته نمی‌شود و سمت سرور
 * برابر (بیشترین sortOrder + 1) یا صفر تعیین می‌شود.
 */
export class CreateSlideDto {
  @IsString({ message: 'آدرس تصویر باید رشته باشد' })
  @IsNotEmpty({ message: 'آدرس تصویر الزامی است' })
  @MaxLength(SLIDE_IMAGE_MAX_LENGTH, {
    message: 'آدرس تصویر حداکثر 500 کاراکتر است',
  })
  @Matches(SLIDE_IMAGE_PATTERN, {
    message: 'آدرس تصویر باید URL با http(s) یا مسیری با شروع / باشد',
  })
  imageUrl!: string;

  /** عنوان؛ خالی => null */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'عنوان باید رشته باشد' })
  @MaxLength(SLIDE_TITLE_MAX_LENGTH, {
    message: 'عنوان حداکثر 120 کاراکتر است',
  })
  title?: string | null;

  /** زیرعنوان؛ خالی => null */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'زیرعنوان باید رشته باشد' })
  @MaxLength(SLIDE_SUBTITLE_MAX_LENGTH, {
    message: 'زیرعنوان حداکثر 300 کاراکتر است',
  })
  subtitle?: string | null;

  /** برچسب دکمه؛ خالی => null؛ باید همراه linkPath باشد */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'برچسب دکمه باید رشته باشد' })
  @MaxLength(SLIDE_BUTTON_LABEL_MAX_LENGTH, {
    message: 'برچسب دکمه حداکثر 40 کاراکتر است',
  })
  buttonLabel?: string | null;

  /** مسیر داخلی دکمه؛ خالی => null؛ باید همراه buttonLabel باشد */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'مسیر دکمه باید رشته باشد' })
  @MaxLength(SLIDE_LINK_PATH_MAX_LENGTH, {
    message: 'مسیر دکمه حداکثر 300 کاراکتر است',
  })
  @Matches(SLIDE_LINK_PATH_PATTERN, {
    message: 'مسیر دکمه باید مسیری داخلی با شروع / باشد',
  })
  linkPath?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'مقدار isActive باید بولی باشد' })
  isActive?: boolean;
}
