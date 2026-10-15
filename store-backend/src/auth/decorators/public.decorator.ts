import { SetMetadata } from '@nestjs/common';

/** کلید متادیتای عمومی‌بودن مسیر */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * علامت‌گذاری مسیر به‌عنوان عمومی — گارد سراسری JwtAuthGuard از آن می‌گذرد.
 * فقط برای مسیرهایی که عمداً بدون احراز هویت در دسترس‌اند (مثل register/login).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
