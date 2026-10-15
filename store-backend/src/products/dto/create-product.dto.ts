import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsValidSpecs } from './specs.validator';

/** الگوی اسلاگ محصول (هم‌راستا با قواعد پروژه) */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;
export const PRODUCT_NAME_MAX_LENGTH = 200;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 5000;
export const BRAND_MAX_LENGTH = 100;
export const MAX_PRICE = 1_000_000_000;
export const MAX_STOCK = 1_000_000;
export const MAX_IMAGES = 10;
export const IMAGE_MAX_LENGTH = 500;
export const REGION_MAX_LENGTH = 60;
export const MAX_GENRES = 10;
export const GENRE_MAX_LENGTH = 60;

/**
 * آدرس تصویر: یا URL با http(s) یا مسیر نسبی که با '/' شروع می‌شود؛
 * مسیرهای آپلودشده‌ی خودِ سرور (/api/uploads/<name>) هم صریحاً مجازند.
 * «//host» (protocol-relative) رد می‌شود؛ هیچ تبدیل نوعی هم انجام نمی‌گیرد.
 */
export const IMAGE_PATTERN =
  /^(https?:\/\/[^\s]+|\/(?!\/)[^\s]*|\/api\/uploads\/[a-f0-9]{32}\.(jpg|png|webp))$/;

/** الگوی کد کالا (SKU): فقط حروف/اعداد انگلیسی، نقطه، خط تیره و زیرخط */
export const SKU_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;
export const SKU_MAX_LENGTH = 60;

/**
 * بدنه‌ی ساخت محصول (POST /products — فقط ADMIN).
 * مقادیر عددی باید در JSON واقعاً number باشند؛ @Type عمداً حذف شده تا
 * رشته‌هایی مثل "5" یا "" با 400 رد شوند (هیچ تبدیل سمت سرور انجام نمی‌شود).
 */
export class CreateProductDto {
  @IsString({ message: 'نام محصول باید رشته باشد' })
  @IsNotEmpty({ message: 'نام محصول الزامی است' })
  @MaxLength(PRODUCT_NAME_MAX_LENGTH, {
    message: 'نام محصول حداکثر 200 کاراکتر است',
  })
  name!: string;

  @IsString({ message: 'اسلاگ باید رشته باشد' })
  @IsNotEmpty({ message: 'اسلاگ الزامی است' })
  @MaxLength(SLUG_MAX_LENGTH, { message: 'اسلاگ حداکثر 120 کاراکتر است' })
  @Matches(SLUG_PATTERN, {
    message: 'اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد',
  })
  slug!: string;

  @IsString({ message: 'توضیحات باید رشته باشد' })
  @IsNotEmpty({ message: 'توضیحات الزامی است' })
  @MaxLength(PRODUCT_DESCRIPTION_MAX_LENGTH, {
    message: 'توضیحات حداکثر 5000 کاراکتر است',
  })
  description!: string;

  @IsInt({ message: 'قیمت باید عدد صحیح باشد' })
  @Min(0, { message: 'قیمت نمی‌تواند منفی باشد' })
  @Max(MAX_PRICE, { message: 'قیمت خارج از محدوده‌ی مجاز است' })
  price!: number;

  @IsInt({ message: 'موجودی باید عدد صحیح باشد' })
  @Min(0, { message: 'موجودی نمی‌تواند منفی باشد' })
  @Max(MAX_STOCK, { message: 'موجودی خارج از محدوده‌ی مجاز است' })
  stock!: number;

  @IsOptional()
  @IsArray({ message: 'تصاویر باید آرایه باشند' })
  @ArrayMaxSize(MAX_IMAGES, { message: 'حداکثر 10 تصویر مجاز است' })
  @IsString({ each: true, message: 'هر تصویر باید رشته باشد' })
  @MaxLength(IMAGE_MAX_LENGTH, {
    each: true,
    message: 'آدرس تصویر حداکثر 500 کاراکتر است',
  })
  @Matches(IMAGE_PATTERN, {
    each: true,
    message: 'آدرس تصویر باید URL با http(s) یا مسیری با شروع / باشد',
  })
  images?: string[];

  @IsOptional()
  @IsString({ message: 'برند باید رشته باشد' })
  @MaxLength(BRAND_MAX_LENGTH, { message: 'برند حداکثر 100 کاراکتر است' })
  brand?: string;

  @IsOptional()
  @IsInt({ message: 'تعداد پورت باید عدد صحیح باشد' })
  @Min(0, { message: 'تعداد پورت نمی‌تواند منفی باشد' })
  @Max(100, { message: 'تعداد پورت خارج از محدوده‌ی مجاز است' })
  portsCount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'وزن باید عدد باشد' })
  @Min(0, { message: 'وزن نمی‌تواند منفی باشد' })
  @Max(1_000_000, { message: 'وزن خارج از محدوده‌ی مجاز است' })
  weight?: number;

  @IsInt({ message: 'شناسه‌ی دسته‌بندی باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه‌ی دسته‌بندی نامعتبر است' })
  categoryId!: number;

  @IsOptional()
  @IsString({ message: 'کد کالا باید رشته باشد' })
  @MaxLength(SKU_MAX_LENGTH, { message: 'کد کالا حداکثر 60 کاراکتر است' })
  @Matches(SKU_PATTERN, {
    message:
      'کد کالا فقط می‌تواند شامل حروف و اعداد انگلیسی، نقطه، خط تیره و زیرخط باشد',
  })
  sku?: string;

  @IsOptional()
  @IsInt({ message: 'قیمت قبل از تخفیف باید عدد صحیح باشد' })
  @Min(1, { message: 'قیمت قبل از تخفیف باید حداقل 1 باشد' })
  @Max(MAX_PRICE, { message: 'قیمت قبل از تخفیف خارج از محدوده‌ی مجاز است' })
  compareAtPrice?: number;

  @IsOptional()
  @IsString({ message: 'منطقه باید رشته باشد' })
  @MaxLength(REGION_MAX_LENGTH, { message: 'منطقه حداکثر 60 کاراکتر است' })
  region?: string;

  @IsOptional()
  @IsArray({ message: 'ژانرها باید آرایه باشند' })
  @ArrayMaxSize(MAX_GENRES, { message: 'حداکثر 10 ژانر مجاز است' })
  @IsString({ each: true, message: 'هر ژانر باید رشته باشد' })
  @IsNotEmpty({ each: true, message: 'ژانر نمی‌تواند خالی باشد' })
  @MaxLength(GENRE_MAX_LENGTH, {
    each: true,
    message: 'هر ژانر حداکثر 60 کاراکتر است',
  })
  genres?: string[];

  // specs فقط با اعتبارسنج سفارشی بررسی می‌شود: شیء ساده، حداکثر 30 کلید، مقادیر رشته‌ای کوتاه
  @IsOptional()
  @IsValidSpecs()
  specs?: Record<string, string>;

  @IsOptional()
  @IsBoolean({ message: 'مقدار isActive باید بولی باشد' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'مقدار isFeatured باید بولی باشد' })
  isFeatured?: boolean;
}
