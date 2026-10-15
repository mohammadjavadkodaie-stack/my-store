import { IsBoolean } from 'class-validator';

/**
 * بدنه‌ی تغییر وضعیت سایت (POST /site-status — فقط مالک).
 *
 * فیلد enabled اجباری و باید دقیقاً بولی JSON باشد؛ نبود فیلد یا هر نوع
 * دیگری (مثلاً رشته‌ی "true") با 400 رد می‌شود. ValidationPipe سراسری
 * (whitelist + forbidNonWhitelisted) هر فیلد اضافه را هم 400 می‌کند.
 */
export class SetSiteStatusDto {
  @IsBoolean({ message: 'مقدار enabled باید بولی باشد' })
  enabled!: boolean;
}
