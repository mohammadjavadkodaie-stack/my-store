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
import {
  BRAND_MAX_LENGTH,
  GENRE_MAX_LENGTH,
  IMAGE_MAX_LENGTH,
  IMAGE_PATTERN,
  MAX_GENRES,
  MAX_IMAGES,
  MAX_PRICE,
  MAX_STOCK,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  REGION_MAX_LENGTH,
  SKU_MAX_LENGTH,
  SKU_PATTERN,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
} from './create-product.dto';
import { IsValidSpecs } from './specs.validator';

/** بدنه‌ی ویرایش محصول (PATCH /products/:id — فقط ADMIN)؛ همه‌ی فیلدها اختیاری‌اند */
export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'نام محصول باید رشته باشد' })
  @IsNotEmpty({ message: 'نام محصول نباید خالی باشد' })
  @MaxLength(PRODUCT_NAME_MAX_LENGTH, {
    message: 'نام محصول حداکثر 200 کاراکتر است',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'اسلاگ باید رشته باشد' })
  @IsNotEmpty({ message: 'اسلاگ نباید خالی باشد' })
  @MaxLength(SLUG_MAX_LENGTH, { message: 'اسلاگ حداکثر 120 کاراکتر است' })
  @Matches(SLUG_PATTERN, {
    message: 'اسلاگ فقط می‌تواند شامل حروف کوچک انگلیسی، عدد و خط تیره باشد',
  })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'توضیحات باید رشته باشد' })
  @IsNotEmpty({ message: 'توضیحات نباید خالی باشد' })
  @MaxLength(PRODUCT_DESCRIPTION_MAX_LENGTH, {
    message: 'توضیحات حداکثر 5000 کاراکتر است',
  })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'قیمت باید عدد صحیح باشد' })
  @Min(0, { message: 'قیمت نمی‌تواند منفی باشد' })
  @Max(MAX_PRICE, { message: 'قیمت خارج از محدوده‌ی مجاز است' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'موجودی باید عدد صحیح باشد' })
  @Min(0, { message: 'موجودی نمی‌تواند منفی باشد' })
  @Max(MAX_STOCK, { message: 'موجودی خارج از محدوده‌ی مجاز است' })
  stock?: number;

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

  @IsOptional()
  @IsInt({ message: 'شناسه‌ی دسته‌بندی باید عدد صحیح باشد' })
  @Min(1, { message: 'شناسه‌ی دسته‌بندی نامعتبر است' })
  categoryId?: number;

  @IsOptional()
  @IsString({ message: 'کد کالا باید رشته باشد' })
  @MaxLength(SKU_MAX_LENGTH, { message: 'کد کالا حداکثر 60 کاراکتر است' })
  @Matches(SKU_PATTERN, {
    message:
      'کد کالا فقط می‌تواند شامل حروف و اعداد انگلیسی، نقطه، خط تیره و زیرخط باشد',
  })
  sku?: string;

  /** ارسال null قیمت قبل از تخفیف را پاک می‌کند (و تخفیف سمت سرور صفر می‌شود) */
  @IsOptional()
  @IsInt({ message: 'قیمت قبل از تخفیف باید عدد صحیح باشد' })
  @Min(1, { message: 'قیمت قبل از تخفیف باید حداقل 1 باشد' })
  @Max(MAX_PRICE, { message: 'قیمت قبل از تخفیف خارج از محدوده‌ی مجاز است' })
  compareAtPrice?: number | null;

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
