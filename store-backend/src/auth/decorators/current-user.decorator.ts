import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

/**
 * دسترسی به کاربر احراز‌شده‌ی درخواست (request.user).
 * این مقدار توسط JwtStrategy و از روی رکورد دیتابیس پر می‌شود.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserEntity => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserEntity;
  },
);
