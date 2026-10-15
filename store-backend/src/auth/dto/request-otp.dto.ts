import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { normalizePhone } from '../phone.util';

/** بدنه‌ی درخواست کد یکبارمصرف (POST /auth/otp/request) */
export class RequestOtpDto {
  // نرمال‌سازی شماره پیش از اعتبارسنجی (ارقام فارسی/عربی، فاصله، پیشوند بین‌المللی)
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizePhone(value) : value,
  )
  @IsString({ message: 'شماره موبایل باید رشته باشد' })
  @IsNotEmpty({ message: 'شماره موبایل الزامی است' })
  @Matches(/^09\d{9}$/, { message: 'شماره موبایل معتبر نیست' })
  phone!: string;
}
