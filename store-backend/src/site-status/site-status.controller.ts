import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { SetSiteStatusDto } from './dto/set-site-status.dto';
import { isOwnerPhone } from './owner.util';
import { SITE_STATUS_SEGMENT } from './site-status.constants';
import { SiteStatusService } from './site-status.service';

/** پیام عمومی رد دسترسی — بدون هیچ سرنخی از وجود/شماره‌ی مالک */
const FORBIDDEN_MESSAGE = 'دسترسی لازم را ندارید';

/**
 * مسیرهای کلید سراسری سایت.
 *
 * - GET  /site-status : عمومی و امن؛ در حالت خاموش هم در دسترس است.
 * - POST /site-status : فقط مالک (شماره‌ی OWNER_PHONE)؛ نقش ادمین امتیازی ندارد.
 */
@Controller(SITE_STATUS_SEGMENT)
export class SiteStatusController {
  constructor(private readonly siteStatusService: SiteStatusService) {}

  /**
   * GET /site-status — فقط و فقط {enabled: boolean}.
   * این مسیر در حالت خاموش هم پاسخ می‌دهد تا فرانت‌اند بتواند وضعیت را نشان
   * دهد؛ هیچ اطلاعاتی از مالک یا کاربران فاش نمی‌شود.
   */
  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  async getStatus(): Promise<{ enabled: boolean }> {
    return { enabled: await this.siteStatusService.isEnabled() };
  }

  /**
   * POST /site-status — بدنه: {"enabled": true|false}
   *
   * نکات امنیتی:
   * - نشست معتبر الزامی است (گارد سراسری JWT) و در «هر درخواست» شماره‌ی
   *   کاربرِ دیتابیس با OWNER_PHONE مقایسه می‌شود؛ نه نقش و نه ورودی کلاینت.
   * - Origin ناهمراستا رد می‌شود (CSRF؛ کوکی SameSite=Lax است).
   * - نرخ درخواست محدود است و تغییر وضعیت با رکورد حسابرسی ثبت می‌شود.
   * - توکن و شماره هرگز لاگ نمی‌شوند.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async setStatus(
    @Body() dto: SetSiteStatusDto,
    @CurrentUser() user: UserEntity | undefined,
    @Req() request: Request,
  ): Promise<{ enabled: boolean }> {
    this.assertSameOrigin(request);

    if (!user || !isOwnerPhone(user.phone)) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }

    const enabled = await this.siteStatusService.setEnabled(
      dto.enabled,
      request.ip ?? 'unknown',
    );

    return { enabled };
  }

  /**
   * حفاظت CSRF: کوکی احراز هویت SameSite=Lax است؛ علاوه بر آن، درخواست
   * مرورگری که Origin آن با FRONTEND_ORIGIN یکی نیست رد می‌شود. درخواست‌های
   * بدون Origin (ابزارها/سرور-به-سرور) خطر CSRF مرورگری ندارند.
   */
  private assertSameOrigin(request: Request): void {
    const origin = request.headers.origin;
    if (typeof origin !== 'string' || origin.length === 0) {
      return;
    }

    const allowedOrigin =
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001';
    if (origin !== allowedOrigin) {
      throw new ForbiddenException(FORBIDDEN_MESSAGE);
    }
  }
}
