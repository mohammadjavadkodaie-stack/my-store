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
import {
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SORT_ORDER_MAX,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
} from './create-category.dto';

/** بدنه‌ی ویرایش دسته‌بندی (PATCH /categories/:id — فقط ADMIN)؛ همه‌ی فیلدها اختیاری‌اند */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'نام دسته‌بندی باید رشته باشد' })
  @IsNotEmpty({ message: 'نام دسته‌بندی نباید خالی باشد' })
  @MaxLength(CATEGORY_NAME_MAX_LENGTH, {
    message: 'نام دسته‌بندی حداکثر 200 کاراکتر است',
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
  @IsEnum(Platform, { message: 'پلتفرم نامعتبر است' })
  platform?: Platform;

  /** تصویر؛ ارسال null آن را پاک می‌کند */
  @IsOptional()
  @IsString({ message: 'آدرس تصویر باید رشته باشد' })
  @MaxLength(IMAGE_MAX_LENGTH, {
    message: 'آدرس تصویر حداکثر 500 کاراکتر است',
  })
  @Matches(IMAGE_PATTERN, {
    message: 'آدرس تصویر باید URL با http(s) یا مسیری با شروع / باشد',
  })
  image?: string | null;

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
