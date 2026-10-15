import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PROVINCES } from '../provinces';
import {
  ADDRESS_ADDRESS_LINE_MAX_LENGTH,
  ADDRESS_CITY_MAX_LENGTH,
  ADDRESS_POSTAL_CODE_LENGTH,
  ADDRESS_RECIPIENT_NAME_MAX_LENGTH,
  ADDRESS_TITLE_MAX_LENGTH,
  normalizeOptionalText,
  normalizeText,
  POSTAL_CODE_PATTERN,
} from './create-address.dto';

/**
 * بدنه‌ی ویرایش آدرس (PATCH /addresses/:id).
 *
 * همه‌ی فیلدها اختیاری‌اند؛ در فیلدهای غیرقابل‌null به‌جای @IsOptional از
 * @ValidateIf استفاده شده تا ارسال null (که ستون DB نمی‌پذیرد) با 400 رد شود،
 * نه اینکه به خطای 500 دیتابیس برسد. isDefault فقط true می‌پذیرد.
 * userId/phone/id هرگز در بدنه پذیرفته نمی‌شوند.
 */
export class UpdateAddressDto {
  /** عنوان؛ رشته‌ی خالی => null (پاک‌کردن مقدار) */
  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString({ message: 'عنوان باید رشته باشد' })
  @MaxLength(ADDRESS_TITLE_MAX_LENGTH, {
    message: 'عنوان حداکثر 40 کاراکتر است',
  })
  title?: string | null;

  @ValidateIf((dto: UpdateAddressDto) => dto.recipientName !== undefined)
  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'نام گیرنده باید رشته باشد' })
  @Length(1, ADDRESS_RECIPIENT_NAME_MAX_LENGTH, {
    message: 'نام گیرنده باید بین 1 تا 80 کاراکتر باشد',
  })
  recipientName?: string;

  @ValidateIf((dto: UpdateAddressDto) => dto.province !== undefined)
  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'استان باید رشته باشد' })
  @IsIn(PROVINCES, { message: 'استان انتخاب‌شده معتبر نیست' })
  province?: string;

  @ValidateIf((dto: UpdateAddressDto) => dto.city !== undefined)
  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'شهر باید رشته باشد' })
  @Length(1, ADDRESS_CITY_MAX_LENGTH, {
    message: 'شهر باید بین 1 تا 60 کاراکتر باشد',
  })
  city?: string;

  @ValidateIf((dto: UpdateAddressDto) => dto.addressLine !== undefined)
  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'نشانی باید رشته باشد' })
  @Length(1, ADDRESS_ADDRESS_LINE_MAX_LENGTH, {
    message: 'نشانی باید بین 1 تا 300 کاراکتر باشد',
  })
  addressLine?: string;

  @ValidateIf((dto: UpdateAddressDto) => dto.postalCode !== undefined)
  @Transform(({ value }) => normalizeText(value))
  @IsString({ message: 'کد پستی باید رشته باشد' })
  @MaxLength(ADDRESS_POSTAL_CODE_LENGTH, {
    message: 'کد پستی باید 10 رقم باشد',
  })
  @Matches(POSTAL_CODE_PATTERN, { message: 'کد پستی باید 10 رقم باشد' })
  postalCode?: string;

  /** تعیین به‌عنوان پیش‌فرض؛ فقط true پذیرفته می‌شود (false => 400) */
  @IsOptional()
  @IsBoolean({ message: 'مقدار isDefault باید بولی باشد' })
  @IsIn([true], { message: 'مقدار isDefault فقط می‌تواند true باشد' })
  isDefault?: true;
}
