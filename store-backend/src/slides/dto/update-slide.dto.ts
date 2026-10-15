import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  normalizeOptionalText,
  SLIDE_BUTTON_LABEL_MAX_LENGTH,
  SLIDE_IMAGE_MAX_LENGTH,
  SLIDE_IMAGE_PATTERN,
  SLIDE_LINK_PATH_MAX_LENGTH,
  SLIDE_LINK_PATH_PATTERN,
  SLIDE_SUBTITLE_MAX_LENGTH,
  SLIDE_TITLE_MAX_LENGTH,
} from './create-slide.dto';

/**
 * بدنه‌ی ویرایش اسلاید (PATCH /admin/slides/:id — فقط ADMIN).
 * همه‌ی فیلدها اختیاری‌اند؛ متن‌های خالی به null تبدیل می‌شوند و
 * sortOrder هرگز از کلاینت پذیرفته نمی‌شود.
 * قاعده‌ی وابستگی buttonLabel/linkPath روی مقدار نهایی (فعلی + تغییرات)
 * در سرویس بررسی می‌شود.
 */
export class UpdateSlideDto {
  /**
   * تصویر الزامیِ رکورد است؛ در ویرایش اختیاری است اما اگر فرستاده شود
   * باید رشته‌ی معتبر باشد (null پذیرفته نمی‌شود).
   */
  @ValidateIf((dto: UpdateSlideDto) => dto.imageUrl !== undefined)
  @IsString({ message: 'آدرس تصویر باید رشته باشد' })
  @MaxLength(SLIDE_IMAGE_MAX_LENGTH, {
    message: 'آدرس تصویر حداکثر 500 کاراکتر است',
  })
  @Matches(SLIDE_IMAGE_PATTERN, {
    message: 'آدرس تصویر باید URL با http(s) یا مسیری با شروع / باشد',
  })
  imageUrl?: string;

  /** عنوان؛ خالی => null (پاک‌کردن مقدار) */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'عنوان باید رشته باشد' })
  @MaxLength(SLIDE_TITLE_MAX_LENGTH, {
    message: 'عنوان حداکثر 120 کاراکتر است',
  })
  title?: string | null;

  /** زیرعنوان؛ خالی => null (پاک‌کردن مقدار) */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'زیرعنوان باید رشته باشد' })
  @MaxLength(SLIDE_SUBTITLE_MAX_LENGTH, {
    message: 'زیرعنوان حداکثر 300 کاراکتر است',
  })
  subtitle?: string | null;

  /** برچسب دکمه؛ خالی => null؛ همراه linkPath بررسی می‌شود */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'برچسب دکمه باید رشته باشد' })
  @MaxLength(SLIDE_BUTTON_LABEL_MAX_LENGTH, {
    message: 'برچسب دکمه حداکثر 40 کاراکتر است',
  })
  buttonLabel?: string | null;

  /** مسیر داخلی دکمه؛ خالی => null؛ همراه buttonLabel بررسی می‌شود */
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
