import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

/**
 * بدنه‌ی ویرایش تنظیمات نوار تخفیف (PATCH /admin/settings/discount-band — فقط ADMIN).
 * همه‌ی فیلدها اختیاری‌اند؛ قاعده‌ی «با روشن بودن تایمر، تاریخ پایان باید
 * وجود داشته و در آینده باشد» روی مقدار نهایی (فعلی + تغییرات) در سرویس بررسی می‌شود.
 */
export class UpdateDiscountBandDto {
  /** نمایش یا پنهان‌کردن نوار تخفیف در صفحه‌ی اصلی */
  @IsOptional()
  @IsBoolean({ message: 'مقدار bandEnabled باید بولی باشد' })
  bandEnabled?: boolean;

  /** فعال یا غیرفعال‌کردن شمارش معکوس نوار تخفیف */
  @IsOptional()
  @IsBoolean({ message: 'مقدار timerEnabled باید بولی باشد' })
  timerEnabled?: boolean;

  /**
   * پایان شمارش معکوس به‌صورت رشته‌ی ISO 8601 یا null.
   * null مقدار را پاک می‌کند؛ IsOptional روی null هم عبور می‌کند و
   * مقادیر غیررشته‌ای (عدد/بولی) توسط IsISO8601 رد می‌شوند.
   */
  @IsOptional()
  @IsISO8601({}, { message: 'مقدار timerEndsAt باید تاریخ ISO 8601 یا null باشد' })
  timerEndsAt?: string | null;
}
