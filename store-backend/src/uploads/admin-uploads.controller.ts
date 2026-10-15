import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { UploadImageExceptionFilter } from './upload-image.exception.filter';
import { UploadedImageFile } from './uploaded-image.interface';
import { UploadsService } from './uploads.service';

@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * آپلود تصویر — فقط ADMIN و فقط یک فایل در یک فیلد با نام «file».
   */
  @Post('images')
  // فقط ADMIN — نقش توسط RolesGuard از دیتابیس چک می‌شود
  @Roles(Role.ADMIN)
  // محدودتر از حد سراسری: حداکثر ۱۰ آپلود در دقیقه به ازای هر IP
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  // پاسخ‌های عمومی برای خطاهای multipart (سقف حجم => 413، بقیه => 400)
  @UseFilters(UploadImageExceptionFilter)
  // پارس multipart فقط همین‌جا و فقط در حافظه؛ سقف: یک فایل ۲ مگابایتی
  // و هیچ فیلد متنی. سیاست «فقط JSON» در main.ts ساختاری است: پارسر json
  // فقط بدنه‌های application/json را می‌خواند و multipart را دست‌نخورده رد
  // می‌کند؛ بنابراین فقط همین مسیر (تنها مصرف‌کننده‌ی مولتی‌پارت) عملاً
  // از آن معاف است و همه‌ی مسیرهای دیگر همچنان فقط JSON می‌مانند.
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async uploadImage(
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<{ url: string }> {
    if (!file) {
      // فیلد «file» اصلاً ارسال نشده است
      throw new BadRequestException('فایلی ارسال نشده است');
    }
    return this.uploadsService.saveImage(file);
  }
}
