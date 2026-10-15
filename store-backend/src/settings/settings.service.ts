import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDiscountBandDto } from './dto/update-discount-band.dto';

/** مدل تک‌رکوردی است؛ شناسه همیشه 1 */
export const DISCOUNT_BAND_SETTINGS_ID = 1;

/** فقط فیلدهای وضعیتِ منبع — id و updatedAt هرگز برنمی‌گردند */
export const DISCOUNT_BAND_SELECT = {
  bandEnabled: true,
  timerEnabled: true,
  timerEndsAt: true,
} satisfies Prisma.DiscountBandSettingsSelect;

export type DiscountBandState = Prisma.DiscountBandSettingsGetPayload<{
  select: typeof DISCOUNT_BAND_SELECT;
}>;

/** خروجی مسیرهای عمومی/مدیریتی: وضعیت + ساعت سرور برای محاسبه‌ی شمارش معکوس */
export type DiscountBandView = {
  bandEnabled: boolean;
  timerEnabled: boolean;
  timerEndsAt: string | null;
  serverNow: string;
};

/**
 * پیش‌فرض‌ها وقتی هیچ ردیفی ثبت نشده است. عمداً فقط در حافظه استفاده
 * می‌شوند؛ مسیر GET هرگز ردیف نمی‌سازد.
 */
const DISCOUNT_BAND_DEFAULTS: DiscountBandState = {
  bandEnabled: true,
  timerEnabled: false,
  timerEndsAt: null,
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /settings/discount-band — عمومی.
   * نبود ردیف => همان پیش‌فرض‌ها بدون درج ردیف.
   */
  async getDiscountBand(): Promise<DiscountBandView> {
    const row = await this.prisma.discountBandSettings.findUnique({
      where: { id: DISCOUNT_BAND_SETTINGS_ID },
      select: DISCOUNT_BAND_SELECT,
    });

    return this.toView(row ?? DISCOUNT_BAND_DEFAULTS);
  }

  /**
   * PATCH /admin/settings/discount-band — فقط ADMIN.
   * مقدار نهایی از «وضعیت فعلی + تغییرات» ساخته می‌شود و قاعده‌ی تایمر روی
   * همان مقدار نهایی بررسی می‌شود؛ سپس ردیف id=1 درج/به‌روزرسانی می‌شود.
   */
  async updateDiscountBand(
    dto: UpdateDiscountBandDto,
  ): Promise<DiscountBandView> {
    const current = await this.prisma.discountBandSettings.findUnique({
      where: { id: DISCOUNT_BAND_SETTINGS_ID },
      select: DISCOUNT_BAND_SELECT,
    });
    const base = current ?? DISCOUNT_BAND_DEFAULTS;

    const bandEnabled = dto.bandEnabled ?? base.bandEnabled;
    const timerEnabled = dto.timerEnabled ?? base.timerEnabled;
    const timerEndsAt =
      dto.timerEndsAt === undefined
        ? base.timerEndsAt
        : dto.timerEndsAt === null
          ? null
          : new Date(dto.timerEndsAt);

    this.assertTimer(timerEnabled, timerEndsAt);

    const saved = await this.prisma.discountBandSettings.upsert({
      where: { id: DISCOUNT_BAND_SETTINGS_ID },
      update: { bandEnabled, timerEnabled, timerEndsAt },
      create: {
        id: DISCOUNT_BAND_SETTINGS_ID,
        bandEnabled,
        timerEnabled,
        timerEndsAt,
      },
      select: DISCOUNT_BAND_SELECT,
    });

    return this.toView(saved);
  }

  /**
   * قاعده‌ی وابسته: با روشن بودن تایمر، تاریخ پایان باید وجود داشته و
   * در آینده باشد؛ در غیر این صورت 400.
   */
  private assertTimer(timerEnabled: boolean, timerEndsAt: Date | null): void {
    if (!timerEnabled) {
      return;
    }

    const endsAt = timerEndsAt?.getTime();
    if (endsAt === undefined || Number.isNaN(endsAt) || endsAt <= Date.now()) {
      throw new BadRequestException(
        'در صورت فعال بودن تایمر، تاریخ پایان باید معتبر و در آینده باشد',
      );
    }
  }

  /** ساخت خروجی: تاریخ‌ها به ISO و افزودن ساعت سرور */
  private toView(state: DiscountBandState): DiscountBandView {
    return {
      bandEnabled: state.bandEnabled,
      timerEnabled: state.timerEnabled,
      timerEndsAt: state.timerEndsAt ? state.timerEndsAt.toISOString() : null,
      serverNow: new Date().toISOString(),
    };
  }
}
