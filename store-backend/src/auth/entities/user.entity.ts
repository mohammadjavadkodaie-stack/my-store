import { Role } from '@prisma/client';

/**
 * شکل امنِ کاربر در پاسخ API.
 *
 * فقط فیلدهای لازم برای کلاینت برگردانده می‌شوند؛ هیچ داده‌ی حساسی
 * (توکن، کد تأیید، هش و ...) در این موجودیت وجود ندارد.
 */
export class UserEntity {
  id!: number;
  phone!: string;
  firstName!: string;
  lastName!: string;
  role!: Role;
  /**
   * آیا این کاربر «مالک» سایت است (صاحب کلید سراسری روشن/خاموش)؟
   * فقط در سرور و با مقایسه‌ی شماره‌ی همین ردیف دیتابیس با OWNER_PHONE
   * محاسبه می‌شود؛ شماره‌ی مالک هرگز در پاسخ API فاش نمی‌شود.
   */
  isOwner!: boolean;
}
