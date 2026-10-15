import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** مدل تک‌رکوردی است؛ شناسه همیشه 1 */
export const SITE_STATUS_ID = 1;

/** عمر کش حافظه‌ای وضعیت سایت (میلی‌ثانیه) */
export const SITE_STATUS_CACHE_TTL_MS = 5_000;

/** پیش‌فرض نخستین بالا آمدن: سایت روشن */
export const SITE_STATUS_DEFAULT_ENABLED = true;

/**
 * وضعیت سراسری سایت (کلید روشن/خاموش).
 *
 * منبع حقیقت «یک ردیف در دیتابیس» است (نه فایل و نه فرانت‌اند) و برای هر
 * درخواست به دیتابیس مراجعه نمی‌شود: مقدار با TTL کوتاه ۵ ثانیه در حافظه
 * کش می‌شود. در صورت خطای خواندن دیتابیس، «آخرین وضعیت شناخته‌شده» حفظ
 * می‌شود و پروسه کرش نمی‌کند؛ تا پیش از نخستین خواندن موفق هم وضعیت «بسته»
 * فرض می‌شود (fail-closed، هرگز ناخواسته باز نمی‌شود).
 */
@Injectable()
export class SiteStatusService implements OnModuleInit {
  private lastKnownEnabled = SITE_STATUS_DEFAULT_ENABLED;
  private hasKnownState = false;
  private cachedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * در نخستین بالا آمدن، ردیف تک‌مقداری با پیش‌فرض «روشن» ساخته می‌شود
   * (اگر نبود) و کش گرم می‌شود. خطای دیتابیس مانع بالا آمدن سرور نمی‌شود.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.prisma.siteStatus.createMany({
        data: [{ id: SITE_STATUS_ID, enabled: SITE_STATUS_DEFAULT_ENABLED }],
        skipDuplicates: true,
      });
      await this.readFromDb();
    } catch {
      // هیچ جزئیات داخلی چاپ نمی‌شود؛ وضعیت تا خواندن موفق بعدی «ناشناخته» است
      console.warn(
        'Site status: initial state is unavailable until the database responds',
      );
    }
  }

  /** وضعیت فعلی سایت — از کش ۵ ثانیه‌ای یا دیتابیس */
  async isEnabled(): Promise<boolean> {
    if (Date.now() - this.cachedAt < SITE_STATUS_CACHE_TTL_MS) {
      return this.hasKnownState ? this.lastKnownEnabled : false;
    }

    try {
      return await this.readFromDb();
    } catch {
      // خطای دیتابیس: آخرین وضعیت شناخته‌شده حفظ می‌شود و تلاش بعدی
      // حداکثر ۵ ثانیه بعد انجام می‌گیرد (کرش/بازشدن ناخواسته رخ نمی‌دهد)
      this.cachedAt = Date.now();
      return this.hasKnownState ? this.lastKnownEnabled : false;
    }
  }

  /**
   * تغییر وضعیت سایت + ثبت رکورد حسابرسی (زمان، IP، وضعیت جدید) در یک تراکنش.
   * فقط پس از احراز هویت مالک در کنترلر فراخوانی می‌شود.
   */
  async setEnabled(enabled: boolean, ip: string): Promise<boolean> {
    const saved = await this.prisma.$transaction(async (tx) => {
      const row = await tx.siteStatus.upsert({
        where: { id: SITE_STATUS_ID },
        update: { enabled },
        create: { id: SITE_STATUS_ID, enabled },
        select: { enabled: true },
      });

      await tx.siteStatusAudit.create({
        data: { enabled: row.enabled, ip: ip.slice(0, 64) },
      });

      return row;
    });

    this.lastKnownEnabled = saved.enabled;
    this.hasKnownState = true;
    this.cachedAt = Date.now();

    return saved.enabled;
  }

  /** خواندن از دیتابیس و به‌روزرسانی کش؛ نبود ردیف = پیش‌فرض روشن */
  private async readFromDb(): Promise<boolean> {
    const row = await this.prisma.siteStatus.findUnique({
      where: { id: SITE_STATUS_ID },
      select: { enabled: true },
    });

    this.lastKnownEnabled = row?.enabled ?? SITE_STATUS_DEFAULT_ENABLED;
    this.hasKnownState = true;
    this.cachedAt = Date.now();

    return this.lastKnownEnabled;
  }
}
