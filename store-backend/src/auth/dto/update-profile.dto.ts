import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

/**
 * بدنه‌ی ویرایش پروفایل کاربر جاری (PATCH /auth/profile)
 *
 * نکته‌ی امنیتی مهم: این DTO عمداً هیچ فیلدی برای «phone» یا «role» ندارد؛
 * در نتیجه ValidationPipe سراسری (whitelist + forbidNonWhitelisted)
 * هر تلاشی برای تغییر شماره موبایل، نقش یا هر فیلد ناشناس دیگر را با 400 رد می‌کند.
 * شناسه‌ی کاربر هم فقط از توکن (request.user) خوانده می‌شود، نه از بدنه.
 */
export class UpdateProfileDto {
  // نرمال‌سازی نام: حذف فاصله‌های ابتدا/انتها
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام باید رشته باشد' })
  @Length(2, 50, { message: 'نام باید بین ۲ تا ۵۰ کاراکتر باشد' })
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام خانوادگی باید رشته باشد' })
  @Length(2, 50, { message: 'نام خانوادگی باید بین ۲ تا ۵۰ کاراکتر باشد' })
  lastName!: string;
}
