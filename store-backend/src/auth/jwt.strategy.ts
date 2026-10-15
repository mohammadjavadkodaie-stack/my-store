import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { AUTH_COOKIE_NAME, JWT_ALGORITHM } from './jwt.constants';

/** شکل payload توکن صادرشده توسط این سرویس */
export interface JwtPayload {
  /** شناسه‌ی کاربر */
  sub: number;
  /** نقش در زمان صدور — نقشِ معتبر همیشه از دیتابیس خوانده می‌شود، نه از توکن */
  role: string;
}

/** استخراج توکن «فقط» از کوکی httpOnly؛ هدر Bearer و query عمداً پذیرفته نمی‌شوند */
function extractJwtFromCookie(req: Request): string | null {
  const token = req?.cookies?.[AUTH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      // توکن فقط و فقط از کوکی خوانده می‌شود
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      // انقضای توکن حتماً بررسی می‌شود (توکن منقضی => 401)
      ignoreExpiration: false,
      // الگوریتم قفل می‌شود تا توکن با الگوریتم دیگر (مثل none) پذیرفته نشود
      algorithms: [JWT_ALGORITHM],
      // صحت JWT_SECRET پیش از راه‌اندازی سرور در main.ts بررسی شده است
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * پس از تأیید امضا و انقضا اجرا می‌شود. کاربر در «هر درخواست» از دیتابیس
   * بارگذاری می‌شود تا حذف حساب کاربری بلافاصله دسترسی را قطع کند.
   * خروجی امن است و هرگز هش پسورد را در بر ندارد.
   */
  async validate(payload: JwtPayload): Promise<UserEntity> {
    const user = await this.authService.findUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
