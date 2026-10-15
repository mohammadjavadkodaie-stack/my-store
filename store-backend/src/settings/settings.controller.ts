import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SettingsService } from './settings.service';

/** مسیرهای عمومی تنظیمات سایت (settings) */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings/discount-band — عمومی؛ تنظیمات نوار تخفیف صفحه‌ی اصلی.
   * نبود ردیف => پیش‌فرض‌ها بدون ساخت ردیف.
   */
  @Public()
  @Get('discount-band')
  getDiscountBand() {
    return this.settingsService.getDiscountBand();
  }
}
