import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { PROVINCES } from '../provinces';

/** سقف تعداد آدرس‌های هر کاربر */
export const MAX_ADDRESSES_PER_USER = 3;
/** بیشینه‌ی طول فیلدها — هم‌راستا با VarCharهای مدل Address */
export const ADDRESS_TITLE_MAX_LENGTH = 40;
export const ADDRESS_RECIPIENT_NAME_MAX_LENGTH = 80;
export const ADDRESS_CITY_MAX_LENGTH = 60;
export const ADDRESS_ADDRESS_LINE_MAX_LENGTH = 300;
export const ADDRESS_POSTAL_CODE_LENGTH = 10;
/** کد پستی: دقیقاً ۱۰ رقم ASCII */
export const POSTAL_CODE_PATTERN = /^\d{10}$/;

/**
 * نرمال‌سازی متن الزامی: حذف فاصله‌های ابتدا/انتها.
 * مقادیر غیررشته‌ای دست‌نخورده می‌مانند تا اعتبارسنجی آن‌ها را رد کند
 * (رشته‌ی خالی پس از trim با @Length رد می‌شود).
 */
export function normalizeText(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * نرم‌سازی متن اختیاری: رشته‌ی خالی (یا فقط فاصله) به null تبدیل می‌شود تا
 * پاک‌کردن عنوان ممکن باشد؛ در غیر این صورت trim می‌شود.
 */
export function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * بدنه‌ی ساخت آدرس (POST /addresses).
 * userId/phone/id هرگز در بدنه پذیرفته نمی‌شوند: ValidationPipe سراسری با
 * whitelist + forbidNonWhitelisted هر فیلد خارج از این DTO را با 400 رد می‌کند.
 * isDefault فقط true می‌پذیرد (false معنایی ندارد؛ مقدار پیش‌فرض false است).
 */
export class CreateAddressDto {
  /** عنوان دلخواه (مثل «خانه»)؛ اختیاری و قابل‌حذف */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'عنوان باید رشته باشد' })
  @MaxLength(ADDRESS_TITLE_MAX_LENGTH, {
    message: 'عنوان حداکثر 40 کاراکتر است',
  })
  title?: string | null;

  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'نام گیرنده باید رشته باشد' })
  @Length(1, ADDRESS_RECIPIENT_NAME_MAX_LENGTH, {
    message: 'نام گیرنده باید بین 1 تا 80 کاراکتر باشد',
  })
  recipientName!: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'استان باید رشته باشد' })
  @IsIn(PROVINCES, { message: 'استان انتخاب‌شده معتبر نیست' })
  province!: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'شهر باید رشته باشد' })
  @Length(1, ADDRESS_CITY_MAX_LENGTH, {
    message: 'شهر باید بین 1 تا 60 کاراکتر باشد',
  })
  city!: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'نشانی باید رشته باشد' })
  @Length(1, ADDRESS_ADDRESS_LINE_MAX_LENGTH, {
    message: 'نشانی باید بین 1 تا 300 کاراکتر باشد',
  })
  addressLine!: string;

  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'کد پستی باید رشته باشد' })
  @MaxLength(ADDRESS_POSTAL_CODE_LENGTH, {
    message: 'کد پستی باید 10 رقم باشد',
  })
  @Matches(POSTAL_CODE_PATTERN, { message: 'کد پستی باید 10 رقم باشد' })
  postalCode!: string;

  /** آدرس پیش‌فرض؛ فقط true پذیرفته می‌شود */
  @IsOptional()
  @IsBoolean({ message: 'مقدار isDefault باید بولی باشد' })
  @IsIn([true], { message: 'مقدار isDefault فقط می‌تواند true باشد' })
  isDefault?: true;
}
