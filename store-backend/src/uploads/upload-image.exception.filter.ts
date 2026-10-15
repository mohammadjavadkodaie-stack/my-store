import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * فیلتر خطای مخصوص مسیر آپلود تصویر — تضمین پاسخ عمومی (بدون افشای
 * جزئیات multer یا سیستم فایل):
 * - عبور از سقف حجم (LIMIT_FILE_SIZE) => 413
 * - سایر محدودیت‌های multipart => 400
 * - خطاهای شناخته‌شده‌ی Nest => همان وضعیت با پاسخِ عمومی خودشان
 * - هر خطای دیگر => 500 عمومی؛ محتوای فایل و نام اصلی هرگز لاگ نمی‌شوند
 */
@Catch()
export class UploadImageExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UploadImageExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    // خطاهای multer پرچم code دارند (LIMIT_*)؛ از پیام و جزئیاتشان
    // استفاده‌ای نمی‌شود تا چیزی به بیرون نشت نکند
    const code = (exception as { code?: unknown })?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'حجم فایل بیش از حد مجاز است',
      });
      return;
    }
    if (typeof code === 'string' && code.startsWith('LIMIT_')) {
      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'درخواست آپلود نامعتبر است',
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    // خطای ناشناخته (مثل برخورد نام تصادفی) — پیام ثابت، بدون جزئیات
    this.logger.error('Image upload failed with an unexpected error');
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'خطای داخلی سرور',
    });
  }
}
