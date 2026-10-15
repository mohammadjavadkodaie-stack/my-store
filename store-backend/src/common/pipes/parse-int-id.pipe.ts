import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  ParseIntPipe,
} from '@nestjs/common';

/** کمینه‌ی شناسه‌ی قابل قبول در پارامتر مسیر */
export const MIN_ROUTE_ID = 1;
/** بیشینه‌ی شناسه‌ی قابل قبول در پارامتر مسیر (سقف Int در PostgreSQL) */
export const MAX_ROUTE_ID = 2_147_483_647;

/**
 * ParseIntPipe محدودشده: فقط عدد صحیح در بازه‌ی 1 تا 2147483647 (بازه‌ی
 * Int در PostgreSQL) می‌پذیرد. مقادیر خارج از بازه (مثل 99999999999) با
 * 400 رد می‌شوند تا هرگز به خطای 500 سرریز عدد در Prisma برسند.
 */
@Injectable()
export class ParseIntIdPipe extends ParseIntPipe {
  async transform(value: string, metadata: ArgumentMetadata): Promise<number> {
    const parsed = await super.transform(value, metadata);
    if (parsed < MIN_ROUTE_ID || parsed > MAX_ROUTE_ID) {
      throw new BadRequestException(
        'شناسه باید عدد صحیح بین 1 تا 2147483647 باشد',
      );
    }
    return parsed;
  }
}
