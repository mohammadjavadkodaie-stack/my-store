import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

/** الگوی اسلاگ پروژه (هم‌راستا با create/update DTOهای محصول و دسته‌بندی) */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;

/**
 * اعتبارسنجی پارامتر :slug در مسیرهای عمومی.
 * هر ورودی نامعتبر (غیررشته، بلندتر از 120 کاراکتر، یا خارج از الگوی اسلاگ)
 * با 404 و پیام عمومی «یافت نشد» رد می‌شود تا هیچ جزئیات داخلی افشا نشود.
 */
@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: unknown): string {
    if (
      typeof value !== 'string' ||
      value.length === 0 ||
      value.length > SLUG_MAX_LENGTH ||
      !SLUG_PATTERN.test(value)
    ) {
      throw new NotFoundException('یافت نشد');
    }
    return value;
  }
}
