import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { normalizeCode, normalizePhone } from '../phone.util';

/**
 * بدنه‌ی درخواست ورود (POST /auth/login)
 *
 * فقط قالب شماره و کد بررسی می‌شود؛ پیام‌های ورود نباید اطلاعاتی درباره‌ی
 * وجود کاربر یا درستی کد فاش کنند.
 */
export class LoginDto {
  // نرمال‌سازی شماره پیش از اعتبارسنجی — دقیقاً مثل DTO ثبت‌نام
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
