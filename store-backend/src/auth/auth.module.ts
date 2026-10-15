import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtExpiresIn, JWT_ALGORITHM } from './jwt.constants';
import { JwtStrategy } from './jwt.strategy';
import { SiteStatusModule } from '../site-status/site-status.module';

// PrismaModule با @Global() تعریف شده؛
// پس AuthService بدون import اضافه به PrismaService دسترسی دارد.
@Module({
  imports: [
    PassportModule,
    // AuthService در حالت خاموش (kill switch) فقط به شماره‌ی مالک اجازه‌ی
    // ورود/درخواست کد می‌دهد؛ بنابراین به SiteStatusService نیاز دارد.
    // (SiteStatusModule به AuthModule وابسته نیست؛ پس چرخه‌ای ایجاد نمی‌شود)
    SiteStatusModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        // صحت JWT_SECRET پیش از راه‌اندازی سرور در main.ts بررسی شده است
        secret: process.env.JWT_SECRET,
        signOptions: {
          // اعتبار توکن از JWT_EXPIRES_IN (پیش‌فرض 2h)؛ فرمت مقدار در main.ts
          // با durationToMs اعتبارسنجی شده است، پس cast اینجا امن است
          expiresIn: getJwtExpiresIn() as SignOptions['expiresIn'],
          // الگوریتم در امضا قفل می‌شود؛ در راستی‌آزمایی هم JwtStrategy
          // همین الگوریتم را اجازه می‌دهد
          algorithm: JWT_ALGORITHM,
        },
        verifyOptions: {
          algorithms: [JWT_ALGORITHM],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // JwtModule صادر می‌شود تا گارد سراسری کلید سایت بتواند با «همان» تنظیمات
  // (secret/الگوریتم قفل‌شده) توکن مالک را در حالت خاموش راستی‌آزمایی کند.
  exports: [JwtModule],
})
export class AuthModule {}
