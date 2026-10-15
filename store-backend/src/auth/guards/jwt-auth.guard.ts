import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * گارد احراز هویت JWT — از استراتژی JwtStrategy استفاده می‌کند.
 * توکن فقط از کوکی خوانده می‌شود؛ نبود/نامعتبر بودن/انقضای توکن => 401.
 * مسیرهای علامت‌خورده با @Public() از احراز هویت عبور می‌کنند (secure-by-default).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  // مسیر عمومی => بدون احراز هویت عبور می‌کنیم؛ در غیر این صورت استراتژی jwt
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
