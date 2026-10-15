import { IsIn, IsOptional } from 'class-validator';
import { QueryProductsDto } from './query-products.dto';

/**
 * پارامترهای GET /admin/products — همان فیلترهای GET /products (ارث‌بری کامل)
 * به‌علاوه‌ی فیلتر اختیاری isActive.
 * مقدار isActive فقط رشته‌ی 'true' یا 'false' پذیرفته می‌شود؛ هر مقدار دیگر => 400.
 * بدون این پارامتر همه‌ی محصولات (فعال و غیرفعال) برمی‌گردند.
 */
export class AdminQueryProductsDto extends QueryProductsDto {
  @IsOptional()
  @IsIn(['true', 'false'], {
    message: 'مقدار isActive باید true یا false باشد',
  })
  isActive?: 'true' | 'false';
}
