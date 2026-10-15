import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * پیام پاسخِ حالت خاموش (kill switch).
 *
 * این پیام برای «همه‌ی» درخواست‌های غیرمالک دقیقاً یکسان است: کاربر
 * ناموجود، کاربر عادی، ادمین و درخواست بدون توکن همه همین پاسخ را می‌گیرند؛
 * پس هیچ سرنخی از وجود/نقش کاربر یا شماره‌ی مالک فاش نمی‌شود.
 */
export const SITE_STOPPED_MESSAGE = 'Site stopped';

/**
 * خطای 503 با بدنه‌ی دقیقاً {"message":"Site stopped"}.
 *
 * وقتی پاسخِ یک HttpException یک شیء باشد، فیلتر پیش‌فرض Nest همان شیء را
 * بدون افزودن statusCode/error برمی‌گرداند؛ بنابراین بدنه فقط همین یک فیلد
 * است. هدر Cache-Control: no-store در گارد سراسری ست می‌شود.
 */
export function siteStoppedException(): HttpException {
  return new HttpException(
    { message: SITE_STOPPED_MESSAGE },
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}
