import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AddressesModule } from './addresses/addresses.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SettingsModule } from './settings/settings.module';
import { SiteStatusGuard } from './site-status/guards/site-status.guard';
import { SiteStatusModule } from './site-status/site-status.module';
import { SlidesModule } from './slides/slides.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate-limiting سراسری: حداکثر 100 درخواست در دقیقه به ازای هر IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    // کلید سراسری سایت باید پیش از سایر ماژول‌ها آماده باشد (اولین گارد)
    SiteStatusModule,
    AuthModule,
    AddressesModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    UploadsModule,
    SlidesModule,
    SettingsModule,
  ],
  providers: [
    // ترتیب اجرای گاردهای سراسری مهم است:
    // 1) SiteStatusGuard: کلید سراسری روشن/خاموش سایت — نخستین گارد روی هر
    //    درخواست؛ در حالت خاموش همه‌ی مسیرها (عادی، ادمین، آپلود) برای
    //    غیرمالک یکسان 503 می‌شوند و هیچ توکنی معتبر شمرده نمی‌شود
    // 2) ThrottlerGuard: محدودکردن نرخ درخواست پیش از هر پردازش دیگر
    // 3) JwtAuthGuard: همه‌ی مسیرها پیش‌فرض محافظت‌شده‌اند (secure-by-default)؛
    //    فقط مسیرهای علامت‌خورده با @Public() از احراز هویت عبور می‌کنند
    // 4) RolesGuard: اعتبارسنجی نقش برای مسیرهای @Roles(...)
    { provide: APP_GUARD, useClass: SiteStatusGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
