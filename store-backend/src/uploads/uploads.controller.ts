import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * سرو کردن عمومی تصویر — فقط نام‌های تولیدشده توسط خودِ سرور
   * پذیرفته می‌شوند (والد-لیستینگ و دسترسی به هر مسیر دیگر وجود ندارد).
   */
  @Public()
  @Get(':name')
  async serveImage(
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, contentType, size } =
      await this.uploadsService.openImage(name);

    // هدرهای امنیتی: نوع محتوا فقط از نقشه‌ی ثابت پسوندها، جلوگیری از
    // sniff، CSP سخت‌گیرانه و کش همیشگی (نام فایل‌ها تغییرناپذیر است)
    res.set({
      'Content-Type': contentType,
      'Content-Length': size,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return new StreamableFile(stream, { type: contentType, length: size });
  }
}
