import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** صفحه‌ی پیش‌فرض */
export const DEFAULT_ORDERS_PAGE = 1;
/** سقف پیش‌فرض اقلام هر صفحه */
export const DEFAULT_ORDERS_LIMIT = 10;
/** بیشینه‌ی اقلام هر صفحه */
export const MAX_ORDERS_LIMIT = 50;

/**
 * مقدار کوئری (رشته یا عدد) به عدد تبدیل می‌شود تا اعتبارسنجی درست کار
 * کند؛ مقدار خالی => undefined (اختیاری) و مقدار غیرعددی => NaN که با
 * 400 رد می‌شود.
 */
function toQueryNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return Number(value);
}

/**
 * کوئری‌ی لیست سفارش‌ها (GET /orders): صفحه و سقف هر صفحه. فیلد خارج از
 * این مجموعه توسط whitelist سراسری حذف می‌شود؛ page >= 1 و 1 <= limit <= 50.
 */
export class ListOrdersDto {
  @IsOptional()
  @Transform(({ value }) => toQueryNumber(value))
  @IsInt({ message: 'صفحه باید عدد صحیح باشد' })
  @Min(1, { message: 'صفحه حداقل 1 است' })
  page: number = DEFAULT_ORDERS_PAGE;

  @IsOptional()
  @Transform(({ value }) => toQueryNumber(value))
  @IsInt({ message: 'تعداد در هر صفحه باید عدد صحیح باشد' })
  @Min(1, { message: 'تعداد در هر صفحه حداقل 1 است' })
  @Max(MAX_ORDERS_LIMIT, {
    message: `تعداد در هر صفحه حداکثر ${MAX_ORDERS_LIMIT} است`,
  })
  limit: number = DEFAULT_ORDERS_LIMIT;
}
