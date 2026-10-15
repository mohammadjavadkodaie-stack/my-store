import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { UploadedImageFile } from './uploaded-image.interface';

/** دایرکتوری ذخیره‌ی تصاویر — فقط از process.cwd() و نام تولیدشده ساخته می‌شود */
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/** پیشوند URL عمومی تصاویر (فرانت‌اند با بازنویسی /api/* به همین مسیر می‌رسد) */
const UPLOADS_URL_PREFIX = '/api/uploads/';

/** امضای بایت‌های JPEG */
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/** امضای بایت‌های PNG */
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** نوع تصویرِ تشخیص‌داده‌شده از بایت‌های محتوا */
type ImageType = 'jpg' | 'png' | 'webp';

/** پسوند فایل برای هر نوع تشخیصی */
const EXTENSIONS: Record<ImageType, string> = {
  jpg: '.jpg',
  png: '.png',
  webp: '.webp',
};

/** Content-Type برای هر پسوند — نقشه‌ی ثابت، بدون حدس از ورودی کلاینت */
const CONTENT_TYPES: Record<ImageType, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** نام فایل‌های ذخیره‌شده: دقیقاً ۳۲ کاراکتر hex + یکی از پسوندهای مجاز */
const UPLOAD_NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

/**
 * تشخیص نوع واقعی تصویر فقط از روی بایت‌های محتوا (magic bytes) —
 * نه mimetype اعلام‌شده توسط کلاینت و نه پسوندِ نام فایل.
 */
function detectImageType(buffer: Buffer): ImageType | null {
  if (
    buffer.length >= JPEG_SIGNATURE.length &&
    JPEG_SIGNATURE.equals(buffer.subarray(0, JPEG_SIGNATURE.length))
  ) {
    return 'jpg';
  }
  if (
    buffer.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.equals(buffer.subarray(0, PNG_SIGNATURE.length))
  ) {
    return 'png';
  }
  // WebP: «RIFF» در بایت‌های 0 تا 3 و «WEBP» در بایت‌های 8 تا 11
  if (
    buffer.length >= 12 &&
    buffer.toString('latin1', 0, 4) === 'RIFF' &&
    buffer.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

@Injectable()
export class UploadsService {
  /**
   * ذخیره‌ی تصویر آپلودشده — هیچ اعتمادی به mimetype یا نام اصلی فایل
   * کلاینت نمی‌شود؛ نوع فقط از بایت‌های واقعی محتوا تشخیص داده می‌شود.
   * پیام خطا عمومی است و محتوا/نام اصلی هرگز لاگ نمی‌شود.
   */
  async saveImage(file: UploadedImageFile): Promise<{ url: string }> {
    // شامل SVG، GIF، فایل خالی و هر محتوای غیرتصویری
    const type = detectImageType(file.buffer);
    if (!type) {
      throw new BadRequestException('فایل تصویری نامعتبر است');
    }

    // نام ذخیره: ۱۶ بایت تصادفی (۳۲ کاراکتر hex) + پسوندِ نوع تشخیصی؛
    // هیچ کاراکتری از ورودی کلاینت (نام اصلی/پسوند) به نام فایل نمی‌رسد
    const name = crypto.randomBytes(16).toString('hex') + EXTENSIONS[type];

    // دایرکتوری در صورت نبود ساخته می‌شود
    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });

    // پرچم wx: در صورت وجود فایل همنامی چیزی بازنویسی نمی‌شود
    // (احتمال برخورد ۱۲۸ بیتی عملاً صفر است)
    await fs.promises.writeFile(path.join(UPLOADS_DIR, name), file.buffer, {
      flag: 'wx',
    });

    return { url: UPLOADS_URL_PREFIX + name };
  }

  /**
   * بازکردن تصویر برای پاس‌دادن به کلاینت — نام پیش از هر دسترسی به
   * سیستم فایل اعتبارسنجی می‌شود و فقط همین دایرکتوری خوانده می‌شود؛
   * هیچ دسترسی به فایل یا دایرکتوری دیگری وجود ندارد.
   */
  async openImage(
    name: string,
  ): Promise<{ stream: Readable; contentType: string; size: number }> {
    const match = UPLOAD_NAME_PATTERN.exec(name);
    // نام نامعتبر => 404، پیش از هر تماس با سیستم فایل
    if (!match) {
      throw new NotFoundException('تصویر پیدا نشد');
    }

    const filePath = path.join(UPLOADS_DIR, name);
    const stats = await fs.promises.stat(filePath).catch(() => null);
    // فایل موجود نیست (یا فایل معمولی نیست) => همان 404 عمومی
    if (!stats || !stats.isFile()) {
      throw new NotFoundException('تصویر پیدا نشد');
    }

    // استریم فقط از همین مسیر؛ در خطای ناگهانی استریم فقط destroy
    // می‌شود تا فرآیند کرش نکند (فایل‌ها تغییرناپذیرند؛ این رخداد عملاً صفر است)
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => stream.destroy());

    return {
      stream,
      contentType: CONTENT_TYPES[match[1] as ImageType],
      size: stats.size,
    };
  }
}
