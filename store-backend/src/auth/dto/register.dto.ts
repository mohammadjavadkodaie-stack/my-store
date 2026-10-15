import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { normalizeCode, normalizePhone } from '../phone.util';

/**
 * بدنه‌ی درخواست ثبت‌نام (POST /auth/register)
 *
 * نکته‌ی امنیتی مهم: این DTO عمداً هیچ فیلدی برای «role» ندارد؛
 * در نتیجه ValidationPipe سراسری (whitelist + forbidNonWhitelisted)
 * هر تلاشی برای ارسال نقش از سمت کلاینت را با خطای 400 رد می‌کند.
 */
export class RegisterDto {
  // نرمال‌سازی نام: حذف فاصله‌های ابتدا/انتها
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام باید رشته باشد' })
  @Length(2, 50, { message: 'نام باید بین ۲ تا ۵۰ کاراکتر باشد' })
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'نام خانوادگی باید رشته باشد' })
  @Length(2, 50, { message: 'نام خانوادگی باید بین ۲ تا ۵۰ کاراکتر باشد' })
  lastName!: string;

  // نرمال‌سازی شماره پیش از اعتبارسنجی (ارقام فارسی/عربی، فاصله، پیشوند بین‌المللی)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString({ message: 'شماره موبایل باید رشته باشد' })
  @IsNotEmpty({ message: 'شماره موبایل الزامی است' })
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست' })
  phone!: string;

  // تبدیل ارقام کد به ASCII پیش از بررسی قالب ۶ رقمی
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeCode(value) : value,
  )
  @IsString({ message: 'کد تأیید باید رشته باشد' })
  @IsNotEmpty({ message: 'کد تأیید الزامی است' })
  @Matches(/^\d{6}$/, { message: 'کد تأیید باید ۶ رقم باشد' })
  code!: string;
}
