import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserEntity } from './entities/user.entity';
import { AUTH_COOKIE_NAME } from './jwt.constants';

@Controller('auth')
// لایه‌ی دوم حفاظت: هر فیلد حساسی که در آینده با @Exclude() علامت بخورد
// توسط این interceptor از خروجی JSON حذف می‌شود.
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  // سخت‌گیرانه‌تر از حد سراسری: حداکثر 5 درخواست کد در دقیقه به ازای هر IP
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  requestOtp(@Body() dto: RequestOtpDto): Promise<{ registered: boolean }> {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  // سخت‌گیرانه‌تر از حد سراسری: حداکثر 5 ثبت‌نام در دقیقه به ازای هر IP
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEntity> {
    const { user, token, cookieMaxAgeMs } =
      await this.authService.register(registerDto);

    // ثبت‌نام موفق = ورود خودکار؛ توکن فقط در کوکی httpOnly ست می‌شود
    res.cookie(AUTH_COOKIE_NAME, token, this.authCookieOptions(cookieMaxAgeMs));

    // فقط شیء امن کاربر برگردانده می‌شود (بدون پسورد/توکن)
    return user;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // سخت‌گیرانه‌تر از حد سراسری: حداکثر 5 تلاش ورود در دقیقه به ازای هر IP
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserEntity> {
    const { user, token, cookieMaxAgeMs } =
      await this.authService.login(loginDto);

    // توکن فقط در کوکی httpOnly ست می‌شود و هرگز در بدنه‌ی پاسخ برنمی‌گردد
    res.cookie(AUTH_COOKIE_NAME, token, this.authCookieOptions(cookieMaxAgeMs));

    return user;
  }

  @Get('me')
  me(@CurrentUser() user: UserEntity): UserEntity {
    // کاربرِ به‌روزِ دیتابیس توسط JwtStrategy در همین درخواست بارگذاری شده است
    return user;
  }

  /**
   * PATCH /auth/profile — ویرایش نام و نام خانوادگی کاربر جاری.
   *
   * این مسیر @Public نیست؛ پس فقط کاربر وارد‌شده (کوکی httpOnly) به آن دسترسی
   * دارد. شناسه‌ی کاربر صرفاً از توکن (@CurrentUser) گرفته می‌شود و بدنه فقط
   * شامل firstName/lastName است؛ هر فیلد دیگری 400 می‌گیرد.
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.authService.updateProfile(user.id, dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    // پاک‌کردن کوکی با همان گزینه‌های ست‌کردن (بدون maxAge)
    res.clearCookie(AUTH_COOKIE_NAME, this.authCookieOptions());
    return { message: 'با موفقیت خارج شدید' };
  }

  /** گزینه‌های کوکی احراز هویت — یکسان برای login و logout */
  private authCookieOptions(maxAgeMs?: number): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      // در production کوکی فقط روی HTTPS ارسال می‌شود
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      ...(maxAgeMs === undefined ? {} : { maxAge: maxAgeMs }),
    };
  }
}
