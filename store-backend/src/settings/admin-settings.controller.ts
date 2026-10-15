import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateDiscountBandDto } from './dto/update-discount-band.dto';
import { SettingsService } from './settings.service';

/**
 * مسیرهای مدیریتی تنظیمات (admin/settings) — فقط ADMIN.
 * JwtAuthGuard سراسری + RolesGuard؛ بدون @Public تا ورود الزامی بماند.
 */
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * PATCH /admin/settings/discount-band — ویرایش تنظیمات نوار تخفیف.
   * قاعده‌ی تایمر در سرویس روی مقدار نهایی بررسی می‌شود (نقض => 400).
   */
  @Roles(Role.ADMIN)
  @Patch('discount-band')
  @HttpCode(HttpStatus.OK)
  updateDiscountBand(@Body() dto: UpdateDiscountBandDto) {
    return this.settingsService.updateDiscountBand(dto);
  }
}
