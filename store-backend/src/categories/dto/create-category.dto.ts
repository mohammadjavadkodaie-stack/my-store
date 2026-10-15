import { Platform } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IMAGE_MAX_LENGTH,
  IMAGE_PATTERN,
} from '../../products/dto/create-product.dto';

/** الگوی اسلاگ مشترک بین دسته‌بندی و محصول (حروف کوچک انگلیسی، عدد، خط تیره) */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;
export const CATEGORY_NAME_MAX_LENGTH = 200;
export const CATEGORY_SORT_ORDER_MAX = 10_000;

/**
 * بدنه‌ی ساخت دسته‌بندی (POST /categories — فقط ADMIN).
 * اسلاگ عمداً الزامی است تا از تولید خودکار اسلاگ ناخواسته جلوگیری شود.
 */
export class CreateCategoryDto {
  @IsString({ message: 'نام دسته‌بندی باید رشته باشد' })
  @IsNotEmpty({ message: 'نام دسته‌بندی الزامی است' })
  @MaxLength(CATEGORY_NAME_MAX_LENGTH, {
    message: 'نام دسته‌بندی حداکثر 200 کاراکتر است',
  })
  name!: string;

  @IsString({ message: 'اسلاگ باید رشته باشد' })
  @IsNotEmpty({ message: 'اسلاگ الزامی است' })
  @MaxLength(SLUG_MAX_LENGTH, { message: 'اسلاگ حداکثر 120 کاراکتر است' })
  @Matches(SLUG_PATTERN, {
    message: 'اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد',
  })
  slug!: string;

  @IsEnum(Platform, { message: 'پلتفرم نامعتبر است' })
  platform!: Platform;

  /** تصویر: URL با http(s) یا مسیر نسبی با شروع '/' (همان قواعد تصویر محصول) */
  @IsOptional()
  @IsString({ message: 'آدرس تصویر باید رشته باشد' })
  @MaxLength(IMAGE_MAX_LENGTH, {
    message: 'آدرس تصویر حداکثر 500 کاراکتر است',
  })
  @Matches(IMAGE_PATTERN, {
    message: 'آدرس تصویر باید URL با http(s) یا مسیری با شروع / باشد',
  })
  image?: string;

  @IsOptional()
  @IsInt({ message: 'ترتیب نمایش باید عدد صحیح باشد' })
  @Min(0, { message: 'ترتیب نمایش نمی‌تواند منفی باشد' })
  @Max(CATEGORY_SORT_ORDER_MAX, {
    message: 'ترتیب نمایش خارج از محدوده‌ی مجاز است',
  })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean({ message: 'مقدار isActive باید بولی باشد' })
  isActive?: boolean;
}
