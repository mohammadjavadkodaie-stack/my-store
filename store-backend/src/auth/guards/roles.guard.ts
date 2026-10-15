import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserEntity } from '../entities/user.entity';

/**
 * گارد نقش‌ها — همیشه در کنار JwtAuthGuard استفاده می‌شود.
 * اگر مسیر با @Roles(...) محدود شده باشد، نقشِ کاربرِ بارگذاری‌شده از دیتابیس
 * باید در لیست مجاز باشد؛ در غیر این صورت 403 برمی‌گردد.
 * (نقش از توکن گرفته نمی‌شود تا تغییر نقش فوراً اعمال شود.)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // مسیر بدون @Roles هیچ محدودیتی از این گارد نمی‌گیرد
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserEntity | undefined;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('دسترسی لازم را ندارید');
    }
    return true;
  }
}
