import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  durationToMs,
  getJwtExpiresIn,
  JWT_SECRET_MIN_LENGTH,
} from './auth/jwt.constants';
import { getOwnerPhone, isOwnerPhoneConfigured } from './site-status/owner.util';

async function bootstrap() {
  // اعتبارسنجی متغیرهای محیطی JWT پیش از بالا آمدن سرویس:
  // JWT_SECRET الزامی است و باید حداقل 32 کاراکتر باشد؛ در غیر این صورت
  // سرور اجرا نمی‌شود. خودِ مقدار secret هرگز لاگ یا چاپ نمی‌شود.
  if ((process.env.JWT_SECRET ?? '').length < JWT_SECRET_MIN_LENGTH) {
    console.error(
      'JWT_SECRET is missing or shorter than 32 characters; refusing to start',
    );
    process.exit(1);
  }

  // فرمت JWT_EXPIRES_IN هم همین‌جا زودهنگام بررسی می‌شود تا مقدار نامعتبر
  // به‌جای خطای مبهم هنگام ورود، همان ابتدا با شکست واضح مشخص شود
  try {
    durationToMs(getJwtExpiresIn());
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'Invalid JWT_EXPIRES_IN',
    );
    process.exit(1);
  }

  // سوئیچ توسعه‌ی OTP: اگر در production روشن باشد هرگز بالا نمی‌آییم.
  // هیچ مقدار حساسی (secret/شماره) چاپ نمی‌شود.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.OTP_DEV_BYPASS === 'true'
  ) {
    console.error(
      'OTP_DEV_BYPASS must not be enabled in production; refusing to start',
    );
    process.exit(1);
  }

  // شماره‌ی مالک (صاحب کلید سراسری سایت) فقط از .env خوانده می‌شود و مقدار آن
  // هرگز چاپ نمی‌شود. اگر مقدار تنظیم‌شده نامعتبر باشد سرور بالا نمی‌آید تا
  // مالک ناخواسته از دسترسی به کلید روشن/خاموش محروم نشود؛ نبودِ مقدار فقط
  // یک هشدار است (سایت با پیش‌فرض «روشن» بالا می‌آید).
  if (isOwnerPhoneConfigured() && getOwnerPhone() === null) {
    console.error(
      'OWNER_PHONE is invalid; expected an Iranian mobile number such as 09xxxxxxxxx',
    );
    process.exit(1);
  }
  if (!isOwnerPhoneConfigured()) {
    console.warn(
      'WARNING: OWNER_PHONE is not set — nobody can toggle the site kill switch',
    );
  }

  // در محیط غیر production اگر bypass روشن باشد، یک هشدار واضح چاپ می‌شود
  if (process.env.OTP_DEV_BYPASS === 'true') {
    console.warn(
      'WARNING: OTP_DEV_BYPASS is enabled — any 6-digit code is accepted (dev only)',
    );
  }

  // body parser پیش‌فرض خاموش می‌شود تا سقف حجم بدنه اینجا صریح تعیین شود
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // در production سرور پشت پروکسی معکوس (مثل Nginx) قرار می‌گیرد؛ trust proxy
  // فعال می‌شود تا IP و پروتکل واقعی کلاینت به Express برسد
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // هدرهای امنیتی سراسری (CSP، HSTS، nosniff، حذف X-Powered-By و ...)
  app.use(helmet());

  // خواندن کوکی درخواست‌ها — پیش‌نیاز احراز هویت مبتنی بر کوکی httpOnly
  app.use(cookieParser());

  // API فقط JSON است (پارسر urlencoded حذف شد)؛
  // سقف حجم بدنه: حداکثر 100 کیلوبایت (بیشتر از آن => 413)
  app.use(json({ limit: '100kb' }));

  // CORS فقط برای Origin فرانت‌اند (لیست سفید)؛ درخواست‌های سایر Originها
  // هدر Access-Control-Allow-Origin دریافت نمی‌کنند
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001';
  app.enableCors({
    // آرایه = تطابق دقیق Origin؛ رشته‌ی تنها توسط بسته‌ی cors بی‌قید بازتاب می‌شد
    origin: [frontendOrigin],
    credentials: true,
  });

  // اعتبارسنجی سراسری DTOها:
  // whitelist: فیلدهای خارج از DTO از بدنه‌ی درخواست حذف می‌شوند
  // forbidNonWhitelisted: درخواستِ دارای فیلد غیرمجاز با 400 رد می‌شود
  // transform: خروجی به نمونه‌ی DTO تبدیل می‌شود تا @Transform ها
  // (مثل نرمال‌سازی ایمیل) به هندلر و سرویس برسند
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
