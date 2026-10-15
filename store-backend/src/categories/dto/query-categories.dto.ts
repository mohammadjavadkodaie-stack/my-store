import { Platform } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

/** پیش‌فرض و سقف تعداد آیتم در هر صفحه برای همه‌ی لیست‌ها */
export const DEFAULT_LIST_LIMIT = 20;
export const MAX_LIST_LIMIT = 50;

/** پارامترهای لیست دسته‌بندی‌ها (GET /categories[?platform&page&limit]) */
export class QueryCategoriesDto {
  @IsOptional()
  @IsEnum(Platform, { message: 'پلتفرم نامعتبر است' })
  platform?: Platform;

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
