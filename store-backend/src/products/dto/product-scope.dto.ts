import { Platform } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * محدوده‌ی مشترک خواندن محصولات (پلتفرم + اسلاگ دسته‌بندی).
 * هم لیست محصولات و هم اندپوینت فیلترها از همین اعتبارسنجی ارث‌بری می‌کنند
 * تا دامنه‌ی مجاز هر دو دقیقاً یکسان بماند.
 */
export class ProductScopeDto {
  @IsOptional()
  @IsEnum(Platform, { message: 'پلتفرم نامعتبر است' })
  platform?: Platform;

  @IsOptional()
  @IsString({ message: 'اسلاگ دسته‌بندی باید رشته باشد' })
  @MaxLength(120, { message: 'اسلاگ دسته‌بندی حداکثر 120 کاراکتر است' })
  categorySlug?: string;
}
