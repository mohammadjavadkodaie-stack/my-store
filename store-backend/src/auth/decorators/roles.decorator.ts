import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/** کلید متادیتای نقش‌های مجاز مسیر */
export const ROLES_KEY = 'roles';

/**
 * محدودکردن مسیر به نقش‌های مشخص.
 * باید همراه JwtAuthGuard و RolesGuard استفاده شود.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
