import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { AUTH_COOKIE_NAME, JWT_ALGORITHM } from '../../auth/jwt.constants';
import { normalizePhone } from '../../auth/phone.util';
import { PrismaService } from '../../prisma/prisma.service';
import { isOwnerPhone } from '../owner.util';
import {
  OWNER_AUTH_PATHS,
  SITE_STATUS_PATH,
  SITE_STATUS_READ_METHODS,
} from '../site-status.constants';
import { SiteStatusService } from '../site-status.service';
import { siteStoppedException } from '../site-stopped';

/**
 * گارد سراسری کلید روشن/خاموش سایت — «نخستین» گاردی است که روی هر درخواست
 * اجرا می‌شود (پیش از throttle، احراز هویت و نقش‌ها)؛ بنابراین در حالت خاموش
 * همه‌ی مسیرها یکسان بسته می‌شوند: مسیرهای عادی، مسیرهای ادمین و
 * آپلود/سرو تصاویر.
 *
 * - حالت روشن (پیش‌فرض): هیچ دخالتی نمی‌کند و بقیه‌ی گاردها مثل قبل عمل می‌کنند.
 * - حالت خاموش: تنها مالک اجازه دارد؛ هویت مالک فقط از «شماره‌ی کاربر در
 *   دیتابیس» و مقایسه با OWNER_PHONE می‌آید. نقش ADMIN هیچ امتیازی نمی‌دهد و
 *   هیچ ورودی کلاینتی (شماره/نقش) قابل اعتماد نیست.
 * - توکن‌های غیرمالک حذف نمی‌شوند؛ با روشن‌شدن دوباره، خودکار معتبر می‌شوند.
 */
@Injectable()
export class SiteStatusGuard implements CanActivate {
  constructor(
    private readonly siteStatusService: SiteStatusService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // سایت روشن است => مسیر عادی و بدون هیچ محدودیت اضافه
    if (await this.siteStatusService.isEnabled()) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const path = this.normalizePath(request.path);

    // مسیر عمومی وضعیت سایت در حالت خاموش هم باز می‌ماند (فقط {enabled})؛
    // اما فقط با متد خواندن — نوشتن روی همین مسیر برای غیرمالک 503 می‌شود.
    if (
      path === SITE_STATUS_PATH &&
      SITE_STATUS_READ_METHODS.has(request.method)
    ) {
      return true;
    }

    // نشستِ معتبر مالک => دسترسی کامل (حتی به مسیرهای ادمین و آپلود)
    if (await this.isOwnerSession(request)) {
      return true;
    }

    // ورود/درخواست کد/ثبت‌نام: فقط اگر شماره‌ی بدنه همان شماره‌ی مالک باشد
    if (OWNER_AUTH_PATHS.has(path) && isOwnerPhone(this.readBodyPhone(request))) {
      return true;
    }

    // همه‌ی موارد دیگر: پاسخ یکسان، بدون کش و بدون هیچ جزئیاتی
    http.getResponse<Response>().setHeader('Cache-Control', 'no-store');
    throw siteStoppedException();
  }

  /** نرمال‌سازی مسیر برای مقایسه: بدون اسلش انتهایی و بی‌توجه به بزرگی/کوچکی */
  private normalizePath(path: string | undefined): string {
    const trimmed = (path ?? '').replace(/\/+$/, '').toLowerCase();
    return trimmed.length === 0 ? '/' : trimmed;
  }

  /**
   * شماره‌ی موجود در بدنه‌ی درخواست به‌صورت نرمال‌شده.
   * گارد پیش از ValidationPipe اجرا می‌شود، پس خودمان نرمال‌سازی می‌کنیم و
   * به مقدار خام بدنه اعتماد نمی‌کنیم (صرفاً برای تشخیص «همان مالک» است).
   */
  private readBodyPhone(request: Request): string | null {
    const body = request.body as { phone?: unknown } | undefined;
    if (!body || typeof body.phone !== 'string') {
      return null;
    }

    return normalizePhone(body.phone);
  }

  /**
   * آیا درخواست نشستِ معتبر مالک را همراه دارد؟
   *
   * توکن فقط از کوکی httpOnly خوانده می‌شود، امضا/انقضا با JwtService بررسی
   * می‌شود و سپس شماره‌ی کاربر از «دیتابیس» خوانده و با OWNER_PHONE مقایسه
   * می‌گردد (نقش و payload توکن ملاک نیست). هر خطایی => false (fail-closed)؛
   * توکن و شماره هرگز لاگ نمی‌شوند.
   */
  private async isOwnerSession(request: Request): Promise<boolean> {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(
        token,
        { algorithms: [JWT_ALGORITHM] },
      );

      const userId = payload?.sub;
      if (typeof userId !== 'number' || !Number.isInteger(userId)) {
        return false;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });

      return isOwnerPhone(user?.phone);
    } catch {
      // توکن نامعتبر/منقضی یا خطای دیتابیس => مثل کاربر عادی رفتار می‌شود
      return false;
    }
  }
}
