import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProductScopeDto } from './product-scope.dto';

export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 50;

/** سقف تعداد مقادیر در فیلترهای چندمقداری (برند/ژانر) */
export const MAX_FILTER_VALUES = 20;
export const BRAND_FILTER_MAX_LENGTH = 100;
export const GENRE_FILTER_MAX_LENGTH = 60;
export const REGION_FILTER_MAX_LENGTH = 60;
export const SEARCH_MAX_LENGTH = 100;

/** مقادیر مجاز مرتب‌سازی — به map ثابت در سرویس نگاشت می‌شوند (نه نام خام فیلد) */
export enum ProductSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  BEST_SELLING = 'best_selling',
  DISCOUNT = 'discount',
}

/**
 * تبدیل مقدار خام کوئری (رشته یا آرایه‌ی تکرارشده) به آرایه‌ی رشته‌ای؛
 * مقادیر جداشده با کاما هم پشتیبانی می‌شوند: ?brand=a,b یا ?brand=a&brand=b
 */
function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * پارامترهای لیست/جست‌وجوی محصولات (GET /products).
 * محدوده‌ی پلتفرم/اسلاگ دسته‌بندی از ProductScopeDto ارث‌بری می‌شود.
 */
export class QueryProductsDto extends ProductScopeDto {
  /** برندها — تطابق بدون حساسیت به بزرگی/کوچکی حروف؛ کاماجدا یا تکرارشده */
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray({ message: 'برند باید آرایه یا فهرست کاماجدا باشد' })
  @ArrayMaxSize(MAX_FILTER_VALUES, {
    message: 'حداکثر 20 برند در فیلتر مجاز است',
  })
  @IsString({ each: true, message: 'هر برند باید رشته باشد' })
  @IsNotEmpty({ each: true, message: 'برند نمی‌تواند خالی باشد' })
  @MaxLength(BRAND_FILTER_MAX_LENGTH, {
    each: true,
    message: 'هر برند حداکثر 100 کاراکتر است',
  })
  brand?: string[];

  /** ژانرها — تطابق بدون حساسیت به بزرگی/کوچکی حروف؛ کاماجدا یا تکرارشده */
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray({ message: 'ژانر باید آرایه یا فهرست کاماجدا باشد' })
  @ArrayMaxSize(MAX_FILTER_VALUES, {
    message: 'حداکثر 20 ژانر در فیلتر مجاز است',
  })
  @IsString({ each: true, message: 'هر ژانر باید رشته باشد' })
  @IsNotEmpty({ each: true, message: 'ژانر نمی‌تواند خالی باشد' })
  @MaxLength(GENRE_FILTER_MAX_LENGTH, {
    each: true,
    message: 'هر ژانر حداکثر 60 کاراکتر است',
  })
  genre?: string[];

  /** منطقه‌ی محصول — تطابق دقیق بدون حساسیت به حروف */
  @IsOptional()
  @IsString({ message: 'منطقه باید رشته باشد' })
  @MaxLength(REGION_FILTER_MAX_LENGTH, {
    message: 'منطقه حداکثر 60 کاراکتر است',
  })
  region?: string;

  @IsOptional()
  @IsString({ message: 'عبارت جست‌وجو باید رشته باشد' })
  @MaxLength(SEARCH_MAX_LENGTH, {
    message: 'عبارت جست‌وجو حداکثر 100 کاراکتر است',
  })
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'حداقل قیمت باید عدد صحیح باشد' })
  @Min(0, { message: 'حداقل قیمت نمی‌تواند منفی باشد' })
  @Max(1_000_000_000, { message: 'حداقل قیمت خارج از محدوده‌ی مجاز است' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'حداکثر قیمت باید عدد صحیح باشد' })
  @Min(0, { message: 'حداکثر قیمت نمی‌تواند منفی باشد' })
  @Max(1_000_000_000, { message: 'حداکثر قیمت خارج از محدوده‌ی مجاز است' })
  maxPrice?: number;

  @IsOptional()
  @IsIn(['true', 'false'], { message: 'مقدار inStock باید true یا false باشد' })
  inStock?: 'true' | 'false';

  /** فقط محصولات دارای تخفیف */
  @IsOptional()
  @IsIn(['true'], { message: 'مقدار onSale فقط می‌تواند true باشد' })
  onSale?: 'true';

  /** فقط محصولات ویژه */
  @IsOptional()
  @IsIn(['true'], { message: 'مقدار featured فقط می‌تواند true باشد' })
  featured?: 'true';

  @IsOptional()
  @IsEnum(ProductSort, { message: 'مقدار مرتب‌سازی نامعتبر است' })
  sort?: ProductSort;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'شماره صفحه باید عدد صحیح باشد' })
  @Min(1, { message: 'شماره صفحه حداقل 1 است' })
  @Max(10_000, { message: 'شماره صفحه خارج از محدوده‌ی مجاز است' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'تعداد آیتم در صفحه باید عدد صحیح باشد' })
  @Min(1, { message: 'تعداد آیتم در صفحه حداقل 1 است' })
  @Max(MAX_LIST_LIMIT, { message: 'تعداد آیتم در صفحه حداکثر 50 است' })
  limit?: number;
}
