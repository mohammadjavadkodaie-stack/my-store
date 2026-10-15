import { Module } from '@nestjs/common';
import { AdminSlidesController } from './admin-slides.controller';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';

// PrismaModule با @Global() تعریف شده؛ پس بدون import اضافه در دسترس است.
@Module({
  controllers: [SlidesController, AdminSlidesController],
  providers: [SlidesService],
})
export class SlidesModule {}
