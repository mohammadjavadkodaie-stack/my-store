import { Module } from '@nestjs/common';
import { SiteStatusController } from './site-status.controller';
import { SiteStatusService } from './site-status.service';

/**
 * ماژول کلید سراسری سایت (روشن/خاموش).
 *
 * PrismaModule سراسری است، پس import اضافه لازم نیست. گارد سراسری در
 * app.module.ts به‌عنوان نخستین APP_GUARD ثبت می‌شود تا پیش از همه‌ی
 * گاردها و روی همه‌ی مسیرها (از جمله ادمین و آپلود) اجرا شود.
 */
@Module({
  controllers: [SiteStatusController],
  providers: [SiteStatusService],
  exports: [SiteStatusService],
})
export class SiteStatusModule {}
